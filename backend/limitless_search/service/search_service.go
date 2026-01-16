package service

import (
	"context"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"pansou/config"
	"pansou/model"
	"pansou/plugin"
	"pansou/util"
	"pansou/util/cache"
	"pansou/util/pool"
)

// normalizeUrl 标准化URL，将URL编码的中文部分解码为中文，用于去重
func normalizeUrl(rawUrl string) string {
	// 解码URL中的编码字符
	decoded, err := url.QueryUnescape(rawUrl)
	if err != nil {
		// 如果解码失败，返回原始URL
		return rawUrl
	}
	return decoded
}

// 全局缓存写入管理器引用（避免循环依赖）
var globalCacheWriteManager *cache.DelayedBatchWriteManager

// SetGlobalCacheWriteManager 设置全局缓存写入管理器
func SetGlobalCacheWriteManager(manager *cache.DelayedBatchWriteManager) {
	globalCacheWriteManager = manager
}

// GetGlobalCacheWriteManager 获取全局缓存写入管理器
func GetGlobalCacheWriteManager() *cache.DelayedBatchWriteManager {
	return globalCacheWriteManager
}

// GetEnhancedTwoLevelCache 获取增强版两级缓存实例
func GetEnhancedTwoLevelCache() *cache.EnhancedTwoLevelCache {
	return enhancedTwoLevelCache
}

// 优先关键词列表
var priorityKeywords = []string{"合集", "系列", "全", "完", "最新", "附", "complete"}

// extractKeywordFromCacheKey 从缓存键中提取关键词（简化版）
func extractKeywordFromCacheKey(cacheKey string) string {
	// 这是一个简化的实现，实际中我们会通过传递来获得关键词
	// 为了演示，这里返回简化的显示
	return "搜索关键词"
}

// logAsyncCacheWithKeyword 异步缓存日志输出辅助函数（带关键词）
func logAsyncCacheWithKeyword(keyword, cacheKey string, format string, args ...interface{}) {
	// 检查配置开关
	if config.AppConfig == nil || !config.AppConfig.AsyncLogEnabled {
		return
	}
	
	// 构建显示的关键词信息
	displayKeyword := keyword
	if displayKeyword == "" {
		displayKeyword = "未知"
	}
	
	// 将缓存键替换为简化版本+关键词
	shortKey := cacheKey
	if len(cacheKey) > 8 {
		shortKey = cacheKey[:8] + "..."
	}
	
	// 替换格式字符串中的缓存键
	enhancedFormat := strings.Replace(format, cacheKey, fmt.Sprintf("%s(关键词:%s)", shortKey, displayKeyword), 1)
	fmt.Printf(enhancedFormat, args...)
}

// 全局缓存实例和缓存是否初始化标志
var (
	enhancedTwoLevelCache *cache.EnhancedTwoLevelCache
	cacheInitialized bool
)

// 初始化缓存
func init() {
	if config.AppConfig != nil && config.AppConfig.CacheEnabled {
		var err error
		// 使用增强版缓存
		enhancedTwoLevelCache, err = cache.NewEnhancedTwoLevelCache()
		if err == nil {
			cacheInitialized = true
		}
	}
}

// mergeSearchResults 智能合并搜索结果，去重并保留最完整的信息
func mergeSearchResults(existing []model.SearchResult, newResults []model.SearchResult) []model.SearchResult {
	// 使用map进行去重和合并，以UniqueID作为唯一标识
	resultMap := make(map[string]model.SearchResult)
	
	// 先添加现有结果
	for _, result := range existing {
		key := generateResultKey(result)
		resultMap[key] = result
	}
	
	// 合并新结果，如果UniqueID相同则选择信息更完整的
	for _, newResult := range newResults {
		key := generateResultKey(newResult)
		if existingResult, exists := resultMap[key]; exists {
			// 选择信息更完整的结果
			resultMap[key] = selectBetterResult(existingResult, newResult)
		} else {
			// 新结果，直接添加
			resultMap[key] = newResult
		}
	}
	
	// 转换回切片
	merged := make([]model.SearchResult, 0, len(resultMap))
	for _, result := range resultMap {
		merged = append(merged, result)
	}
	
	// 按时间排序（最新的在前）
	sort.Slice(merged, func(i, j int) bool {
		return merged[i].Datetime.After(merged[j].Datetime)
	})
	
	return merged
}

// generateResultKey 生成结果的唯一标识键
func generateResultKey(result model.SearchResult) string {
	// 使用UniqueID作为主要标识，如果没有则使用MessageID，最后使用标题
	if result.UniqueID != "" {
		return result.UniqueID
	}
	if result.MessageID != "" {
		return result.MessageID
	}
	return fmt.Sprintf("title_%s_%s", result.Title, result.Channel)
}

// selectBetterResult 选择信息更完整的结果
func selectBetterResult(existing, new model.SearchResult) model.SearchResult {
	// 计算信息完整度得分
	existingScore := calculateCompletenessScore(existing)
	newScore := calculateCompletenessScore(new)
	
	if newScore > existingScore {
		return new
	}
	return existing
}

// calculateCompletenessScore 计算结果信息的完整度得分
func calculateCompletenessScore(result model.SearchResult) int {
	score := 0
	
	// 有UniqueID加分
	if result.UniqueID != "" {
		score += 10
	}
	
	// 有链接信息加分
	if len(result.Links) > 0 {
		score += 5
		// 每个链接额外加分
		score += len(result.Links)
	}
	
	// 有内容加分
	if result.Content != "" {
		score += 3
	}
	
	// 标题长度加分（更详细的标题）
	score += len(result.Title) / 10
	
	// 有频道信息加分
	if result.Channel != "" {
		score += 2
	}
	
	// 有标签加分
	score += len(result.Tags)
	
	return score
}

// SearchService 搜索服务
type SearchService struct {
	pluginManager *plugin.PluginManager
}

// NewSearchService 创建搜索服务实例并确保缓存可用
func NewSearchService(pluginManager *plugin.PluginManager) *SearchService {
	// 检查缓存是否已初始化，如果未初始化则尝试重新初始化
	if !cacheInitialized && config.AppConfig != nil && config.AppConfig.CacheEnabled {
		var err error
		// 使用增强版缓存
		enhancedTwoLevelCache, err = cache.NewEnhancedTwoLevelCache()
		if err == nil {
			cacheInitialized = true
		}
	}
	
	// 将主缓存注入到异步插件中
	injectMainCacheToAsyncPlugins(pluginManager, enhancedTwoLevelCache)
	
	// 确保缓存写入管理器设置了主缓存更新函数
	if globalCacheWriteManager != nil && enhancedTwoLevelCache != nil {
		globalCacheWriteManager.SetMainCacheUpdater(func(key string, data []byte, ttl time.Duration) error {
			return enhancedTwoLevelCache.SetBothLevels(key, data, ttl)
		})
	}

	return &SearchService{
		pluginManager: pluginManager,
	}
}

// injectMainCacheToAsyncPlugins 将主缓存系统注入到异步插件中
func injectMainCacheToAsyncPlugins(pluginManager *plugin.PluginManager, mainCache *cache.EnhancedTwoLevelCache) {
	// 如果缓存或插件管理器不可用，直接返回
	if mainCache == nil || pluginManager == nil {
		return
	}
	
	// 设置全局序列化器，确保异步插件与主程序使用相同的序列化格式
	serializer := mainCache.GetSerializer()
	if serializer != nil {
		plugin.SetGlobalCacheSerializer(serializer)
	}
	
	// 创建缓存更新函数（支持IsFinal参数）- 接收原始数据并与现有缓存合并
	cacheUpdater := func(key string, newResults []model.SearchResult, ttl time.Duration, isFinal bool, keyword string, pluginName string) error {
		// 优化：如果新结果为空，跳过缓存更新（避免无效操作）
		if len(newResults) == 0 {
			return nil
		}
		
		// 获取现有缓存数据进行合并
		var finalResults []model.SearchResult
		if existingData, hit, err := mainCache.Get(key); err == nil && hit {
			var existingResults []model.SearchResult
			if err := mainCache.GetSerializer().Deserialize(existingData, &existingResults); err == nil {
				// 合并新旧结果，去重保留最完整的数据
				finalResults = mergeSearchResults(existingResults, newResults)
				if config.AppConfig != nil && config.AppConfig.AsyncLogEnabled {
					if keyword != "" {
						fmt.Printf("🔄 [%s:%s] 更新缓存| 原有: %d + 新增: %d = 合并后: %d\n", 
						pluginName, keyword, len(existingResults), len(newResults), len(finalResults))
					}
				}
			} else {
				// 反序列化失败，使用新结果
				finalResults = newResults
							if config.AppConfig != nil && config.AppConfig.AsyncLogEnabled {
				displayKey := key[:8] + "..."
				if keyword != "" {
					fmt.Printf("[异步插件 %s] 缓存反序列化失败，使用新结果: %s(关键词:%s) | 结果数: %d\n", pluginName, displayKey, keyword, len(newResults))
				} else {
					fmt.Printf("[异步插件 %s] 缓存反序列化失败，使用新结果: %s | 结果数: %d\n", pluginName, key, len(newResults))
				}
			}
			}
		} else {
			// 无现有缓存，直接使用新结果
			finalResults = newResults
					if config.AppConfig != nil && config.AppConfig.AsyncLogEnabled {
			displayKey := key[:8] + "..."
			if keyword != "" {
				fmt.Printf("[异步插件 %s] 初始缓存创建: %s(关键词:%s) | 结果数: %d\n", pluginName, displayKey, keyword, len(newResults))
			} else {
				fmt.Printf("[异步插件 %s] 初始缓存创建: %s | 结果数: %d\n", pluginName, key, len(newResults))
			}
		}
		}
		
		// 序列化合并后的结果
		data, err := mainCache.GetSerializer().Serialize(finalResults)
		if err != nil {
			fmt.Printf("[缓存更新] 序列化失败: %s | 错误: %v\n", key, err)
			return err
		}
		
		// 先更新内存缓存（立即可见）
		if err := mainCache.SetMemoryOnly(key, data, ttl); err != nil {
			return fmt.Errorf("内存缓存更新失败: %v", err)
		}
		
		// 使用新的缓存写入管理器处理磁盘写入（智能批处理）
		if cacheWriteManager := globalCacheWriteManager; cacheWriteManager != nil {
			operation := &cache.CacheOperation{
				Key:          key,
				Data:         finalResults,      // 使用原始数据而不是序列化后的
				TTL:          ttl,
				IsFinal:      isFinal,
				PluginName:   pluginName,
				Keyword:      keyword,
				Priority:     2,                 // 中等优先级
				Timestamp:    time.Now(),
				DataSize:     len(data),         // 序列化后的数据大小
			}
			
			// 根据是否为最终结果设置优先级
			if isFinal {
				operation.Priority = 1           // 高优先级
			}
			
			return cacheWriteManager.HandleCacheOperation(operation)
		}
		
		// 兜底：如果缓存写入管理器不可用，使用原有逻辑
		if isFinal {
			return mainCache.SetBothLevels(key, data, ttl)
		} else {
			return nil // 内存已更新，磁盘稍后批处理
		}
	}
	
	// 获取所有插件
	plugins := pluginManager.GetPlugins()
	
	// 遍历所有插件，找出异步插件
	for _, p := range plugins {
		// 检查插件是否实现了SetMainCacheUpdater方法（修复后的签名，增加关键词参数）
		if asyncPlugin, ok := p.(interface{ SetMainCacheUpdater(func(string, []model.SearchResult, time.Duration, bool, string) error) }); ok {
			// 为每个插件创建专门的缓存更新函数，绑定插件名称
			pluginName := p.Name()
			pluginCacheUpdater := func(key string, newResults []model.SearchResult, ttl time.Duration, isFinal bool, keyword string) error {
				return cacheUpdater(key, newResults, ttl, isFinal, keyword, pluginName)
			}
			// 注入缓存更新函数
			asyncPlugin.SetMainCacheUpdater(pluginCacheUpdater)
		}
	}
}

// Search 执行搜索
func (s *SearchService) Search(keyword string, channels []string, concurrency int, forceRefresh bool, resultType string, sourceType string, plugins []string, cloudTypes []string, ext map[string]interface{}) (model.SearchResponse, error) {
	// 确保ext不为nil
	if ext == nil {
		ext = make(map[string]interface{})
	}
	
	// 参数预处理
	// 源类型标准化
	if sourceType == "" {
		sourceType = "all"
	}

	// 插件参数规范化处理
	if sourceType == "tg" {
		// 对于只搜索Telegram的请求，忽略插件参数
		plugins = nil
	} else if sourceType == "all" || sourceType == "plugin" {
		// 检查是否为空列表或只包含空字符串
		if plugins == nil || len(plugins) == 0 {
			plugins = nil
		} else {
			// 检查是否有非空元素
			hasNonEmpty := false
			for _, p := range plugins {
				if p != "" {
					hasNonEmpty = true
					break
				}
			}

			// 如果全是空字符串，视为未指定
			if !hasNonEmpty {
				plugins = nil
			} else {
				// 检查是否包含所有插件
				allPlugins := s.pluginManager.GetPlugins()
				allPluginNames := make([]string, 0, len(allPlugins))
				for _, p := range allPlugins {
					allPluginNames = append(allPluginNames, strings.ToLower(p.Name()))
				}

				// 创建请求的插件名称集合（忽略空字符串）
				requestedPlugins := make([]string, 0, len(plugins))
				for _, p := range plugins {
					if p != "" {
						requestedPlugins = append(requestedPlugins, strings.ToLower(p))
					}
				}

				// 如果请求的插件数量与所有插件数量相同，检查是否包含所有插件
				if len(requestedPlugins) == len(allPluginNames) {
					// 创建映射以便快速查找
					pluginMap := make(map[string]bool)
					for _, p := range requestedPlugins {
						pluginMap[p] = true
					}

					// 检查是否包含所有插件
					allIncluded := true
					for _, name := range allPluginNames {
						if !pluginMap[name] {
							allIncluded = false
							break
						}
					}

					// 如果包含所有插件，统一设为nil
					if allIncluded {
						plugins = nil
					}
				}
			}
		}
	}
	
	// 如果未指定并发数，使用配置中的默认值
	if concurrency <= 0 {
		concurrency = config.AppConfig.DefaultConcurrency
	}

	// 并行获取TG搜索和插件搜索结果
	var tgResults []model.SearchResult
	var pluginResults []model.SearchResult
	
	var wg sync.WaitGroup
	var tgErr, pluginErr error
	
	// 如果需要搜索TG
	if sourceType == "all" || sourceType == "tg" {
		wg.Add(1)
		go func() {
			defer wg.Done()
			tgResults, tgErr = s.searchTG(keyword, channels, forceRefresh)
		}()
	}
	// 如果需要搜索插件（且插件功能已启用）
	if (sourceType == "all" || sourceType == "plugin") && config.AppConfig.AsyncPluginEnabled {
		wg.Add(1)
		go func() {
			defer wg.Done()
			// 对于插件搜索，我们总是希望获取最新的缓存数据
			// 因此，即使forceRefresh=false，我们也需要确保获取到最新的缓存
			pluginResults, pluginErr = s.searchPlugins(keyword, plugins, forceRefresh, concurrency, ext)
		}()
	}
	
	// 等待所有搜索完成
	wg.Wait()
	
	// 检查错误
	if tgErr != nil {
		return model.SearchResponse{}, tgErr
	}
	if pluginErr != nil {
		return model.SearchResponse{}, pluginErr
	}
	
	// 合并结果
	allResults := mergeSearchResults(tgResults, pluginResults)

	// 按照优化后的规则排序结果
	sortResultsByTimeAndKeywords(allResults)

	// 过滤结果，只保留有时间的结果或包含优先关键词的结果或高等级插件结果到Results中
	filteredForResults := make([]model.SearchResult, 0, len(allResults))
	for _, result := range allResults {
		source := getResultSource(result)
		pluginLevel := getPluginLevelBySource(source)
		
		// 有时间的结果或包含优先关键词的结果或高等级插件(1-2级)结果保留在Results中
		if !result.Datetime.IsZero() || getKeywordPriority(result.Title) > 0 || pluginLevel <= 2 {
			filteredForResults = append(filteredForResults, result)
		}
	}

	// 合并链接按网盘类型分组（使用所有过滤后的结果）
	mergedLinks := mergeResultsByType(allResults, keyword, cloudTypes)

	// 构建响应
	var total int
	if resultType == "merged_by_type" {
		// 计算所有类型链接的总数
		total = 0
		for _, links := range mergedLinks {
			total += len(links)
		}
	} else {
		// 只计算filteredForResults的数量
		total = len(filteredForResults)
	}

	response := model.SearchResponse{
		Total:        total,
		Results:      filteredForResults, // 使用进一步过滤的结果
		MergedByType: mergedLinks,
	}

	// 根据resultType过滤返回结果
	return filterResponseByType(response, resultType), nil
}

// filterResponseByType 根据结果类型过滤响应
func filterResponseByType(response model.SearchResponse, resultType string) model.SearchResponse {
	switch resultType {
	case "merged_by_type":
		// 只返回MergedByType，Results设为nil，结合omitempty标签，JSON序列化时会忽略此字段
		return model.SearchResponse{
			Total:        response.Total,
			MergedByType: response.MergedByType,
			Results:      nil,
		}
	case "all":
		return response
	case "results":
		// 只返回Results
		return model.SearchResponse{
			Total:   response.Total,
			Results: response.Results,
		}
	default:
		// // 默认返回全部
		// return response
		return model.SearchResponse{
			Total:        response.Total,
			MergedByType: response.MergedByType,
			Results:      nil,
		}
	}
}

// 根据时间和关键词排序结果
func sortResultsByTimeAndKeywords(results []model.SearchResult) {
	// 1. 计算每个结果的综合得分
	scores := make([]ResultScore, len(results))
	
	for i, result := range results {
		source := getResultSource(result)
		
		scores[i] = ResultScore{
			Result:       result,
			TimeScore:    calculateTimeScore(result.Datetime),
			KeywordScore: getKeywordPriority(result.Title),
			PluginScore:  getPluginLevelScore(source),
			TotalScore:   0, // 稍后计算
		}
		
		// 计算综合得分
		scores[i].TotalScore = scores[i].TimeScore + 
							  float64(scores[i].KeywordScore) + 
							  float64(scores[i].PluginScore)
	}
	
	// 2. 按综合得分排序
	sort.Slice(scores, func(i, j int) bool {
		return scores[i].TotalScore > scores[j].TotalScore
	})
	
	// 3. 更新原数组
	for i, score := range scores {
		results[i] = score.Result
	}
}





// 获取标题中包含优先关键词的优先级
func getKeywordPriority(title string) int {
	title = strings.ToLower(title)
	for i, keyword := range priorityKeywords {
		if strings.Contains(title, keyword) {
			// 返回优先级得分（数组索引越小，优先级越高，最高400分）
			return (len(priorityKeywords) - i) * 70
		}
	}
	return 0
}

// 搜索单个频道
func (s *SearchService) searchChannel(keyword string, channel string) ([]model.SearchResult, error) {
	// 构建搜索URL
	url := util.BuildSearchURL(channel, keyword, "")

	// 使用全局HTTP客户端（已配置代理）
	client := util.GetHTTPClient()

	// 创建一个带超时的上下文
	ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
	defer cancel()

	// 创建请求
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	// 发送请求
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// 读取响应体
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// 解析响应
	results, _, err := util.ParseSearchResults(string(body), channel)
	if err != nil {
		return nil, err
	}

	return results, nil
}

// 用于从消息内容中提取链接-标题对应关系的函数
func extractLinkTitlePairs(content string) map[string]string {
	// 首先尝试使用换行符分割的方法
	if strings.Contains(content, "\n") {
		return extractLinkTitlePairsWithNewlines(content)
	}
	
	// 如果没有换行符，使用正则表达式直接提取
	return extractLinkTitlePairsWithoutNewlines(content)
}

// 处理有换行符的情况
func extractLinkTitlePairsWithNewlines(content string) map[string]string {
	// 结果映射：链接URL -> 对应标题
	linkTitleMap := make(map[string]string)
	
	// 按行分割内容
	lines := strings.Split(content, "\n")
	
	// 链接正则表达式
	linkRegex := regexp.MustCompile(`https?://[^\s"']+`)
	
	// 第一遍扫描：识别标题-链接对
	var lastTitle string
	var lastTitleIndex int
	
	for i := 0; i < len(lines); i++ {
		line := strings.TrimSpace(lines[i])
		if line == "" {
			continue
		}
		
		// 检查当前行是否包含链接
		links := linkRegex.FindAllString(line, -1)
		
		if len(links) > 0 {
			// 当前行包含链接
			
			// 检查是否是标准链接行（以"链接："、"地址："等开头）
			isStandardLinkLine := isLinkLine(line)
			
			if isStandardLinkLine && lastTitle != "" {
				// 标准链接行，使用上一个标题
				for _, link := range links {
					linkTitleMap[link] = lastTitle
				}
			} else if !isStandardLinkLine {
				// 非标准链接行，可能是"标题：链接"格式
				titleFromLine := extractTitleFromLinkLine(line)
				if titleFromLine != "" {
					// 是"标题：链接"格式
					for _, link := range links {
						linkTitleMap[link] = titleFromLine
					}
				} else if lastTitle != "" {
					// 其他情况，使用上一个标题
					for _, link := range links {
						linkTitleMap[link] = lastTitle
					}
				}
			}
		} else {
			// 当前行不包含链接，可能是标题行
			// 检查下一行是否为链接行
			if i+1 < len(lines) {
				nextLine := strings.TrimSpace(lines[i+1])
				if isLinkLine(nextLine) || linkRegex.MatchString(nextLine) {
					// 下一行是链接行或包含链接，当前行很可能是标题
					lastTitle = cleanTitle(line)
					lastTitleIndex = i
				}
			} else {
				// 最后一行，也可能是标题
				lastTitle = cleanTitle(line)
				lastTitleIndex = i
			}
		}
	}
	
	// 第二遍扫描：处理没有匹配到标题的链接
	// 为每个链接找到最近的上文标题
	for i := 0; i < len(lines); i++ {
		line := strings.TrimSpace(lines[i])
		if line == "" {
			continue
		}
		
		links := linkRegex.FindAllString(line, -1)
		if len(links) == 0 {
			continue
		}
		
		for _, link := range links {
			if _, exists := linkTitleMap[link]; !exists {
				// 链接没有匹配到标题，尝试找最近的上文标题
				nearestTitle := ""
				
				// 向上查找最近的标题行
				for j := i - 1; j >= 0; j-- {
					if j == lastTitleIndex || (j+1 < len(lines) && 
						linkRegex.MatchString(lines[j+1]) && 
						!linkRegex.MatchString(lines[j])) {
						candidateTitle := cleanTitle(lines[j])
						if candidateTitle != "" {
							nearestTitle = candidateTitle
							break
						}
					}
				}
				
				if nearestTitle != "" {
					linkTitleMap[link] = nearestTitle
				}
			}
		}
	}
	
	return linkTitleMap
}

// 处理没有换行符的情况
func extractLinkTitlePairsWithoutNewlines(content string) map[string]string {
	// 结果映射：链接URL -> 对应标题
	linkTitleMap := make(map[string]string)
	
	// 使用精确的网盘链接正则表达式集合，避免贪婪匹配
	linkPatterns := []*regexp.Regexp{
		util.TianyiPanPattern,  // 天翼云盘
		util.BaiduPanPattern,   // 百度网盘
		util.QuarkPanPattern,   // 夸克网盘
		util.AliyunPanPattern,  // 阿里云盘
		util.UCPanPattern,      // UC网盘
		util.Pan123Pattern,     // 123网盘
		util.Pan115Pattern,     // 115网盘
		util.XunleiPanPattern,  // 迅雷网盘
	}
	
	// 收集所有链接及其位置
	type linkInfo struct {
		url string
		pos int
	}
	var allLinks []linkInfo
	
	// 使用各个精确正则表达式查找链接
	for _, pattern := range linkPatterns {
		matches := pattern.FindAllString(content, -1)
		for _, match := range matches {
			pos := strings.Index(content, match)
			if pos >= 0 {
				allLinks = append(allLinks, linkInfo{url: match, pos: pos})
			}
		}
	}
	
	// 按位置排序
	for i := 0; i < len(allLinks)-1; i++ {
		for j := i + 1; j < len(allLinks); j++ {
			if allLinks[i].pos > allLinks[j].pos {
				allLinks[i], allLinks[j] = allLinks[j], allLinks[i]
			}
		}
	}
	
	// URL标准化和去重
	uniqueLinks := make(map[string]string) // 标准化URL -> 原始URL
	var links []string
	
	for _, linkInfo := range allLinks {
		// 标准化URL（将URL编码转换为中文）
		normalized := normalizeUrl(linkInfo.url)
		
		// 如果这个标准化URL还没有见过，则保留
		if _, exists := uniqueLinks[normalized]; !exists {
			uniqueLinks[normalized] = linkInfo.url
			links = append(links, linkInfo.url)
		}
	}
	
	if len(links) == 0 {
		return linkTitleMap
	}
	
	// 使用链接位置分割内容
	segments := make([]string, len(links)+1)
	lastPos := 0
	
	// 查找每个链接的位置，并提取链接前的文本作为段落
	for i, link := range links {
		idx := strings.Index(content[lastPos:], link)
		if idx == -1 {
			// 链接在content中不存在，跳过
			continue
		}
		pos := idx + lastPos
		if pos > lastPos {
			segments[i] = content[lastPos:pos]
		}
		lastPos = pos + len(link)
	}
	
	// 最后一段
	if lastPos < len(content) {
		segments[len(links)] = content[lastPos:]
	}
	
	// 从每个段落中提取标题
	for i, link := range links {
		// 当前链接的标题应该在当前段落的末尾
		var title string
		
		// 如果是第一个链接
		if i == 0 {
			// 提取第一个段落作为标题
			title = extractTitleBeforeLink(segments[i])
		} else {
			// 从上一个链接后的文本中提取标题
			title = extractTitleBeforeLink(segments[i])
		}
		
		// 如果提取到了标题，保存链接-标题对应关系
		if title != "" {
			linkTitleMap[link] = title
		}
	}
	
	return linkTitleMap
}

// 从文本中提取链接前的标题
func extractTitleBeforeLink(text string) string {
	// 移除可能的链接前缀词
	text = strings.TrimSpace(text)
	
	// 查找"链接："前的文本作为标题
	if idx := strings.Index(text, "链接："); idx > 0 {
		return cleanTitle(text[:idx])
	}
	
	// 尝试匹配常见的标题模式
	titlePattern := regexp.MustCompile(`([^链地资网\s]+?(?:\([^)]+\))?(?:\s*\d+K)?(?:\s*臻彩)?(?:\s*MAX)?(?:\s*HDR)?(?:\s*更(?:新)?\d+集))$`)
	matches := titlePattern.FindStringSubmatch(text)
	if len(matches) > 1 {
		return cleanTitle(matches[1])
	}
	
	return cleanTitle(text)
}

// 判断一行是否为链接行（主要包含链接的行）
func isLinkLine(line string) bool {
	lowerLine := strings.ToLower(line)
	return strings.HasPrefix(lowerLine, "链接：") || 
		   strings.HasPrefix(lowerLine, "地址：") ||
		   strings.HasPrefix(lowerLine, "资源地址：") ||
		   strings.HasPrefix(lowerLine, "网盘：") ||
		   strings.HasPrefix(lowerLine, "网盘地址：") ||
		   strings.HasPrefix(lowerLine, "链接:")
}

// 从链接行中提取可能的标题
func extractTitleFromLinkLine(line string) string {
	// 处理"标题：链接"格式
	parts := strings.SplitN(line, "：", 2)
	if len(parts) == 2 && !strings.Contains(parts[0], "http") &&
		!isLinkPrefix(parts[0]) {
		return cleanTitle(parts[0])
	}
	
	// 处理"标题:链接"格式（半角冒号）
	parts = strings.SplitN(line, ":", 2)
	if len(parts) == 2 && !strings.Contains(parts[0], "http") &&
		!isLinkPrefix(parts[0]) {
		return cleanTitle(parts[0])
	}
	
	return ""
}

// 判断是否为链接前缀词（包括网盘名称）
func isLinkPrefix(text string) bool {
	text = strings.ToLower(strings.TrimSpace(text))
	
	// 标准链接前缀词
	if text == "链接" || 
	   text == "地址" || 
	   text == "资源地址" || 
	   text == "网盘" || 
	   text == "网盘地址" {
		return true
	}
	
	// 网盘名称（防止误将网盘名称当作标题）
	cloudDiskNames := []string{
		// 夸克网盘
		"夸克", "夸克网盘", "quark", "夸克云盘",
		
		// 百度网盘
		"百度", "百度网盘", "baidu", "百度云", "bdwp", "bdpan",
		
		// 迅雷网盘
		"迅雷", "迅雷网盘", "xunlei", "迅雷云盘",
		
		// 115网盘
		"115", "115网盘", "115云盘",
		
		// 123网盘
		"123", "123pan", "123网盘", "123云盘",
		
		// 阿里云盘
		"阿里", "阿里云", "阿里云盘", "aliyun", "alipan", "阿里网盘",
		
		// 天翼云盘
		"天翼", "天翼云", "天翼云盘", "tianyi", "天翼网盘",
		
		// UC网盘
		"uc", "uc网盘", "uc云盘",
		
		// 移动云盘
		"移动", "移动云", "移动云盘", "caiyun", "彩云",
		
		// PikPak
		"pikpak", "pikpak网盘",
	}
	
	for _, name := range cloudDiskNames {
		if text == name {
			return true
		}
	}
	
	return false
}

// 清理标题文本
func cleanTitle(title string) string {
	// 移除常见的无关前缀
	title = strings.TrimSpace(title)
	title = strings.TrimPrefix(title, "名称：")
	title = strings.TrimPrefix(title, "标题：")
	title = strings.TrimPrefix(title, "片名：")
	title = strings.TrimPrefix(title, "名称:")
	title = strings.TrimPrefix(title, "标题:")
	title = strings.TrimPrefix(title, "片名:")
	
	// 移除表情符号和特殊字符
	emojiRegex := regexp.MustCompile(`[\p{So}\p{Sk}]`)
	title = emojiRegex.ReplaceAllString(title, "")
	
	return strings.TrimSpace(title)
}

// 判断一行是否为空或只包含空白字符
func isEmpty(line string) bool {
	return strings.TrimSpace(line) == ""
}

// 将搜索结果按网盘类型分组
func mergeResultsByType(results []model.SearchResult, keyword string, cloudTypes []string) model.MergedLinks {
	// 创建合并结果的映射
	mergedLinks := make(model.MergedLinks, 12) // 预分配容量，假设有12种不同的网盘类型

	// 用于去重的映射，键为URL
	uniqueLinks := make(map[string]model.MergedLink)

	// 将关键词转为小写，用于不区分大小写的匹配
	lowerKeyword := strings.ToLower(keyword)

	// 遍历所有搜索结果
	for _, result := range results {
		// 提取消息中的链接-标题对应关系
		linkTitleMap := extractLinkTitlePairs(result.Content)
		
		// 如果没有从内容中提取到标题，尝试直接从内容中匹配
		if len(linkTitleMap) == 0 && len(result.Links) > 0 && !strings.Contains(result.Content, "\n") {
			// 这是没有换行符的情况，尝试直接匹配
			content := result.Content
			
			// 支持多种网盘链接前缀
			linkPrefixes := []string{"天翼链接：", "百度链接：", "夸克链接：", "阿里链接：", "UC链接：", "115链接：", "迅雷链接：", "123链接：", "链接："}
			
			var parts []string
			
			// 尝试找到匹配的前缀
			for _, prefix := range linkPrefixes {
				if strings.Contains(content, prefix) {
					parts = strings.Split(content, prefix)
					break
				}
			}
			
			// 如果找到了匹配的前缀并且分割成功
			if len(parts) > 1 && len(result.Links) <= len(parts)-1 {
				// 第一部分是第一个标题
				titles := make([]string, 0, len(parts))
				titles = append(titles, cleanTitle(parts[0]))
				
				// 处理每个包含链接的部分，提取标题
				for i := 1; i < len(parts)-1; i++ {
					part := parts[i]
					// 找到链接的结束位置，使用更通用的分隔符
					linkEnd := -1
					for j, c := range part {
						// 扩展分隔符列表，包含更多可能的字符
						if c == ' ' || c == '窃' || c == '东' || c == '迎' || c == '千' || c == '我' || c == '恋' || c == '将' || c == '野' || 
						   c == '合' || c == '集' || c == '天' || c == '翼' || c == '网' || c == '盘' || c == '(' || c == '（' {
							linkEnd = j
							break
						}
					}
					
					if linkEnd > 0 {
						// 提取标题
						title := cleanTitle(part[linkEnd:])
						titles = append(titles, title)
					}
				}
				
				// 将标题与链接关联
				for i, link := range result.Links {
					if i < len(titles) {
						linkTitleMap[link.URL] = titles[i]
					}
				}
			}
		}
		
		for _, link := range result.Links {
			// 优先使用链接的WorkTitle字段，如果为空则回退到传统方式
			title := result.Title // 默认使用消息标题
			
			if link.WorkTitle != "" {
				// 如果链接有WorkTitle字段，优先使用
				title = link.WorkTitle
			} else {
				// 如果没有WorkTitle，使用传统方式从映射中获取该链接对应的标题
				// 查找完全匹配的链接
				if specificTitle, found := linkTitleMap[link.URL]; found && specificTitle != "" {
					title = specificTitle // 如果找到特定标题，则使用它
				} else {
					// 如果没有找到完全匹配的链接，尝试查找前缀匹配的链接
					for mappedLink, mappedTitle := range linkTitleMap {
						if strings.HasPrefix(mappedLink, link.URL) {
							title = mappedTitle
							break
						}
					}
				}
			}
			
			// 检查插件是否需要跳过Service层过滤
			var skipKeywordFilter bool = false
			if result.UniqueID != "" && strings.Contains(result.UniqueID, "-") {
				parts := strings.SplitN(result.UniqueID, "-", 2)
				if len(parts) >= 1 {
					pluginName := parts[0]
					// 通过插件注册表动态获取过滤设置
					if pluginInstance, exists := plugin.GetPluginByName(pluginName); exists {
						skipKeywordFilter = pluginInstance.SkipServiceFilter()
					}
				}
			}
			
			// 关键词过滤：现在我们有了准确的链接-标题对应关系，只需检查每个链接的具体标题
			if !skipKeywordFilter && keyword != "" {
				// 只检查链接的具体标题，无论是TG来源还是插件来源
				if !strings.Contains(strings.ToLower(title), lowerKeyword) {
					continue
				}
			}
			
			// 确定数据来源
			var source string
			if result.Channel != "" {
				// 来自TG频道
				source = "tg:" + result.Channel
			} else if result.UniqueID != "" && strings.Contains(result.UniqueID, "-") {
				// 来自插件：UniqueID格式通常为 "插件名-ID"
				parts := strings.SplitN(result.UniqueID, "-", 2)
				if len(parts) >= 1 {
					source = "plugin:" + parts[0]
				}
			} else {
				// 无法确定来源，使用默认值
				source = "unknown"
			}
			
			// 赋值给Note前，支持多个关键词裁剪
			title = util.CutTitleByKeywords(title, []string{"简介", "描述"})
			
			// 优先使用链接自己的时间，如果没有则使用搜索结果的时间
			linkDatetime := result.Datetime
			if !link.Datetime.IsZero() {
				linkDatetime = link.Datetime
			}
			
			mergedLink := model.MergedLink{
				URL:      link.URL,
				Password: link.Password,
				Note:     title, // 使用找到的特定标题
				Datetime: linkDatetime,
				Source:   source, // 添加数据来源字段
				Images:   result.Images, // 添加TG消息中的图片链接
			}

			// 检查是否已存在相同URL的链接
			if existingLink, exists := uniqueLinks[link.URL]; exists {
				// 如果已存在，只有当当前链接的时间更新时才替换
				if mergedLink.Datetime.After(existingLink.Datetime) {
					uniqueLinks[link.URL] = mergedLink
				}
			} else {
				// 如果不存在，直接添加
				uniqueLinks[link.URL] = mergedLink
			}
		}
	}

	// 为保持排序顺序，按原始results顺序处理链接，而不是随机遍历map
	// 创建一个有序的链接列表，按原始results中的顺序
	orderedLinks := make([]model.MergedLink, 0, len(uniqueLinks))
	linkTypeMap := make(map[string]string) // URL -> Type的映射
	
	// 按原始results的顺序收集唯一链接
	for _, result := range results {
		for _, link := range result.Links {
			if mergedLink, exists := uniqueLinks[link.URL]; exists {
				// 检查是否已经添加过这个链接
				found := false
				for _, existing := range orderedLinks {
					if existing.URL == link.URL {
						found = true
						break
					}
				}
				if !found {
					orderedLinks = append(orderedLinks, mergedLink)
					linkTypeMap[link.URL] = link.Type
				}
			}
		}
	}
	
	// 将有序链接按类型分组
	for _, mergedLink := range orderedLinks {
		// 从预建的映射中获取链接类型
		linkType := linkTypeMap[mergedLink.URL]
		if linkType == "" {
			linkType = "unknown"
		}

		// 添加到对应类型的列表中
		mergedLinks[linkType] = append(mergedLinks[linkType], mergedLink)
	}


	// 如果指定了cloudTypes，则过滤结果
	if len(cloudTypes) > 0 {
		// 创建过滤后的结果映射
		filteredLinks := make(model.MergedLinks)
		
		// 将cloudTypes转换为map以提高查找性能
		allowedTypes := make(map[string]bool)
		for _, cloudType := range cloudTypes {
			allowedTypes[strings.ToLower(strings.TrimSpace(cloudType))] = true
		}
		
		// 只保留指定类型的链接
		for linkType, links := range mergedLinks {
			if allowedTypes[strings.ToLower(linkType)] {
				filteredLinks[linkType] = links
			}
		}
		
		return filteredLinks
	}

	return mergedLinks
}

// searchTG 搜索TG频道
func (s *SearchService) searchTG(keyword string, channels []string, forceRefresh bool) ([]model.SearchResult, error) {
	// 生成缓存键
	cacheKey := cache.GenerateTGCacheKey(keyword, channels)
	
	// 如果未启用强制刷新，尝试从缓存获取结果
	if !forceRefresh && cacheInitialized && config.AppConfig.CacheEnabled {
		var data []byte
		var hit bool
		var err error
		
		// 使用增强版缓存
		if enhancedTwoLevelCache != nil {
			data, hit, err = enhancedTwoLevelCache.Get(cacheKey)
			
			if err == nil && hit {
				var results []model.SearchResult
				if err := enhancedTwoLevelCache.GetSerializer().Deserialize(data, &results); err == nil {
					// 直接返回缓存数据，不检查新鲜度
					return results, nil
				}
			}
		}
	}
	
	// 缓存未命中或强制刷新，执行实际搜索
	var results []model.SearchResult
	
	// 使用工作池并行搜索多个频道
	tasks := make([]pool.Task, 0, len(channels))
	
	for _, channel := range channels {
		ch := channel // 创建副本，避免闭包问题
		tasks = append(tasks, func() interface{} {
			results, err := s.searchChannel(keyword, ch)
			if err != nil {
				return nil
			}
			return results
		})
	}
	
	// 执行搜索任务并获取结果
	taskResults := pool.ExecuteBatchWithTimeout(tasks, len(channels), config.AppConfig.PluginTimeout)
	
	// 合并所有频道的结果
	for _, result := range taskResults {
		if result != nil {
			channelResults := result.([]model.SearchResult)
			results = append(results, channelResults...)
		}
	}
	
	// 异步缓存结果
	if cacheInitialized && config.AppConfig.CacheEnabled {
		go func(res []model.SearchResult) {
			ttl := time.Duration(config.AppConfig.CacheTTLMinutes) * time.Minute
			
			// 使用增强版缓存
			if enhancedTwoLevelCache != nil {
				data, err := enhancedTwoLevelCache.GetSerializer().Serialize(res)
				if err != nil {
					return
				}
				enhancedTwoLevelCache.Set(cacheKey, data, ttl)
			}
		}(results)
	}
	
	return results, nil
}

// searchPlugins 搜索插件
func (s *SearchService) searchPlugins(keyword string, plugins []string, forceRefresh bool, concurrency int, ext map[string]interface{}) ([]model.SearchResult, error) {
	// 确保ext不为nil
	if ext == nil {
		ext = make(map[string]interface{})
	}

	// 关键：将forceRefresh同步到插件ext["refresh"]
    if forceRefresh {
        ext["refresh"] = true
    }
	
	// 生成缓存键
	cacheKey := cache.GeneratePluginCacheKey(keyword, plugins)
	
	
	// 如果未启用强制刷新，尝试从缓存获取结果
	if !forceRefresh && cacheInitialized && config.AppConfig.CacheEnabled {
		var data []byte
		var hit bool
		var err error
		
		// 使用增强版缓存
		if enhancedTwoLevelCache != nil {
			
			// 使用Get方法，它会检查磁盘缓存是否有更新
			// 如果磁盘缓存比内存缓存更新，会自动更新内存缓存并返回最新数据
			data, hit, err = enhancedTwoLevelCache.Get(cacheKey)
			
			if err == nil && hit {
				var results []model.SearchResult
				if err := enhancedTwoLevelCache.GetSerializer().Deserialize(data, &results); err == nil {
					// 返回缓存数据
					fmt.Printf("✅ [%s] 命中缓存 结果数: %d\n", keyword,  len(results))
					return results, nil
				} else {
					displayKey := cacheKey[:8] + "..."
					fmt.Printf("[主服务] 缓存反序列化失败: %s(关键词:%s) | 错误: %v\n", displayKey, keyword, err)
				}
			}
		}
	}
	
	// 缓存未命中或强制刷新，执行实际搜索
	
	// 获取所有可用插件
	var availablePlugins []plugin.AsyncSearchPlugin
	if s.pluginManager != nil {
		allPlugins := s.pluginManager.GetPlugins()
		
		// 确保plugins不为nil并且有非空元素
		hasPlugins := plugins != nil && len(plugins) > 0
		hasNonEmptyPlugin := false
		
		if hasPlugins {
			for _, p := range plugins {
				if p != "" {
					hasNonEmptyPlugin = true
					break
				}
			}
		}
		
		// 只有当plugins数组包含非空元素时才进行过滤
		if hasPlugins && hasNonEmptyPlugin {
			pluginMap := make(map[string]bool)
			for _, p := range plugins {
				if p != "" { // 忽略空字符串
					pluginMap[strings.ToLower(p)] = true
				}
			}
			
			for _, p := range allPlugins {
				if pluginMap[strings.ToLower(p.Name())] {
					availablePlugins = append(availablePlugins, p)
				}
			}
		} else {
			// 如果plugins为nil、空数组或只包含空字符串，视为未指定，使用所有插件
			availablePlugins = allPlugins
		}
	}
	
	// 控制并发数
	if concurrency <= 0 {
		// 使用配置中的默认值
		concurrency = config.AppConfig.DefaultConcurrency
	}
	
	// 使用工作池执行并行搜索
	tasks := make([]pool.Task, 0, len(availablePlugins))
	for _, p := range availablePlugins {
		plugin := p // 创建副本，避免闭包问题
		tasks = append(tasks, func() interface{} {
			// 设置主缓存键和当前关键词
			plugin.SetMainCacheKey(cacheKey)
			plugin.SetCurrentKeyword(keyword)
			
			// 调用异步插件的AsyncSearch方法
			results, err := plugin.AsyncSearch(keyword, func(client *http.Client, kw string, extParams map[string]interface{}) ([]model.SearchResult, error) {
				// 使用插件的Search方法作为搜索函数
				return plugin.Search(kw, extParams)
			}, cacheKey, ext)
			
			if err != nil {
				return nil
			}
			return results
		})
	}
	
	// 执行搜索任务并获取结果
	results := pool.ExecuteBatchWithTimeout(tasks, concurrency, config.AppConfig.PluginTimeout)
	
	// 合并所有插件的结果，过滤掉无链接的结果
	var allResults []model.SearchResult
	for _, result := range results {
		if result != nil {
			pluginResults := result.([]model.SearchResult)
			// 只添加有链接的结果到最终结果中
			for _, pluginResult := range pluginResults {
				if len(pluginResult.Links) > 0 {
					allResults = append(allResults, pluginResult)
				}
			}
		}
	}
	
	// 恢复主程序缓存更新：确保最终合并结果被正确缓存
	if cacheInitialized && config.AppConfig.CacheEnabled {
		go func(res []model.SearchResult, kw string, key string) {
			ttl := time.Duration(config.AppConfig.CacheTTLMinutes) * time.Minute
			
			// 使用增强版缓存，确保与异步插件使用相同的序列化器
			if enhancedTwoLevelCache != nil {
				data, err := enhancedTwoLevelCache.GetSerializer().Serialize(res)
				if err != nil {
					fmt.Printf("[主程序] 缓存序列化失败: %s | 错误: %v\n", key, err)
					return
				}
				
			// 主程序最后更新，覆盖可能有问题的异步插件缓存
			// 使用同步方式确保数据写入磁盘
			enhancedTwoLevelCache.SetBothLevels(key, data, ttl)
				if config.AppConfig != nil && config.AppConfig.AsyncLogEnabled {
					fmt.Printf("[主程序] 缓存更新完成: %s | 结果数: %d", 
						key, len(res))
				}
			}
		}(allResults, keyword, cacheKey)
	}
	
	return allResults, nil
}



// GetPluginManager 获取插件管理器
func (s *SearchService) GetPluginManager() *plugin.PluginManager {
	return s.pluginManager
}

// =============================================================================
// 轻量级插件优先级排序实现
// =============================================================================

// ResultScore 搜索结果评分结构
type ResultScore struct {
	Result       model.SearchResult
	TimeScore    float64  // 时间得分
	KeywordScore int      // 关键词得分  
	PluginScore  int      // 插件等级得分
	TotalScore   float64  // 综合得分
}

// 插件等级缓存
var (
	pluginLevelCache = sync.Map{} // 插件等级缓存
)

// getResultSource 从SearchResult推断数据来源
func getResultSource(result model.SearchResult) string {
	if result.Channel != "" {
		// 来自TG频道
		return "tg:" + result.Channel
	} else if result.UniqueID != "" && strings.Contains(result.UniqueID, "-") {
		// 来自插件：UniqueID格式通常为 "插件名-ID"
		parts := strings.SplitN(result.UniqueID, "-", 2)
		if len(parts) >= 1 {
			return "plugin:" + parts[0]
		}
	}
	return "unknown"
}

// getPluginLevelBySource 根据来源获取插件等级
func getPluginLevelBySource(source string) int {
	// 尝试从缓存获取
	if level, ok := pluginLevelCache.Load(source); ok {
		return level.(int)
	}
	
	parts := strings.Split(source, ":")
	if len(parts) != 2 {
		pluginLevelCache.Store(source, 3)
		return 3 // 默认等级
	}
	
	if parts[0] == "tg" {
		pluginLevelCache.Store(source, 3)
		return 3 // TG搜索等同于等级3
	}
	
	if parts[0] == "plugin" {
		level := getPluginPriorityByName(parts[1])
		pluginLevelCache.Store(source, level)
		return level
	}
	
	pluginLevelCache.Store(source, 3)
	return 3
}

// getPluginPriorityByName 根据插件名获取优先级
func getPluginPriorityByName(pluginName string) int {
	// 从插件管理器动态获取真实的优先级 (O(1)哈希查找)
	if pluginInstance, exists := plugin.GetPluginByName(pluginName); exists {
		return pluginInstance.Priority()
	}
	return 3 // 默认等级
}

// getPluginLevelScore 获取插件等级得分
func getPluginLevelScore(source string) int {
	level := getPluginLevelBySource(source)
	
	switch level {
	case 1:
		return 1000  // 等级1插件：1000分
	case 2:
		return 500   // 等级2插件：500分
	case 3:
		return 0     // 等级3插件：0分
	case 4:
		return -200  // 等级4插件：-200分
	default:
		return 0     // 默认使用等级3得分
	}
}

// calculateTimeScore 计算时间得分
func calculateTimeScore(datetime time.Time) float64 {
	if datetime.IsZero() {
		return 0 // 无时间信息得0分
	}
	
	now := time.Now()
	daysDiff := now.Sub(datetime).Hours() / 24
	
	// 时间得分：越新得分越高，最大500分（增加时间权重）
	switch {
	case daysDiff <= 1:
		return 500  // 1天内
	case daysDiff <= 3:
		return 400  // 3天内
	case daysDiff <= 7:
		return 300  // 1周内
	case daysDiff <= 30:
		return 200  // 1月内
	case daysDiff <= 90:
		return 100  // 3月内
	case daysDiff <= 365:
		return 50   // 1年内
	default:
		return 20   // 1年以上
	}
}


