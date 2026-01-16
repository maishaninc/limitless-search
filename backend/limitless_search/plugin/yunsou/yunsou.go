package yunsou

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"pansou/model"
	"pansou/plugin"
	"pansou/util/json"
	"regexp"
	"strings"
	"time"
)

// 预编译的正则表达式
var (
	// 提取JSON数据的正则表达式
	jsonDataRegex = regexp.MustCompile(`var jsonData = '(.+?)';`)
	
	// 提取pwd参数的正则表达式
	pwdParamRegex = regexp.MustCompile(`[?&]pwd=([0-9a-zA-Z]+)`)
	
	// 控制字符清理正则
	controlCharsRegex = regexp.MustCompile(`[\x00-\x1F\x7F]`)
)

// 常量定义
const (
	// 插件名称
	pluginName = "yunsou"
	
	// 搜索URL模板
	searchURLTemplate = "https://yunsou.xyz/s/%s.html"
	
	// 默认优先级
	defaultPriority = 2
	
	// 默认超时时间
	defaultTimeout = 30 * time.Second
	
	// 最大重试次数
	maxRetries = 3
	
	// 时间格式
	timeLayout = "2006-01-02"
)

// YunsouAsyncPlugin 是云搜影视网站的异步搜索插件实现
type YunsouAsyncPlugin struct {
	*plugin.BaseAsyncPlugin
	optimizedClient *http.Client
}

// YunsouCategory 分类信息
type YunsouCategory struct {
	SourceCategoryID int    `json:"source_category_id"`
	Name             string `json:"name"`
}

// YunsouItem 单个搜索结果项
type YunsouItem struct {
	ID               int             `json:"id"`
	SourceCategoryID int             `json:"source_category_id"`
	Title            string          `json:"title"`
	IsType           int             `json:"is_type"`        // 0=夸克, 1=阿里, 2=百度, 3=UC, 4=迅雷
	Code             *string         `json:"code"`           // 提取码，可能为null
	URL              string          `json:"url"`
	IsTime           int             `json:"is_time"`
	Name             string          `json:"name"`
	Times            string          `json:"times"`          // 发布时间 "2025-07-27"
	Category         YunsouCategory  `json:"category"`
}

// 确保YunsouAsyncPlugin实现了AsyncSearchPlugin接口
var _ plugin.AsyncSearchPlugin = (*YunsouAsyncPlugin)(nil)

// init 在包初始化时注册插件
func init() {
	plugin.RegisterGlobalPlugin(NewYunsouAsyncPlugin())
}

// createOptimizedHTTPClient 创建优化的HTTP客户端
func createOptimizedHTTPClient() *http.Client {
	transport := &http.Transport{
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 20,
		MaxConnsPerHost:     50,
		IdleConnTimeout:     90 * time.Second,
		DisableKeepAlives:   false,
	}
	return &http.Client{
		Transport: transport,
		Timeout:   defaultTimeout,
	}
}

// NewYunsouAsyncPlugin 创建一个新的云搜影视异步插件实例
func NewYunsouAsyncPlugin() *YunsouAsyncPlugin {
	return &YunsouAsyncPlugin{
		BaseAsyncPlugin: plugin.NewBaseAsyncPlugin(pluginName, defaultPriority),
		optimizedClient: createOptimizedHTTPClient(),
	}
}

// Search 执行搜索并返回结果（兼容性方法）
func (p *YunsouAsyncPlugin) Search(keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	result, err := p.SearchWithResult(keyword, ext)
	if err != nil {
		return nil, err
	}
	return result.Results, nil
}

// SearchWithResult 执行搜索并返回包含IsFinal标记的结果
func (p *YunsouAsyncPlugin) SearchWithResult(keyword string, ext map[string]interface{}) (model.PluginSearchResult, error) {
	return p.AsyncSearchWithResult(keyword, p.searchImpl, p.MainCacheKey, ext)
}

// searchImpl 实现具体的搜索逻辑
func (p *YunsouAsyncPlugin) searchImpl(client *http.Client, keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	// 1. 构建搜索URL
	searchURL := fmt.Sprintf(searchURLTemplate, url.QueryEscape(keyword))
	
	// 2. 创建带超时的上下文
	ctx, cancel := context.WithTimeout(context.Background(), defaultTimeout)
	defer cancel()
	
	// 3. 创建请求
	req, err := http.NewRequestWithContext(ctx, "GET", searchURL, nil)
	if err != nil {
		return nil, fmt.Errorf("[%s] 创建请求失败: %w", p.Name(), err)
	}
	
	// 4. 设置完整的请求头（避免反爬虫）
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
	req.Header.Set("Connection", "keep-alive")
	req.Header.Set("Upgrade-Insecure-Requests", "1")
	req.Header.Set("Cache-Control", "max-age=0")
	req.Header.Set("Referer", "https://yunsou.xyz/")
	
	// 5. 发送请求（带重试机制）
	resp, err := p.doRequestWithRetry(req, client)
	if err != nil {
		return nil, fmt.Errorf("[%s] 搜索请求失败: %w", p.Name(), err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("[%s] 搜索请求返回状态码: %d", p.Name(), resp.StatusCode)
	}
	
	// 6. 读取响应内容
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("[%s] 读取响应失败: %w", p.Name(), err)
	}
	
	htmlContent := string(bodyBytes)
	
	// 7. 提取JSON数据
	jsonStr, err := p.extractJSONData(htmlContent)
	if err != nil {
		return nil, fmt.Errorf("[%s] 提取JSON数据失败: %w", p.Name(), err)
	}
	
	// 8. 解析JSON数据
	var items []YunsouItem
	if err := json.Unmarshal([]byte(jsonStr), &items); err != nil {
		return nil, fmt.Errorf("[%s] 解析JSON失败: %w", p.Name(), err)
	}
	
	// 9. 转换为标准格式
	results := make([]model.SearchResult, 0, len(items))
	for _, item := range items {
		result := p.convertToSearchResult(item)
		if result.UniqueID != "" && len(result.Links) > 0 {
			results = append(results, result)
		}
	}
	
	// 10. 关键词过滤
	return plugin.FilterResultsByKeyword(results, keyword), nil
}

// extractJSONData 从HTML中提取JSON数据
func (p *YunsouAsyncPlugin) extractJSONData(htmlContent string) (string, error) {
	// 查找 var jsonData = '...'
	matches := jsonDataRegex.FindStringSubmatch(htmlContent)
	if len(matches) < 2 {
		return "", fmt.Errorf("未找到JSON数据")
	}
	
	jsonStr := matches[1]
	
	// 清理控制字符
	jsonStr = controlCharsRegex.ReplaceAllString(jsonStr, "")
	
	// 处理转义字符
	jsonStr = strings.ReplaceAll(jsonStr, `\/`, `/`)
	
	return jsonStr, nil
}

// convertToSearchResult 将YunsouItem转换为SearchResult
func (p *YunsouAsyncPlugin) convertToSearchResult(item YunsouItem) model.SearchResult {
	result := model.SearchResult{
		UniqueID: fmt.Sprintf("%s-%d", p.Name(), item.ID),
		Title:    item.Title,
		Channel:  "", // 插件搜索结果必须为空字符串
	}
	
	// 解析时间
	if item.Times != "" {
		if parsedTime, err := time.Parse(timeLayout, item.Times); err == nil {
			result.Datetime = parsedTime
		} else {
			result.Datetime = time.Now()
		}
	} else {
		result.Datetime = time.Now()
	}
	
	// 构建内容描述
	var contentParts []string
	if item.Category.Name != "" {
		contentParts = append(contentParts, "【"+item.Category.Name+"】")
	}
	result.Content = strings.Join(contentParts, " ")
	
	// 添加分类标签
	if item.Category.Name != "" {
		result.Tags = []string{item.Category.Name}
	}
	
	// 构建网盘链接
	if item.URL != "" {
		link := model.Link{
			Type: p.convertNetDiskType(item.IsType),
			URL:  item.URL,
		}
		
		// 处理提取码
		if item.Code != nil && *item.Code != "" {
			link.Password = *item.Code
		} else if strings.Contains(item.URL, "?pwd=") {
			link.Password = p.extractPwdFromURL(item.URL)
		}
		
		result.Links = []model.Link{link}
	}
	
	return result
}

// convertNetDiskType 将is_type转换为网盘类型标识
func (p *YunsouAsyncPlugin) convertNetDiskType(isType int) string {
	switch isType {
	case 0:
		return "quark" // 夸克网盘
	case 1:
		return "aliyun" // 阿里云盘
	case 2:
		return "baidu" // 百度网盘
	case 3:
		return "uc" // UC网盘
	case 4:
		return "xunlei" // 迅雷网盘
	default:
		return "others"
	}
}

// extractPwdFromURL 从URL中提取pwd参数
func (p *YunsouAsyncPlugin) extractPwdFromURL(urlStr string) string {
	matches := pwdParamRegex.FindStringSubmatch(urlStr)
	if len(matches) >= 2 {
		return matches[1]
	}
	return ""
}

// doRequestWithRetry 带重试机制的HTTP请求
func (p *YunsouAsyncPlugin) doRequestWithRetry(req *http.Request, client *http.Client) (*http.Response, error) {
	var lastErr error
	
	for i := 0; i < maxRetries; i++ {
		if i > 0 {
			// 指数退避重试
			backoff := time.Duration(1<<uint(i-1)) * 200 * time.Millisecond
			time.Sleep(backoff)
		}
		
		// 克隆请求避免并发问题
		reqClone := req.Clone(req.Context())
		
		resp, err := client.Do(reqClone)
		if err == nil && resp.StatusCode == 200 {
			return resp, nil
		}
		
		if resp != nil {
			resp.Body.Close()
		}
		lastErr = err
	}
	
	return nil, fmt.Errorf("重试 %d 次后仍然失败: %w", maxRetries, lastErr)
}

