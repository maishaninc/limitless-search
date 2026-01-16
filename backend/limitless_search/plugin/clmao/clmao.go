package clmao

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/PuerkitoBio/goquery"
	"pansou/model"
	"pansou/plugin"
)

// 常量定义
const (
	// 基础URL
	BaseURL = "https://www.8800492.xyz"
	
	// 搜索URL格式：/search-{keyword}-{category}-{sort}-{page}.html
	SearchURL = BaseURL + "/search-%s-0-2-%d.html"
	
	// 默认参数
	MaxRetries = 3
	TimeoutSeconds = 30
	
	// 并发控制参数
	MaxConcurrency = 10 // 最大并发数
	MaxPages = 5        // 最大搜索页数
)

// 预编译的正则表达式
var (
	// 磁力链接正则
	magnetLinkRegex = regexp.MustCompile(`magnet:\?xt=urn:btih:[0-9a-fA-F]{40}[^"'\s]*`)
	
	// 文件大小正则
	fileSizeRegex = regexp.MustCompile(`(\d+\.?\d*)\s*(B|KB|MB|GB|TB)`)
	
	// 数字提取正则
	numberRegex = regexp.MustCompile(`\d+`)
)

// 常用UA列表
var userAgents = []string{
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
}

// ClmaoPlugin 磁力猫搜索插件
type ClmaoPlugin struct {
	*plugin.BaseAsyncPlugin
}

// NewClmaoPlugin 创建新的磁力猫插件实例
func NewClmaoPlugin() *ClmaoPlugin {
	return &ClmaoPlugin{
		BaseAsyncPlugin: plugin.NewBaseAsyncPluginWithFilter("clmao", 3, true),
	}
}

// Name 返回插件名称
func (p *ClmaoPlugin) Name() string {
	return "clmao"
}

// DisplayName 返回插件显示名称
func (p *ClmaoPlugin) DisplayName() string {
	return "磁力猫"
}

// Description 返回插件描述
func (p *ClmaoPlugin) Description() string {
	return "磁力猫 - 磁力链接搜索引擎"
}

// Search 执行搜索并返回结果（兼容性方法）
func (p *ClmaoPlugin) Search(keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	result, err := p.SearchWithResult(keyword, ext)
	if err != nil {
		return nil, err
	}
	return result.Results, nil
}

// SearchWithResult 执行搜索并返回包含IsFinal标记的结果
func (p *ClmaoPlugin) SearchWithResult(keyword string, ext map[string]interface{}) (model.PluginSearchResult, error) {
	return p.AsyncSearchWithResult(keyword, p.searchImpl, p.MainCacheKey, ext)
}

// searchImpl 实际的搜索实现
func (p *ClmaoPlugin) searchImpl(client *http.Client, keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	// 1. 首先搜索第一页
	firstPageResults, err := p.searchPage(client, keyword, 1)
	if err != nil {
		return nil, fmt.Errorf("[%s] 搜索第一页失败: %w", p.Name(), err)
	}
	
	// 存储所有结果
	var allResults []model.SearchResult
	allResults = append(allResults, firstPageResults...)
	
	// 2. 并发搜索其他页面（第2页到第5页）
	if MaxPages > 1 {
		var wg sync.WaitGroup
		var mu sync.Mutex
		
		// 使用信号量控制并发数
		semaphore := make(chan struct{}, MaxConcurrency)
		
		// 存储每页结果
		pageResults := make(map[int][]model.SearchResult)
		
		for page := 2; page <= MaxPages; page++ {
			wg.Add(1)
			go func(pageNum int) {
				defer wg.Done()
				
				// 获取信号量
				semaphore <- struct{}{}
				defer func() { <-semaphore }()
				
				// 添加小延迟避免过于频繁的请求
				time.Sleep(time.Duration(pageNum%3) * 100 * time.Millisecond)
				
				currentPageResults, err := p.searchPage(client, keyword, pageNum)
				if err == nil && len(currentPageResults) > 0 {
					mu.Lock()
					pageResults[pageNum] = currentPageResults
					mu.Unlock()
				}
			}(page)
		}
		
		wg.Wait()
		
		// 按页码顺序合并所有页面的结果
		for page := 2; page <= MaxPages; page++ {
			if results, exists := pageResults[page]; exists {
				allResults = append(allResults, results...)
			}
		}
	}
	
	
	// 3. 关键词过滤
	searchKeyword := keyword
	if searchParam, ok := ext["search"]; ok {
		if searchStr, ok := searchParam.(string); ok && searchStr != "" {
			searchKeyword = searchStr
		}
	}
	return plugin.FilterResultsByKeyword(allResults, searchKeyword), nil
}

// searchPage 搜索指定页面
func (p *ClmaoPlugin) searchPage(client *http.Client, keyword string, page int) ([]model.SearchResult, error) {
	// URL编码关键词
	encodedKeyword := url.QueryEscape(keyword)
	searchURL := fmt.Sprintf(SearchURL, encodedKeyword, page)
	
	// 创建带超时的上下文
	ctx, cancel := context.WithTimeout(context.Background(), TimeoutSeconds*time.Second)
	defer cancel()
	
	// 创建请求
	req, err := http.NewRequestWithContext(ctx, "GET", searchURL, nil)
	if err != nil {
		return nil, fmt.Errorf("[%s] 创建请求失败: %w", p.Name(), err)
	}
	
	// 设置请求头
	p.setRequestHeaders(req)
	
	// 发送HTTP请求
	resp, err := p.doRequestWithRetry(req, client)
	if err != nil {
		return nil, fmt.Errorf("[%s] 搜索请求失败: %w", p.Name(), err)
	}
	defer resp.Body.Close()
	
	// 检查状态码
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("[%s] 请求返回状态码: %d", p.Name(), resp.StatusCode)
	}
	
	// 读取响应体内容
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("[%s] 读取响应失败: %w", p.Name(), err)
	}
	
	// 解析HTML
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(string(body)))
	if err != nil {
		return nil, fmt.Errorf("[%s] HTML解析失败: %w", p.Name(), err)
	}
	
	// 提取搜索结果
	return p.extractSearchResults(doc), nil
}

// extractSearchResults 提取搜索结果
func (p *ClmaoPlugin) extractSearchResults(doc *goquery.Document) []model.SearchResult {
	var results []model.SearchResult
	
	// 查找所有搜索结果
	doc.Find(".tbox .ssbox").Each(func(i int, s *goquery.Selection) {
		result := p.parseSearchResult(s)
		if result.Title != "" && len(result.Links) > 0 {
			results = append(results, result)
		}
	})
	
	return results
}

// parseSearchResult 解析单个搜索结果
func (p *ClmaoPlugin) parseSearchResult(s *goquery.Selection) model.SearchResult {
	result := model.SearchResult{
		Channel:  "", // 插件搜索结果必须为空字符串
		Datetime: time.Now(),
	}
	
	// 提取标题
	titleSection := s.Find(".title h3")
	titleLink := titleSection.Find("a")
	title := strings.TrimSpace(titleLink.Text())
	result.Title = p.cleanTitle(title)
	
	// 提取分类作为标签
	category := strings.TrimSpace(titleSection.Find("span").Text())
	if category != "" {
		result.Tags = []string{p.mapCategory(category)}
	}
	
	// 提取磁力链接和元数据
	p.extractMagnetInfo(s, &result)
	
	// 提取文件列表作为内容
	p.extractFileList(s, &result)
	
	// 生成唯一ID
	result.UniqueID = fmt.Sprintf("%s-%d", p.Name(), time.Now().UnixNano())
	
	return result
}

// extractMagnetInfo 提取磁力链接和元数据
func (p *ClmaoPlugin) extractMagnetInfo(s *goquery.Selection, result *model.SearchResult) {
	sbar := s.Find(".sbar")
	
	// 提取磁力链接
	magnetLink, _ := sbar.Find("a[href^='magnet:']").Attr("href")
	if magnetLink != "" {
		link := model.Link{
			Type: "magnet",
			URL:  magnetLink,
		}
		result.Links = []model.Link{link}
	}
	
	// 提取元数据并添加到内容中
	var metadata []string
	sbar.Find("span").Each(func(i int, span *goquery.Selection) {
		text := strings.TrimSpace(span.Text())
		
		if strings.Contains(text, "添加时间:") || 
		   strings.Contains(text, "大小:") || 
		   strings.Contains(text, "热度:") {
			metadata = append(metadata, text)
		}
	})
	
	if len(metadata) > 0 {
		if result.Content != "" {
			result.Content += "\n\n"
		}
		result.Content += strings.Join(metadata, " | ")
	}
}

// extractFileList 提取文件列表
func (p *ClmaoPlugin) extractFileList(s *goquery.Selection, result *model.SearchResult) {
	var files []string
	
	s.Find(".slist ul li").Each(func(i int, li *goquery.Selection) {
		text := strings.TrimSpace(li.Text())
		if text != "" {
			files = append(files, text)
		}
	})
	
	if len(files) > 0 {
		if result.Content != "" {
			result.Content += "\n\n文件列表:\n"
		} else {
			result.Content = "文件列表:\n"
		}
		result.Content += strings.Join(files, "\n")
	}
}

// mapCategory 映射分类
func (p *ClmaoPlugin) mapCategory(category string) string {
	switch category {
	case "[影视]":
		return "video"
	case "[音乐]":
		return "music"
	case "[图像]":
		return "image"
	case "[文档书籍]":
		return "document"
	case "[压缩文件]":
		return "archive"
	case "[安装包]":
		return "software"
	case "[其他]":
		return "others"
	default:
		return "others"
	}
}

// cleanTitle 清理标题
func (p *ClmaoPlugin) cleanTitle(title string) string {
	// 移除【】之间的广告内容
	title = regexp.MustCompile(`【[^】]*】`).ReplaceAllString(title, "")
	// 移除[]之间的内容（如有需要）
	title = regexp.MustCompile(`\[[^\]]*\]`).ReplaceAllString(title, "")
	// 移除多余的空格
	title = regexp.MustCompile(`\s+`).ReplaceAllString(title, " ")
	return strings.TrimSpace(title)
}

// setRequestHeaders 设置请求头
func (p *ClmaoPlugin) setRequestHeaders(req *http.Request) {
	// 使用第一个稳定的UA
	ua := userAgents[0]
	req.Header.Set("User-Agent", ua)
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
	// 暂时不使用压缩编码，避免解压问题
	// req.Header.Set("Accept-Encoding", "gzip, deflate")
	req.Header.Set("Connection", "keep-alive")
	req.Header.Set("Upgrade-Insecure-Requests", "1")
	req.Header.Set("Cache-Control", "no-cache")
	req.Header.Set("Pragma", "no-cache")
}

// doRequestWithRetry 带重试的HTTP请求
func (p *ClmaoPlugin) doRequestWithRetry(req *http.Request, client *http.Client) (*http.Response, error) {
	var lastErr error
	
	for i := 0; i < MaxRetries; i++ {
		resp, err := client.Do(req)
		if err == nil {
			return resp, nil
		}
		
		lastErr = err
		if i < MaxRetries-1 {
			time.Sleep(time.Duration(i+1) * time.Second)
		}
	}
	
	return nil, fmt.Errorf("请求失败，已重试%d次: %w", MaxRetries, lastErr)
}



// init 注册插件
func init() {
	plugin.RegisterGlobalPlugin(NewClmaoPlugin())
}