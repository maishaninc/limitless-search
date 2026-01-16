package ddys

import (
	"context"
	"fmt"
	"io"
	"log"
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

const (
	PluginName    = "ddys"
	DisplayName   = "低端影视"
	Description   = "低端影视 - 影视资源网盘链接搜索"
	BaseURL       = "https://ddys.pro"
	SearchPath    = "/?s=%s&post_type=post"
	UserAgent     = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
	MaxResults    = 50
	MaxConcurrency = 20
)

// DdysPlugin 低端影视插件
type DdysPlugin struct {
	*plugin.BaseAsyncPlugin
	debugMode    bool
	detailCache  sync.Map // 缓存详情页结果
	cacheTTL     time.Duration
}

// init 注册插件
func init() {
	plugin.RegisterGlobalPlugin(NewDdysPlugin())
}

// NewDdysPlugin 创建新的低端影视插件实例
func NewDdysPlugin() *DdysPlugin {
	debugMode := false // 生产环境关闭调试

	p := &DdysPlugin{
		BaseAsyncPlugin: plugin.NewBaseAsyncPlugin(PluginName, 1), // 标准网盘插件，启用Service层过滤
		debugMode:       debugMode,
		cacheTTL:        30 * time.Minute, // 详情页缓存30分钟
	}

	return p
}

// Name 插件名称
func (p *DdysPlugin) Name() string {
	return PluginName
}

// DisplayName 插件显示名称
func (p *DdysPlugin) DisplayName() string {
	return DisplayName
}

// Description 插件描述
func (p *DdysPlugin) Description() string {
	return Description
}

// Search 搜索接口
func (p *DdysPlugin) Search(keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	return p.searchImpl(&http.Client{Timeout: 30 * time.Second}, keyword, ext)
}

// searchImpl 搜索实现
func (p *DdysPlugin) searchImpl(client *http.Client, keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	if p.debugMode {
		log.Printf("[DDYS] 开始搜索: %s", keyword)
	}

	// 第一步：执行搜索获取结果列表
	searchResults, err := p.executeSearch(client, keyword)
	if err != nil {
		return nil, fmt.Errorf("[%s] 执行搜索失败: %w", p.Name(), err)
	}

	if p.debugMode {
		log.Printf("[DDYS] 搜索获取到 %d 个结果", len(searchResults))
	}

	// 第二步：并发获取详情页链接
	finalResults := p.fetchDetailLinks(client, searchResults, keyword)

	if p.debugMode {
		log.Printf("[DDYS] 最终获取到 %d 个有效结果", len(finalResults))
	}

	// 第三步：关键词过滤（标准网盘插件需要过滤）
	filteredResults := plugin.FilterResultsByKeyword(finalResults, keyword)
	
	if p.debugMode {
		log.Printf("[DDYS] 关键词过滤后剩余 %d 个结果", len(filteredResults))
	}

	return filteredResults, nil
}

// executeSearch 执行搜索请求
func (p *DdysPlugin) executeSearch(client *http.Client, keyword string) ([]model.SearchResult, error) {
	// 构建搜索URL
	searchURL := fmt.Sprintf("%s%s", BaseURL, fmt.Sprintf(SearchPath, url.QueryEscape(keyword)))

	// 创建带超时的上下文
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", searchURL, nil)
	if err != nil {
		return nil, fmt.Errorf("[%s] 创建搜索请求失败: %w", p.Name(), err)
	}

	// 设置完整的请求头
	req.Header.Set("User-Agent", UserAgent)
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
	req.Header.Set("Connection", "keep-alive")
	req.Header.Set("Upgrade-Insecure-Requests", "1")
	req.Header.Set("Cache-Control", "max-age=0")
	req.Header.Set("Referer", BaseURL+"/")

	resp, err := p.doRequestWithRetry(req, client)
	if err != nil {
		return nil, fmt.Errorf("[%s] 搜索请求失败: %w", p.Name(), err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("[%s] 搜索请求HTTP状态错误: %d", p.Name(), resp.StatusCode)
	}

	// 解析HTML提取搜索结果
	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("[%s] 解析搜索结果HTML失败: %w", p.Name(), err)
	}

	return p.parseSearchResults(doc)
}

// doRequestWithRetry 带重试机制的HTTP请求
func (p *DdysPlugin) doRequestWithRetry(req *http.Request, client *http.Client) (*http.Response, error) {
	maxRetries := 3
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
	
	return nil, fmt.Errorf("[%s] 重试 %d 次后仍然失败: %w", p.Name(), maxRetries, lastErr)
}

// parseSearchResults 解析搜索结果HTML
func (p *DdysPlugin) parseSearchResults(doc *goquery.Document) ([]model.SearchResult, error) {
	var results []model.SearchResult

	// 查找搜索结果项: article[class^="post-"]
	doc.Find("article[class*='post-']").Each(func(i int, s *goquery.Selection) {
		if len(results) >= MaxResults {
			return
		}

		result := p.parseResultItem(s, i+1)
		if result != nil {
			results = append(results, *result)
		}
	})

	if p.debugMode {
		log.Printf("[DDYS] 解析到 %d 个原始结果", len(results))
	}

	return results, nil
}

// parseResultItem 解析单个搜索结果项
func (p *DdysPlugin) parseResultItem(s *goquery.Selection, index int) *model.SearchResult {
	// 提取文章ID
	articleClass, _ := s.Attr("class")
	postID := p.extractPostID(articleClass)
	if postID == "" {
		postID = fmt.Sprintf("unknown-%d", index)
	}

	// 提取标题和链接
	linkEl := s.Find(".post-title a")
	if linkEl.Length() == 0 {
		if p.debugMode {
			log.Printf("[DDYS] 跳过无标题链接的结果")
		}
		return nil
	}

	// 提取标题
	title := strings.TrimSpace(linkEl.Text())
	if title == "" {
		return nil
	}

	// 提取详情页链接
	detailURL, _ := linkEl.Attr("href")
	if detailURL == "" {
		if p.debugMode {
			log.Printf("[DDYS] 跳过无链接的结果: %s", title)
		}
		return nil
	}

	// 提取发布时间
	publishTime := p.extractPublishTime(s)

	// 提取分类
	category := p.extractCategory(s)

	// 提取简介
	content := p.extractContent(s)

	// 构建初始结果对象（详情页链接稍后获取）
	result := model.SearchResult{
		Title:     title,
		Content:   fmt.Sprintf("分类：%s\n%s", category, content),
		Channel:   "", // 插件搜索结果必须为空字符串（按开发指南要求）
		MessageID: fmt.Sprintf("%s-%s-%d", p.Name(), postID, index),
		UniqueID:  fmt.Sprintf("%s-%s-%d", p.Name(), postID, index),
		Datetime:  publishTime,
		Links:     []model.Link{}, // 先为空，详情页处理后添加
		Tags:      []string{category},
	}

	// 添加详情页URL到临时字段（用于后续处理）
	result.Content += fmt.Sprintf("\n详情页: %s", detailURL)

	if p.debugMode {
		log.Printf("[DDYS] 解析结果: %s (%s)", title, category)
	}

	return &result
}

// extractPostID 从文章class中提取文章ID
func (p *DdysPlugin) extractPostID(articleClass string) string {
	// 匹配 post-{数字} 格式
	re := regexp.MustCompile(`post-(\d+)`)
	matches := re.FindStringSubmatch(articleClass)
	if len(matches) > 1 {
		return matches[1]
	}
	return ""
}

// extractPublishTime 提取发布时间
func (p *DdysPlugin) extractPublishTime(s *goquery.Selection) time.Time {
	timeEl := s.Find(".meta_date time.entry-date")
	if timeEl.Length() == 0 {
		return time.Now()
	}

	datetime, exists := timeEl.Attr("datetime")
	if !exists {
		return time.Now()
	}

	// 解析ISO 8601格式时间
	if t, err := time.Parse(time.RFC3339, datetime); err == nil {
		return t
	}

	return time.Now()
}

// extractCategory 提取分类
func (p *DdysPlugin) extractCategory(s *goquery.Selection) string {
	categoryEl := s.Find(".meta_categories .cat-links a")
	if categoryEl.Length() > 0 {
		return strings.TrimSpace(categoryEl.Text())
	}
	return "未分类"
}

// extractContent 提取内容简介
func (p *DdysPlugin) extractContent(s *goquery.Selection) string {
	contentEl := s.Find(".entry-content")
	if contentEl.Length() > 0 {
		content := strings.TrimSpace(contentEl.Text())
		// 限制长度
		if len(content) > 200 {
			content = content[:200] + "..."
		}
		return content
	}
	return ""
}

// fetchDetailLinks 并发获取详情页链接
func (p *DdysPlugin) fetchDetailLinks(client *http.Client, searchResults []model.SearchResult, keyword string) []model.SearchResult {
	if len(searchResults) == 0 {
		return []model.SearchResult{}
	}

	// 使用通道控制并发数
	semaphore := make(chan struct{}, MaxConcurrency)
	var wg sync.WaitGroup
	resultsChan := make(chan model.SearchResult, len(searchResults))

	for _, result := range searchResults {
		wg.Add(1)
		go func(r model.SearchResult) {
			defer wg.Done()
			semaphore <- struct{}{} // 获取信号量
			defer func() { <-semaphore }() // 释放信号量

			// 从Content中提取详情页URL
			detailURL := p.extractDetailURLFromContent(r.Content)
			if detailURL == "" {
				if p.debugMode {
					log.Printf("[DDYS] 跳过无详情页URL的结果: %s", r.Title)
				}
				return
			}

			// 获取详情页链接
			links := p.fetchDetailPageLinks(client, detailURL)
			if len(links) > 0 {
				r.Links = links
				// 清理Content中的详情页URL
				r.Content = p.cleanContent(r.Content)
				resultsChan <- r
			} else if p.debugMode {
				log.Printf("[DDYS] 详情页无有效链接: %s", r.Title)
			}
		}(result)
	}

	// 等待所有goroutine完成
	go func() {
		wg.Wait()
		close(resultsChan)
	}()

	// 收集结果
	var finalResults []model.SearchResult
	for result := range resultsChan {
		finalResults = append(finalResults, result)
	}

	return finalResults
}

// extractDetailURLFromContent 从Content中提取详情页URL
func (p *DdysPlugin) extractDetailURLFromContent(content string) string {
	lines := strings.Split(content, "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "详情页: ") {
			return strings.TrimPrefix(line, "详情页: ")
		}
	}
	return ""
}

// cleanContent 清理Content，移除详情页URL行
func (p *DdysPlugin) cleanContent(content string) string {
	lines := strings.Split(content, "\n")
	var cleanedLines []string
	for _, line := range lines {
		if !strings.HasPrefix(line, "详情页: ") {
			cleanedLines = append(cleanedLines, line)
		}
	}
	return strings.Join(cleanedLines, "\n")
}

// fetchDetailPageLinks 获取详情页的网盘链接
func (p *DdysPlugin) fetchDetailPageLinks(client *http.Client, detailURL string) []model.Link {
	// 检查缓存
	if cached, found := p.detailCache.Load(detailURL); found {
		if links, ok := cached.([]model.Link); ok {
			if p.debugMode {
				log.Printf("[DDYS] 使用缓存的详情页链接: %s", detailURL)
			}
			return links
		}
	}

	// 创建带超时的上下文
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", detailURL, nil)
	if err != nil {
		if p.debugMode {
			log.Printf("[DDYS] 创建详情页请求失败: %v", err)
		}
		return []model.Link{}
	}

	// 设置请求头
	req.Header.Set("User-Agent", UserAgent)
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
	req.Header.Set("Referer", BaseURL+"/")

	resp, err := client.Do(req)
	if err != nil {
		if p.debugMode {
			log.Printf("[DDYS] 详情页请求失败: %v", err)
		}
		return []model.Link{}
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		if p.debugMode {
			log.Printf("[DDYS] 详情页HTTP状态错误: %d", resp.StatusCode)
		}
		return []model.Link{}
	}

	// 读取响应体
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		if p.debugMode {
			log.Printf("[DDYS] 读取详情页响应失败: %v", err)
		}
		return []model.Link{}
	}

	// 解析网盘链接
	links := p.parseNetworkDiskLinks(string(body))

	// 缓存结果
	if len(links) > 0 {
		p.detailCache.Store(detailURL, links)
	}

	if p.debugMode {
		log.Printf("[DDYS] 从详情页提取到 %d 个链接: %s", len(links), detailURL)
	}

	return links
}

// parseNetworkDiskLinks 解析网盘链接
func (p *DdysPlugin) parseNetworkDiskLinks(htmlContent string) []model.Link {
	var links []model.Link

	// 定义网盘链接匹配模式
	patterns := []struct {
		name    string
		pattern string
		urlType string
	}{
		{"夸克网盘", `\(夸克[^)]*\)[：:]\s*<a[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([^<]+)</a>`, "quark"},
		{"百度网盘", `\(百度[^)]*\)[：:]\s*<a[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([^<]+)</a>`, "baidu"},
		{"阿里云盘", `\(阿里[^)]*\)[：:]\s*<a[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([^<]+)</a>`, "aliyun"},
		{"天翼云盘", `\(天翼[^)]*\)[：:]\s*<a[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([^<]+)</a>`, "tianyi"},
		{"迅雷网盘", `\(迅雷[^)]*\)[：:]\s*<a[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([^<]+)</a>`, "xunlei"},
		// 通用模式
		{"通用网盘", `<a[^>]*href\s*=\s*["'](https?://[^"']*(?:pan|drive|cloud)[^"']*)["'][^>]*>([^<]+)</a>`, "others"},
	}

	// 去重用的map
	seen := make(map[string]bool)

	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern.pattern)
		matches := re.FindAllStringSubmatch(htmlContent, -1)

		for _, match := range matches {
			if len(match) >= 3 {
				url := match[1]
				
				// 去重
				if seen[url] {
					continue
				}
				seen[url] = true

				// 确定网盘类型
				urlType := p.determineCloudType(url)
				if urlType == "others" {
					urlType = pattern.urlType
				}

				// 提取可能的提取码
				password := p.extractPassword(htmlContent, url)

				link := model.Link{
					Type:     urlType,
					URL:      url,
					Password: password,
				}

				links = append(links, link)

				if p.debugMode {
					log.Printf("[DDYS] 找到链接: %s (%s)", url, urlType)
				}
			}
		}
	}

	return links
}

// extractPassword 提取网盘提取码
func (p *DdysPlugin) extractPassword(content string, panURL string) string {
	// 常见提取码模式
	patterns := []string{
		`提取[码密][：:]?\s*([A-Za-z0-9]{4,8})`,
		`密码[：:]?\s*([A-Za-z0-9]{4,8})`,
		`[码密][：:]?\s*([A-Za-z0-9]{4,8})`,
		`([A-Za-z0-9]{4,8})\s*[是为]?提取[码密]`,
	}

	// 在网盘链接附近搜索提取码
	urlIndex := strings.Index(content, panURL)
	if urlIndex == -1 {
		return ""
	}

	// 搜索范围：链接前后200个字符
	start := urlIndex - 200
	if start < 0 {
		start = 0
	}
	end := urlIndex + len(panURL) + 200
	if end > len(content) {
		end = len(content)
	}
	
	searchArea := content[start:end]

	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		matches := re.FindStringSubmatch(searchArea)
		if len(matches) > 1 {
			return matches[1]
		}
	}

	return ""
}

// determineCloudType 根据URL自动识别网盘类型（按开发指南完整列表）
func (p *DdysPlugin) determineCloudType(url string) string {
	switch {
	case strings.Contains(url, "pan.quark.cn"):
		return "quark"
	case strings.Contains(url, "drive.uc.cn"):
		return "uc"
	case strings.Contains(url, "pan.baidu.com"):
		return "baidu"
	case strings.Contains(url, "aliyundrive.com") || strings.Contains(url, "alipan.com"):
		return "aliyun"
	case strings.Contains(url, "pan.xunlei.com"):
		return "xunlei"
	case strings.Contains(url, "cloud.189.cn"):
		return "tianyi"
	case strings.Contains(url, "caiyun.139.com"):
		return "mobile"
	case strings.Contains(url, "115.com"):
		return "115"
	case strings.Contains(url, "123pan.com"):
		return "123"
	case strings.Contains(url, "mypikpak.com"):
		return "pikpak"
	case strings.Contains(url, "lanzou"):
		return "lanzou"
	default:
		return "others"
	}
}