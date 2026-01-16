package plugin

import (
	"fmt"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
	"pansou/config"
	"pansou/model"
)

// ============================================================
// 第一部分：接口定义和类型
// ============================================================

// AsyncSearchPlugin 异步搜索插件接口
type AsyncSearchPlugin interface {
	// Name 返回插件名称
	Name() string
	
	// Priority 返回插件优先级
	Priority() int
	
	// AsyncSearch 异步搜索方法
	AsyncSearch(keyword string, searchFunc func(*http.Client, string, map[string]interface{}) ([]model.SearchResult, error), mainCacheKey string, ext map[string]interface{}) ([]model.SearchResult, error)
	
	// SetMainCacheKey 设置主缓存键
	SetMainCacheKey(key string)
	
	// SetCurrentKeyword 设置当前搜索关键词（用于日志显示）
	SetCurrentKeyword(keyword string)
	
	// Search 兼容性方法（内部调用AsyncSearch）
	Search(keyword string, ext map[string]interface{}) ([]model.SearchResult, error)
	
	// SkipServiceFilter 返回是否跳过Service层的关键词过滤
	// 对于磁力搜索等需要宽泛结果的插件，应返回true
	SkipServiceFilter() bool
}

// PluginWithWebHandler 支持Web路由的插件接口
// 插件可以选择实现此接口来注册自定义的HTTP路由
type PluginWithWebHandler interface {
	AsyncSearchPlugin // 继承搜索插件接口
	
	// RegisterWebRoutes 注册Web路由
	// router: gin的路由组，插件可以在此注册自己的路由
	RegisterWebRoutes(router *gin.RouterGroup)
}

// InitializablePlugin 支持延迟初始化的插件接口
// 插件可以实现此接口，将初始化逻辑延迟到真正被使用时执行
type InitializablePlugin interface {
	AsyncSearchPlugin // 继承搜索插件接口
	
	// Initialize 执行插件初始化（创建目录、加载数据等）
	// 只会被调用一次，应该是幂等的
	Initialize() error
}

// ============================================================
// 第二部分：全局变量和注册表
// ============================================================

// 全局异步插件注册表
var (
	globalRegistry     = make(map[string]AsyncSearchPlugin)
	globalRegistryLock sync.RWMutex
)

// 工作池和统计相关变量
var (
	// API响应缓存，键为关键词，值为缓存的响应（仅内存，不持久化）
	apiResponseCache = sync.Map{}
	
	// 工作池相关变量
	backgroundWorkerPool chan struct{}
	backgroundTasksCount int32 = 0
	
	// 统计数据 (仅用于内部监控)
	cacheHits         int64 = 0
	cacheMisses       int64 = 0
	asyncCompletions  int64 = 0
	
	// 初始化标志
	initialized       bool = false
	initLock          sync.Mutex
	
	// 默认配置值
	defaultAsyncResponseTimeout = 4 * time.Second
	defaultPluginTimeout = 30 * time.Second
	defaultCacheTTL = 1 * time.Hour  // 恢复但仅用于内存缓存
	defaultMaxBackgroundWorkers = 20
	defaultMaxBackgroundTasks = 100
	
	// 缓存访问频率记录
	cacheAccessCount = sync.Map{}
	
	// 缓存清理相关变量
	lastCleanupTime = time.Now()
	cleanupMutex    sync.Mutex
)

// 全局序列化器引用（由主程序设置）
var globalCacheSerializer interface {
	Serialize(interface{}) ([]byte, error)
	Deserialize([]byte, interface{}) error
}

// 缓存响应结构（仅内存，不持久化到磁盘）
type cachedResponse struct {
	Results   []model.SearchResult `json:"results"`
	Timestamp time.Time           `json:"timestamp"`
	Complete  bool                `json:"complete"`
	LastAccess time.Time          `json:"last_access"`
	AccessCount int               `json:"access_count"`
}

// ============================================================
// 第三部分：插件注册和管理
// ============================================================

// RegisterGlobalPlugin 注册异步插件到全局注册表
func RegisterGlobalPlugin(plugin AsyncSearchPlugin) {
	if plugin == nil {
		return
	}
	
	globalRegistryLock.Lock()
	defer globalRegistryLock.Unlock()
	
	name := plugin.Name()
	if name == "" {
		return
	}
	
	globalRegistry[name] = plugin
}

// GetRegisteredPlugins 获取所有已注册的异步插件
func GetRegisteredPlugins() []AsyncSearchPlugin {
	globalRegistryLock.RLock()
	defer globalRegistryLock.RUnlock()
	
	plugins := make([]AsyncSearchPlugin, 0, len(globalRegistry))
	for _, plugin := range globalRegistry {
		plugins = append(plugins, plugin)
	}
	
	return plugins
}

// GetPluginByName 根据名称获取已注册的插件
func GetPluginByName(name string) (AsyncSearchPlugin, bool) {
	globalRegistryLock.RLock()
	defer globalRegistryLock.RUnlock()
	
	plugin, exists := globalRegistry[name]
	return plugin, exists
}

// PluginManager 异步插件管理器
type PluginManager struct {
	plugins []AsyncSearchPlugin
}

// NewPluginManager 创建新的异步插件管理器
func NewPluginManager() *PluginManager {
	return &PluginManager{
		plugins: make([]AsyncSearchPlugin, 0),
	}
}

// RegisterPlugin 注册异步插件
func (pm *PluginManager) RegisterPlugin(plugin AsyncSearchPlugin) {
	// 如果插件支持延迟初始化，先执行初始化
	if initPlugin, ok := plugin.(InitializablePlugin); ok {
		if err := initPlugin.Initialize(); err != nil {
			fmt.Printf("[PluginManager] 插件 %s 初始化失败: %v，跳过注册\n", plugin.Name(), err)
			return
		}
	}
	
	pm.plugins = append(pm.plugins, plugin)
}

// RegisterAllGlobalPlugins 注册所有全局异步插件
func (pm *PluginManager) RegisterAllGlobalPlugins() {
	allPlugins := GetRegisteredPlugins()
	for _, plugin := range allPlugins {
		pm.RegisterPlugin(plugin)
	}
}

// RegisterGlobalPluginsWithFilter 根据过滤器注册全局异步插件
// enabledPlugins: nil表示未设置（不启用任何插件），空切片表示设置为空（不启用任何插件），具体列表表示启用指定插件
func (pm *PluginManager) RegisterGlobalPluginsWithFilter(enabledPlugins []string) {
	allPlugins := GetRegisteredPlugins()
	
	// nil 表示未设置环境变量，不启用任何插件
	if enabledPlugins == nil {
		return
	}
	
	// 空切片表示设置为空字符串，也不启用任何插件
	if len(enabledPlugins) == 0 {
		return
	}
	
	// 创建启用插件名称的映射表，用于快速查找
	enabledMap := make(map[string]bool)
	for _, name := range enabledPlugins {
		enabledMap[name] = true
	}
	
	// 只注册在启用列表中的插件
	for _, plugin := range allPlugins {
		if enabledMap[plugin.Name()] {
			pm.RegisterPlugin(plugin)
		}
	}
}

// GetPlugins 获取所有注册的异步插件
func (pm *PluginManager) GetPlugins() []AsyncSearchPlugin {
	return pm.plugins
}

// ============================================================
// 第四部分：工具函数
// ============================================================

// FilterResultsByKeyword 根据关键词过滤搜索结果的全局辅助函数
func FilterResultsByKeyword(results []model.SearchResult, keyword string) []model.SearchResult {
	if keyword == "" {
		return results
	}
	
	// 预估过滤后会保留80%的结果
	filteredResults := make([]model.SearchResult, 0, len(results)*8/10)

	// 将关键词转为小写，用于不区分大小写的比较
	lowerKeyword := strings.ToLower(keyword)

	// 将关键词按空格分割，用于支持多关键词搜索
	keywords := strings.Fields(lowerKeyword)

	for _, result := range results {
		// 将标题和内容转为小写
		lowerTitle := strings.ToLower(result.Title)
		lowerContent := strings.ToLower(result.Content)

		// 检查每个关键词是否在标题或内容中
		matched := true
		for _, kw := range keywords {
			// 对于所有关键词，检查是否在标题或内容中
			if !strings.Contains(lowerTitle, kw) && !strings.Contains(lowerContent, kw) {
				matched = false
				break
			}
		}

		if matched {
			filteredResults = append(filteredResults, result)
		}
	}

	return filteredResults
}

// ============================================================
// 第五部分：异步插件基础设施（初始化、工作池、缓存）
// ============================================================

// cleanupExpiredApiCache 清理过期API缓存的函数
func cleanupExpiredApiCache() {
	cleanupMutex.Lock()
	defer cleanupMutex.Unlock()
	
	now := time.Now()
	// 只有距离上次清理超过30分钟才执行
	if now.Sub(lastCleanupTime) < 30*time.Minute {
		return
	}
	
	cleanedCount := 0
	totalCount := 0
	deletedKeys := make([]string, 0)
	
	// 清理已过期的缓存（基于实际TTL + 合理的宽限期）
	apiResponseCache.Range(func(key, value interface{}) bool {
		totalCount++
		if cached, ok := value.(cachedResponse); ok {
			// 使用默认TTL + 30分钟宽限期，避免过于激进的清理
			expireThreshold := defaultCacheTTL + 30*time.Minute
			if now.Sub(cached.Timestamp) > expireThreshold {
				keyStr := key.(string)
				apiResponseCache.Delete(key)
				deletedKeys = append(deletedKeys, keyStr)
				cleanedCount++
			}
		}
		return true
	})
	
	// 清理访问计数缓存中对应的项
	for _, key := range deletedKeys {
		cacheAccessCount.Delete(key)
	}
	
	lastCleanupTime = now
	
	// 记录清理日志（仅在有清理时输出）
	if cleanedCount > 0 {
		fmt.Printf("[Cache] 清理过期缓存: 删除 %d/%d 项，释放内存\n", cleanedCount, totalCount)
	}
}

// initAsyncPlugin 初始化异步插件配置
func initAsyncPlugin() {
	initLock.Lock()
	defer initLock.Unlock()
	
	if initialized {
		return
	}
	
	// 如果配置已加载，则从配置读取工作池大小
	maxWorkers := defaultMaxBackgroundWorkers
	if config.AppConfig != nil {
		maxWorkers = config.AppConfig.AsyncMaxBackgroundWorkers
	}
	
	backgroundWorkerPool = make(chan struct{}, maxWorkers)
	
	// 异步插件本地缓存系统已移除，现在只依赖主缓存系统
	
	initialized = true
}

// InitAsyncPluginSystem 导出的初始化函数，用于确保异步插件系统初始化
func InitAsyncPluginSystem() {
	initAsyncPlugin()
}

// acquireWorkerSlot 尝试获取工作槽
func acquireWorkerSlot() bool {
	// 获取最大任务数
	maxTasks := int32(defaultMaxBackgroundTasks)
	if config.AppConfig != nil {
		maxTasks = int32(config.AppConfig.AsyncMaxBackgroundTasks)
	}
	
	// 检查总任务数
	if atomic.LoadInt32(&backgroundTasksCount) >= maxTasks {
		return false
	}
	
	// 尝试获取工作槽
	select {
	case backgroundWorkerPool <- struct{}{}:
		atomic.AddInt32(&backgroundTasksCount, 1)
		return true
	default:
		return false
	}
}

// releaseWorkerSlot 释放工作槽
func releaseWorkerSlot() {
	<-backgroundWorkerPool
	atomic.AddInt32(&backgroundTasksCount, -1)
}

// recordCacheHit 记录缓存命中 (内部使用)
func recordCacheHit() {
	atomic.AddInt64(&cacheHits, 1)
}

// recordCacheMiss 记录缓存未命中 (内部使用)
func recordCacheMiss() {
	atomic.AddInt64(&cacheMisses, 1)
}

// recordAsyncCompletion 记录异步完成 (内部使用)
func recordAsyncCompletion() {
	atomic.AddInt64(&asyncCompletions, 1)
}

// recordCacheAccess 记录缓存访问次数，用于智能缓存策略（仅内存）
func recordCacheAccess(key string) {
	// 更新缓存项的访问时间和计数
	if cached, ok := apiResponseCache.Load(key); ok {
		cachedItem := cached.(cachedResponse)
		cachedItem.LastAccess = time.Now()
		cachedItem.AccessCount++
		apiResponseCache.Store(key, cachedItem)
	}
	
	// 更新全局访问计数
	if count, ok := cacheAccessCount.Load(key); ok {
		cacheAccessCount.Store(key, count.(int) + 1)
	} else {
		cacheAccessCount.Store(key, 1)
	}
	
	// 触发定期清理（异步执行，不阻塞当前操作）
	go cleanupExpiredApiCache()
}

// ============================================================
// 第六部分：BaseAsyncPlugin 结构和构造函数
// ============================================================

// BaseAsyncPlugin 基础异步插件结构
type BaseAsyncPlugin struct {
	name               string
	priority           int
	client             *http.Client  // 用于短超时的客户端
	backgroundClient   *http.Client  // 用于长超时的客户端
	cacheTTL           time.Duration // 内存缓存有效期
	mainCacheUpdater   func(string, []model.SearchResult, time.Duration, bool, string) error // 主缓存更新函数（支持IsFinal参数，接收原始数据，最后参数为关键词）
	MainCacheKey       string        // 主缓存键，导出字段
	currentKeyword     string        // 当前搜索的关键词，用于日志显示
	finalUpdateTracker map[string]bool // 追踪已更新的最终结果缓存
	finalUpdateMutex   sync.RWMutex  // 保护finalUpdateTracker的并发访问
	skipServiceFilter  bool          // 是否跳过Service层的关键词过滤
}

// NewBaseAsyncPlugin 创建基础异步插件
func NewBaseAsyncPlugin(name string, priority int) *BaseAsyncPlugin {
	// 确保异步插件已初始化
	if !initialized {
		initAsyncPlugin()
	}
	
	// 确定超时和缓存时间
	responseTimeout := defaultAsyncResponseTimeout
	processingTimeout := defaultPluginTimeout
	cacheTTL := defaultCacheTTL
	
	// 如果配置已初始化，则使用配置中的值
	if config.AppConfig != nil {
		responseTimeout = config.AppConfig.AsyncResponseTimeoutDur
		processingTimeout = config.AppConfig.PluginTimeout
		cacheTTL = time.Duration(config.AppConfig.AsyncCacheTTLHours) * time.Hour
	}
	
	return &BaseAsyncPlugin{
		name:     name,
		priority: priority,
		client: &http.Client{
			Timeout: responseTimeout,
		},
		backgroundClient: &http.Client{
			Timeout: processingTimeout,
		},
		cacheTTL:           cacheTTL,
		finalUpdateTracker: make(map[string]bool), // 初始化缓存更新追踪器
		skipServiceFilter:  false,                  // 默认不跳过Service层过滤
	}
}

// NewBaseAsyncPluginWithFilter 创建基础异步插件（支持设置Service层过滤参数）
func NewBaseAsyncPluginWithFilter(name string, priority int, skipServiceFilter bool) *BaseAsyncPlugin {
	// 确保异步插件已初始化
	if !initialized {
		initAsyncPlugin()
	}
	
	// 确定超时和缓存时间
	responseTimeout := defaultAsyncResponseTimeout
	processingTimeout := defaultPluginTimeout
	cacheTTL := defaultCacheTTL
	
	// 如果配置已初始化，则使用配置中的值
	if config.AppConfig != nil {
		responseTimeout = config.AppConfig.AsyncResponseTimeoutDur
		processingTimeout = config.AppConfig.PluginTimeout
		cacheTTL = time.Duration(config.AppConfig.AsyncCacheTTLHours) * time.Hour
	}
	
	return &BaseAsyncPlugin{
		name:     name,
		priority: priority,
		client: &http.Client{
			Timeout: responseTimeout,
		},
		backgroundClient: &http.Client{
			Timeout: processingTimeout,
		},
		cacheTTL:           cacheTTL,
		finalUpdateTracker: make(map[string]bool), // 初始化缓存更新追踪器
		skipServiceFilter:  skipServiceFilter,     // 使用传入的过滤设置
	}
}

// ============================================================
// 第七部分：BaseAsyncPlugin 接口实现方法
// ============================================================

// SetMainCacheKey 设置主缓存键
func (p *BaseAsyncPlugin) SetMainCacheKey(key string) {
	p.MainCacheKey = key
}

// SetCurrentKeyword 设置当前搜索关键词（用于日志显示）
func (p *BaseAsyncPlugin) SetCurrentKeyword(keyword string) {
	p.currentKeyword = keyword
}

// SetMainCacheUpdater 设置主缓存更新函数（修复后的签名，增加关键词参数）
func (p *BaseAsyncPlugin) SetMainCacheUpdater(updater func(string, []model.SearchResult, time.Duration, bool, string) error) {
	p.mainCacheUpdater = updater
}

// Name 返回插件名称
func (p *BaseAsyncPlugin) Name() string {
	return p.name
}

// Priority 返回插件优先级
func (p *BaseAsyncPlugin) Priority() int {
	return p.priority
}

// SkipServiceFilter 返回是否跳过Service层的关键词过滤
func (p *BaseAsyncPlugin) SkipServiceFilter() bool {
	return p.skipServiceFilter
}

// GetClient 返回短超时客户端
func (p *BaseAsyncPlugin) GetClient() *http.Client {
	return p.client
}

// ============================================================
// 第八部分：异步搜索核心逻辑
// ============================================================

// AsyncSearch 异步搜索基础方法
func (p *BaseAsyncPlugin) AsyncSearch(
	keyword string,
	searchFunc func(*http.Client, string, map[string]interface{}) ([]model.SearchResult, error),
	mainCacheKey string,
	ext map[string]interface{},
) ([]model.SearchResult, error) {
	// 确保ext不为nil
	if ext == nil {
		ext = make(map[string]interface{})
	}
	
	now := time.Now()
	
	// 修改缓存键，确保包含插件名称
	pluginSpecificCacheKey := fmt.Sprintf("%s:%s", p.name, keyword)
	
	// 检查缓存
	if cachedItems, ok := apiResponseCache.Load(pluginSpecificCacheKey); ok {
		cachedResult := cachedItems.(cachedResponse)
		
		// 缓存完全有效（未过期且完整）
		if time.Since(cachedResult.Timestamp) < p.cacheTTL && cachedResult.Complete {
			recordCacheHit()
			recordCacheAccess(pluginSpecificCacheKey)
			
			// 如果缓存接近过期（已用时间超过TTL的80%），在后台刷新缓存
			if time.Since(cachedResult.Timestamp) > (p.cacheTTL * 4 / 5) {
				go p.refreshCacheInBackground(keyword, pluginSpecificCacheKey, searchFunc, cachedResult, mainCacheKey, ext)
			}
			
			return cachedResult.Results, nil
		}
		
		// 缓存已过期但有结果，启动后台刷新，同时返回旧结果
		if len(cachedResult.Results) > 0 {
			recordCacheHit()
			recordCacheAccess(pluginSpecificCacheKey)
			
			// 标记为部分过期
			if time.Since(cachedResult.Timestamp) >= p.cacheTTL {
				// 在后台刷新缓存
				go p.refreshCacheInBackground(keyword, pluginSpecificCacheKey, searchFunc, cachedResult, mainCacheKey, ext)
				
				// 日志记录
				fmt.Printf("[%s] 缓存已过期，后台刷新中: %s (已过期: %v)\n", 
					p.name, pluginSpecificCacheKey, time.Since(cachedResult.Timestamp))
			}
			
			return cachedResult.Results, nil
		}
	}
	
	recordCacheMiss()
	
	// 创建通道
	resultChan := make(chan []model.SearchResult, 1)
	errorChan := make(chan error, 1)
	doneChan := make(chan struct{})
	
	// 启动后台处理
	go func() {
		// 尝试获取工作槽
		if !acquireWorkerSlot() {
			// 工作池已满，使用快速响应客户端直接处理
			results, err := searchFunc(p.client, keyword, ext)
			if err != nil {
				select {
				case errorChan <- err:
				default:
				}
				return
			}
			
			select {
			case resultChan <- results:
			default:
			}
			
			// 缓存结果
			apiResponseCache.Store(pluginSpecificCacheKey, cachedResponse{
				Results:     results,
				Timestamp:   now,
				Complete:    true,
				LastAccess:  now,
				AccessCount: 1,
			})
			
			// 🔧 工作池满时短超时(默认4秒)内完成，这是完整结果
			p.updateMainCacheWithFinal(mainCacheKey, results, true)
			
			return
		}
		defer releaseWorkerSlot()
		
		// 执行搜索
		results, err := searchFunc(p.backgroundClient, keyword, ext)
		
		// 检查是否已经响应
		select {
		case <-doneChan:
			// 已经响应，只更新缓存
			if err == nil {
				// 检查是否存在旧缓存
				var accessCount int = 1
				var lastAccess time.Time = now
				
				if oldCache, ok := apiResponseCache.Load(pluginSpecificCacheKey); ok {
					oldCachedResult := oldCache.(cachedResponse)
					accessCount = oldCachedResult.AccessCount
					lastAccess = oldCachedResult.LastAccess
					
					// 合并结果（新结果优先）
					if len(oldCachedResult.Results) > 0 {
						// 创建合并结果集
						mergedResults := make([]model.SearchResult, 0, len(results) + len(oldCachedResult.Results))
						
						// 创建已有结果ID的映射
						existingIDs := make(map[string]bool)
						for _, r := range results {
							existingIDs[r.UniqueID] = true
							mergedResults = append(mergedResults, r)
						}
						
						// 添加旧结果中不存在的项
						for _, r := range oldCachedResult.Results {
							if !existingIDs[r.UniqueID] {
								mergedResults = append(mergedResults, r)
							}
						}
						
						// 使用合并结果
						results = mergedResults
					}
				}
				
				apiResponseCache.Store(pluginSpecificCacheKey, cachedResponse{
					Results:     results,
					Timestamp:   now,
					Complete:    true,
					LastAccess:  lastAccess,
					AccessCount: accessCount,
				})
				recordAsyncCompletion()
				
				// 异步插件后台完成时更新主缓存（标记为最终结果）
				p.updateMainCacheWithFinal(mainCacheKey, results, true)
				
				// 异步插件本地缓存系统已移除
			}
		default:
			// 尚未响应，发送结果
			if err != nil {
				select {
				case errorChan <- err:
				default:
				}
			} else {
				// 检查是否存在旧缓存用于合并
				if oldCache, ok := apiResponseCache.Load(pluginSpecificCacheKey); ok {
					oldCachedResult := oldCache.(cachedResponse)
					if len(oldCachedResult.Results) > 0 {
						// 创建合并结果集
						mergedResults := make([]model.SearchResult, 0, len(results) + len(oldCachedResult.Results))
						
						// 创建已有结果ID的映射
						existingIDs := make(map[string]bool)
						for _, r := range results {
							existingIDs[r.UniqueID] = true
							mergedResults = append(mergedResults, r)
						}
						
						// 添加旧结果中不存在的项
						for _, r := range oldCachedResult.Results {
							if !existingIDs[r.UniqueID] {
								mergedResults = append(mergedResults, r)
							}
						}
						
						// 使用合并结果
						results = mergedResults
					}
				}
				
				select {
				case resultChan <- results:
				default:
				}
				
				// 更新缓存
				apiResponseCache.Store(pluginSpecificCacheKey, cachedResponse{
					Results:     results,
					Timestamp:   now,
					Complete:    true,
					LastAccess:  now,
					AccessCount: 1,
				})
				
				// 🔧 短超时(默认4秒)内正常完成，这是完整的最终结果
				p.updateMainCacheWithFinal(mainCacheKey, results, true)
				
				// 异步插件本地缓存系统已移除
			}
		}
	}()
	
	// 获取响应超时时间
	responseTimeout := defaultAsyncResponseTimeout
	if config.AppConfig != nil {
		responseTimeout = config.AppConfig.AsyncResponseTimeoutDur
	}
	
	// 等待响应超时或结果
	select {
	case results := <-resultChan:
		close(doneChan)
		return results, nil
	case err := <-errorChan:
		close(doneChan)
		return nil, err
	case <-time.After(responseTimeout):
		// 插件响应超时，后台继续处理（优化完成，日志简化）
		
		// 响应超时，返回空结果，后台继续处理
		go func() {
			defer close(doneChan)
		}()
		
		// 检查是否有部分缓存可用
		if cachedItems, ok := apiResponseCache.Load(pluginSpecificCacheKey); ok {
			cachedResult := cachedItems.(cachedResponse)
			if len(cachedResult.Results) > 0 {
				// 有部分缓存可用，记录访问并返回
				recordCacheAccess(pluginSpecificCacheKey)
				fmt.Printf("[%s] 响应超时，返回部分缓存: %s (项目数: %d)\n", 
					p.name, pluginSpecificCacheKey, len(cachedResult.Results))
				return cachedResult.Results, nil
			}
		}
		
		// 创建空的临时缓存，以便后台处理完成后可以更新
		apiResponseCache.Store(pluginSpecificCacheKey, cachedResponse{
			Results:     []model.SearchResult{},
			Timestamp:   now,
			Complete:    false, // 标记为不完整
			LastAccess:  now,
			AccessCount: 1,
		})
		
		// 🔧 修复：4秒超时时也要更新主缓存，标记为部分结果（空结果）
		p.updateMainCacheWithFinal(mainCacheKey, []model.SearchResult{}, false)
		
		// fmt.Printf("[%s] 响应超时，后台继续处理: %s\n", p.name, pluginSpecificCacheKey)
		return []model.SearchResult{}, nil
	}
}

// AsyncSearchWithResult 异步搜索方法，返回PluginSearchResult
func (p *BaseAsyncPlugin) AsyncSearchWithResult(
	keyword string,
	searchFunc func(*http.Client, string, map[string]interface{}) ([]model.SearchResult, error),
	mainCacheKey string,
	ext map[string]interface{},
) (model.PluginSearchResult, error) {
	// 确保ext不为nil
	if ext == nil {
		ext = make(map[string]interface{})
	}
	
	now := time.Now()
	
	// 修改缓存键，确保包含插件名称
	pluginSpecificCacheKey := fmt.Sprintf("%s:%s", p.name, keyword)
	
	// 检查缓存
	if cachedItems, ok := apiResponseCache.Load(pluginSpecificCacheKey); ok {
		cachedResult := cachedItems.(cachedResponse)
		
		// 缓存完全有效（未过期且完整）
		if time.Since(cachedResult.Timestamp) < p.cacheTTL && cachedResult.Complete {
			recordCacheHit()
			recordCacheAccess(pluginSpecificCacheKey)
			
			// 如果缓存接近过期（已用时间超过TTL的80%），在后台刷新缓存
			if time.Since(cachedResult.Timestamp) > (p.cacheTTL * 4 / 5) {
				go p.refreshCacheInBackground(keyword, pluginSpecificCacheKey, searchFunc, cachedResult, mainCacheKey, ext)
			}
			
			return model.PluginSearchResult{
				Results:   cachedResult.Results,
				IsFinal:   cachedResult.Complete,
				Timestamp: cachedResult.Timestamp,
				Source:    p.name,
				Message:   "从缓存获取",
			}, nil
		}
		
		// 缓存已过期但有结果，启动后台刷新，同时返回旧结果
		if len(cachedResult.Results) > 0 {
			recordCacheHit()
			recordCacheAccess(pluginSpecificCacheKey)
			
			// 标记为部分过期
			if time.Since(cachedResult.Timestamp) >= p.cacheTTL {
				// 在后台刷新缓存
				go p.refreshCacheInBackground(keyword, pluginSpecificCacheKey, searchFunc, cachedResult, mainCacheKey, ext)
			}
			
			return model.PluginSearchResult{
				Results:   cachedResult.Results,
				IsFinal:   false, // 🔥 过期数据标记为非最终结果
				Timestamp: cachedResult.Timestamp,
				Source:    p.name,
				Message:   "缓存已过期，后台刷新中",
			}, nil
		}
	}
	
	recordCacheMiss()
	
	// 创建通道
	resultChan := make(chan []model.SearchResult, 1)
	errorChan := make(chan error, 1)
	doneChan := make(chan struct{})
	
	// 启动后台处理
	go func() {
		defer func() {
			select {
			case <-doneChan:
			default:
				close(doneChan)
			}
		}()
		
		// 尝试获取工作槽
		if !acquireWorkerSlot() {
			// 工作池已满，使用快速响应客户端直接处理
			results, err := searchFunc(p.client, keyword, ext)
			if err != nil {
				select {
				case errorChan <- err:
				default:
				}
				return
			}
			
			select {
			case resultChan <- results:
			default:
			}
			return
		}
		defer releaseWorkerSlot()
		
		// 使用长超时客户端进行搜索
		results, err := searchFunc(p.backgroundClient, keyword, ext)
		if err != nil {
			select {
			case errorChan <- err:
			default:
			}
		} else {
			select {
			case resultChan <- results:
			default:
			}
		}
	}()
	
	// 等待结果或超时
	responseTimeout := defaultAsyncResponseTimeout
	if config.AppConfig != nil {
		responseTimeout = config.AppConfig.AsyncResponseTimeoutDur
	}
	
	select {
	case results := <-resultChan:
		// 不直接关闭，让defer处理
		
		// 缓存结果
		apiResponseCache.Store(pluginSpecificCacheKey, cachedResponse{
			Results:     results,
			Timestamp:   now,
			Complete:    true, // 🔥 及时完成，标记为完整结果
			LastAccess:  now,
			AccessCount: 1,
		})
		
		// 🔧 恢复主缓存更新：使用统一的GOB序列化
		// 传递原始数据，由主程序负责序列化
		if mainCacheKey != "" && p.mainCacheUpdater != nil {
			err := p.mainCacheUpdater(mainCacheKey, results, p.cacheTTL, true, p.currentKeyword)
			if err != nil {
				fmt.Printf("❌ [%s] 及时完成缓存更新失败: %s | 错误: %v\n", p.name, mainCacheKey, err)
			}
		}
		
		return model.PluginSearchResult{
			Results:   results,
			IsFinal:   true, // 🔥 及时完成，最终结果
			Timestamp: now,
			Source:    p.name,
			Message:   "搜索完成",
		}, nil
		
	case err := <-errorChan:
		// 不直接关闭，让defer处理
		return model.PluginSearchResult{}, err
		
	case <-time.After(responseTimeout):
		// 🔥 超时处理：返回空结果，后台继续处理
		go p.completeSearchInBackground(keyword, searchFunc, pluginSpecificCacheKey, mainCacheKey, doneChan, ext)
		
		// 存储临时缓存（标记为不完整）
		apiResponseCache.Store(pluginSpecificCacheKey, cachedResponse{
			Results:     []model.SearchResult{},
			Timestamp:   now,
			Complete:    false, // 🔥 标记为不完整
			LastAccess:  now,
			AccessCount: 1,
		})
		
		return model.PluginSearchResult{
			Results:   []model.SearchResult{},
			IsFinal:   false, // 🔥 超时返回，非最终结果
			Timestamp: now,
			Source:    p.name,
			Message:   "处理中，后台继续...",
		}, nil
	}
}

// completeSearchInBackground 后台完成搜索
func (p *BaseAsyncPlugin) completeSearchInBackground(
	keyword string,
	searchFunc func(*http.Client, string, map[string]interface{}) ([]model.SearchResult, error),
	pluginCacheKey string,
	mainCacheKey string,
	doneChan chan struct{},
	ext map[string]interface{},
) {
	defer func() {
		select {
		case <-doneChan:
		default:
			close(doneChan)
		}
	}()
	
	// 执行完整搜索
	results, err := searchFunc(p.backgroundClient, keyword, ext)
	if err != nil {
		return
	}
	
	// 更新插件缓存
	now := time.Now()
	apiResponseCache.Store(pluginCacheKey, cachedResponse{
		Results:     results,
		Timestamp:   now,
		Complete:    true, // 🔥 标记为完整结果
		LastAccess:  now,
		AccessCount: 1,
	})
	
	// 🔧 恢复主缓存更新：使用统一的GOB序列化
	// 传递原始数据，由主程序负责序列化
	if mainCacheKey != "" && p.mainCacheUpdater != nil {
		err := p.mainCacheUpdater(mainCacheKey, results, p.cacheTTL, true, p.currentKeyword)
		if err != nil {
			fmt.Printf("❌ [%s] 后台完成缓存更新失败: %s | 错误: %v\n", p.name, mainCacheKey, err)
		}
	}
}

// refreshCacheInBackground 在后台刷新缓存
func (p *BaseAsyncPlugin) refreshCacheInBackground(
	keyword string,
	cacheKey string,
	searchFunc func(*http.Client, string, map[string]interface{}) ([]model.SearchResult, error),
	oldCache cachedResponse,
	originalCacheKey string,
	ext map[string]interface{},
) {
	// 确保ext不为nil
	if ext == nil {
		ext = make(map[string]interface{})
	}
	
	// 注意：这里的cacheKey已经是插件特定的了，因为是从AsyncSearch传入的
	
	// 检查是否有足够的工作槽
	if !acquireWorkerSlot() {
		return
	}
	defer releaseWorkerSlot()
	
	// 记录刷新开始时间
	refreshStart := time.Now()
	
	// 执行搜索
	results, err := searchFunc(p.backgroundClient, keyword, ext)
	if err != nil || len(results) == 0 {
		return
	}
	
	// 创建合并结果集
	mergedResults := make([]model.SearchResult, 0, len(results) + len(oldCache.Results))
	
	// 创建已有结果ID的映射
	existingIDs := make(map[string]bool)
	for _, r := range results {
		existingIDs[r.UniqueID] = true
		mergedResults = append(mergedResults, r)
	}
	
	// 添加旧结果中不存在的项
	for _, r := range oldCache.Results {
		if !existingIDs[r.UniqueID] {
			mergedResults = append(mergedResults, r)
		}
	}
	
	// 更新缓存
	apiResponseCache.Store(cacheKey, cachedResponse{
		Results:     mergedResults,
		Timestamp:   time.Now(),
		Complete:    true,
		LastAccess:  oldCache.LastAccess,
		AccessCount: oldCache.AccessCount,
	})
	
	// 🔥 异步插件后台刷新完成时更新主缓存（标记为最终结果）
	p.updateMainCacheWithFinal(originalCacheKey, mergedResults, true)
	
	// 记录刷新时间
	refreshTime := time.Since(refreshStart)
	fmt.Printf("[%s] 后台刷新完成: %s (耗时: %v, 新项目: %d, 合并项目: %d)\n", 
		p.name, cacheKey, refreshTime, len(results), len(mergedResults))
	
	// 异步插件本地缓存系统已移除
} 

// ============================================================
// 第九部分：缓存管理
// ============================================================

// updateMainCache 更新主缓存系统（兼容性方法，默认IsFinal=true）
func (p *BaseAsyncPlugin) updateMainCache(cacheKey string, results []model.SearchResult) {
	p.updateMainCacheWithFinal(cacheKey, results, true)
}

// updateMainCacheWithFinal 更新主缓存系统，支持IsFinal参数
func (p *BaseAsyncPlugin) updateMainCacheWithFinal(cacheKey string, results []model.SearchResult, isFinal bool) {
	// 如果主缓存更新函数为空或缓存键为空，直接返回
	if p.mainCacheUpdater == nil || cacheKey == "" {
		return
	}
	
	// 🚀 优化：如果新结果为空，跳过缓存更新（避免无效操作）
	if len(results) == 0 {
		return
	}
	
	// 🔥 增强防重复更新机制 - 使用数据哈希确保真正的去重
	// 生成结果数据的简单哈希标识
	dataHash := fmt.Sprintf("%d_%d", len(results), results[0].UniqueID)
	if len(results) > 1 {
		dataHash += fmt.Sprintf("_%d", results[len(results)-1].UniqueID)
	}
	updateKey := fmt.Sprintf("final_%s_%s_%s_%t", p.name, cacheKey, dataHash, isFinal)
	
	// 检查是否已经处理过相同的数据
	if p.hasUpdatedFinalCache(updateKey) {
		return
	}
	
	// 标记已更新
	p.markFinalCacheUpdated(updateKey)
	
	// 🔧 恢复异步插件缓存更新，使用修复后的统一序列化
	// 传递原始数据，由主程序负责GOB序列化
	if p.mainCacheUpdater != nil {
		err := p.mainCacheUpdater(cacheKey, results, p.cacheTTL, isFinal, p.currentKeyword)
		if err != nil {
			fmt.Printf("❌ [%s] 主缓存更新失败: %s | 错误: %v\n", p.name, cacheKey, err)
		}
	}
} 

// hasUpdatedFinalCache 检查是否已经更新过指定的最终结果缓存
func (p *BaseAsyncPlugin) hasUpdatedFinalCache(updateKey string) bool {
	p.finalUpdateMutex.RLock()
	defer p.finalUpdateMutex.RUnlock()
	return p.finalUpdateTracker[updateKey]
}

// markFinalCacheUpdated 标记已更新指定的最终结果缓存
func (p *BaseAsyncPlugin) markFinalCacheUpdated(updateKey string) {
	p.finalUpdateMutex.Lock()
	defer p.finalUpdateMutex.Unlock()
	p.finalUpdateTracker[updateKey] = true
}

// ============================================================
// 第十部分：序列化器
// ============================================================

// SetGlobalCacheSerializer 设置全局缓存序列化器（由主程序调用）
func SetGlobalCacheSerializer(serializer interface {
	Serialize(interface{}) ([]byte, error)
	Deserialize([]byte, interface{}) error
}) {
	globalCacheSerializer = serializer
}

// getEnhancedCacheSerializer 获取增强缓存的序列化器
func getEnhancedCacheSerializer() interface {
	Serialize(interface{}) ([]byte, error)
	Deserialize([]byte, interface{}) error
} {
	return globalCacheSerializer
}
