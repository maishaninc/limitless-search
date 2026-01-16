package panwiki

import (
	"fmt"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/PuerkitoBio/goquery"
	"pansou/model"
	"pansou/plugin"
)

const (
	PrimaryBaseURL   = "https://www.panwiki.com"
	BackupBaseURL    = "https://pan666.net"
	SearchPath       = "/search.php?mod=forum&srchtxt=%s&searchsubmit=yes&orderby=lastpost"
	UserAgent        = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
	MaxConcurrency   = 40 // 详情页最大并发数
	MaxPages         = 2  // 最大搜索页数
)

// PanwikiPlugin Panwiki插件结构
type PanwikiPlugin struct {
	*plugin.BaseAsyncPlugin
	detailCache sync.Map // 详情页缓存
	cacheTTL    time.Duration
	debugMode   bool     // debug模式开关
	currentBaseURL string // 当前使用的域名
}

// NewPanwikiPlugin 创建Panwiki插件实例
func NewPanwikiPlugin() *PanwikiPlugin {
	
	// 检查调试模式
	debugMode := false
	
	p := &PanwikiPlugin{
		BaseAsyncPlugin: plugin.NewBaseAsyncPluginWithFilter("panwiki", 3, true),
		cacheTTL:       30 * time.Minute,
		debugMode:      debugMode,
		currentBaseURL: PrimaryBaseURL, // 默认使用主域名
	}
	
	if p.debugMode {
		log.Printf("[Panwiki] Debug模式已启用")
	}
	
	return p
}

// getSearchURL 获取当前使用的搜索URL
func (p *PanwikiPlugin) getSearchURL(keyword string, page int) string {
	var searchURL string
	if page <= 1 {
		searchURL = fmt.Sprintf(p.currentBaseURL+SearchPath, url.QueryEscape(keyword))
	} else {
		searchURL = fmt.Sprintf(p.currentBaseURL+SearchPath+"&page=%d", url.QueryEscape(keyword), page)
	}
	return searchURL
}

// switchToBackupDomain 切换到备用域名
func (p *PanwikiPlugin) switchToBackupDomain() {
	if p.currentBaseURL == PrimaryBaseURL {
		p.currentBaseURL = BackupBaseURL
		if p.debugMode {
			log.Printf("[Panwiki] 切换到备用域名: %s", p.currentBaseURL)
		}
	}
}

// searchImpl 实现搜索逻辑
func (p *PanwikiPlugin) searchImpl(client *http.Client, keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	// 第一页搜索
	firstPageResults, err := p.searchPage(client, keyword, 1)
	if err != nil {
		return nil, fmt.Errorf("搜索第一页失败: %w", err)
	}

	var allResults []model.SearchResult
	allResults = append(allResults, firstPageResults...)

	// 多页并发搜索
	if MaxPages > 1 {
		var wg sync.WaitGroup
		var mu sync.Mutex
		semaphore := make(chan struct{}, MaxConcurrency)
		pageResults := make(map[int][]model.SearchResult)

		for page := 2; page <= MaxPages; page++ {
			wg.Add(1)
			go func(pageNum int) {
				defer wg.Done()
				semaphore <- struct{}{}
				defer func() { <-semaphore }()
				
				// 添加延时避免请求过快
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

		// 按页码顺序添加结果
		for page := 2; page <= MaxPages; page++ {
			if results, exists := pageResults[page]; exists {
				allResults = append(allResults, results...)
			}
		}
	}

	// 获取详情页链接
	if p.debugMode {
		log.Printf("[Panwiki] 开始获取详情页链接前，结果数: %d", len(allResults))
	}
	
	p.enrichWithDetailLinks(client, allResults, keyword)
	
	if p.debugMode {
		log.Printf("[Panwiki] 获取详情页链接后，结果数: %d", len(allResults))
		for i, result := range allResults {
			log.Printf("[Panwiki] 返回前检查 - 结果#%d: 标题=%s, 链接数=%d", i+1, result.Title, len(result.Links))
			log.Printf("[Panwiki] 返回前检查 - 结果#%d: 链接=%s", i+1, result.Links)
		}
	}

	// 进行关键词过滤
	if p.debugMode {
		log.Printf("[Panwiki] 开始关键词过滤，关键词: %s", keyword)
	}
	
	filteredResults := plugin.FilterResultsByKeyword(allResults, keyword)
	
	if p.debugMode {
		log.Printf("[Panwiki] 关键词过滤完成，过滤前: %d，过滤后: %d", len(allResults), len(filteredResults))
		for i, result := range filteredResults {
			log.Printf("[Panwiki] 最终结果%d: MessageID=%s, UniqueID=%s, 标题=%s, 链接数=%d", i+1, result.MessageID, result.UniqueID, result.Title, len(result.Links))
		}
		log.Printf("[Panwiki] 🚀 插件返回结果总数: %d", len(filteredResults))
	}

	return filteredResults, nil
}

// searchPage 搜索指定页面
func (p *PanwikiPlugin) searchPage(client *http.Client, keyword string, page int) ([]model.SearchResult, error) {
	// Step 1: 发起初始搜索请求获取重定向URL
	initialURL := p.getSearchURL(keyword, page)
	
	req, err := http.NewRequest("GET", initialURL, nil)
	if err != nil {
		return nil, fmt.Errorf("创建初始请求失败: %w", err)
	}
	
	p.setRequestHeaders(req)
	
	// 不自动跟随重定向
	client.CheckRedirect = func(req *http.Request, via []*http.Request) error {
		return http.ErrUseLastResponse
	}
	
	resp, err := client.Do(req)
	if err != nil {
		// 如果主域名失败，尝试切换到备用域名
		if p.currentBaseURL == PrimaryBaseURL {
			if p.debugMode {
				log.Printf("[Panwiki] 主域名请求失败，尝试备用域名: %v", err)
			}
			p.switchToBackupDomain()
			
			// 重新构建URL并重试
			initialURL = p.getSearchURL(keyword, page)
			req, err = http.NewRequest("GET", initialURL, nil)
			if err != nil {
				return nil, fmt.Errorf("创建备用域名请求失败: %w", err)
			}
			p.setRequestHeaders(req)
			
			resp, err = client.Do(req)
			if err != nil {
				return nil, fmt.Errorf("备用域名请求也失败: %w", err)
			}
		} else {
			return nil, fmt.Errorf("初始请求失败: %w", err)
		}
	}
	defer resp.Body.Close()
	
	// 重置重定向策略
	client.CheckRedirect = nil
	
	// 获取重定向URL
	location := resp.Header.Get("Location")
	if location == "" {
		return nil, fmt.Errorf("未获取到重定向URL")
	}
	
	// 构建完整的重定向URL
	var searchURL string
	if strings.HasPrefix(location, "http") {
		searchURL = location
	} else {
		searchURL = p.currentBaseURL + "/" + strings.TrimPrefix(location, "/")
	}
	
	// 如果不是第一页，修改URL中的page参数
	if page > 1 {
		if strings.Contains(searchURL, "searchid=") {
			// 提取searchid并构建分页URL
			re := regexp.MustCompile(`searchid=(\d+)`)
			matches := re.FindStringSubmatch(searchURL)
			if len(matches) > 1 {
				searchid := matches[1]
				searchURL = fmt.Sprintf("%s/search.php?mod=forum&searchid=%s&orderby=lastpost&ascdesc=desc&searchsubmit=yes&page=%d", p.currentBaseURL, searchid, page)
			}
		}
	}
	
	// Step 2: 请求实际的搜索结果页面
	req2, err := http.NewRequest("GET", searchURL, nil)
	if err != nil {
		return nil, fmt.Errorf("创建搜索请求失败: %w", err)
	}
	
	p.setRequestHeaders(req2)
	
	resp2, err := client.Do(req2)
	if err != nil {
		return nil, fmt.Errorf("搜索请求失败: %w", err)
	}
	defer resp2.Body.Close()
	
	if resp2.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("搜索请求返回状态码: %d", resp2.StatusCode)
	}
	
	// 解析搜索结果
	doc, err := goquery.NewDocumentFromReader(resp2.Body)
	if err != nil {
		return nil, fmt.Errorf("解析HTML失败: %w", err)
	}
	
	return p.extractSearchResults(doc), nil
}

// setRequestHeaders 设置请求头
func (p *PanwikiPlugin) setRequestHeaders(req *http.Request) {
	req.Header.Set("User-Agent", UserAgent)
	req.Header.Set("Referer", p.currentBaseURL+"/")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
	req.Header.Set("Cache-Control", "no-cache")
	req.Header.Set("Pragma", "no-cache")
}

// extractSearchResults 提取搜索结果
func (p *PanwikiPlugin) extractSearchResults(doc *goquery.Document) []model.SearchResult {
	var results []model.SearchResult
	
	doc.Find(".slst ul li.pbw").Each(func(i int, s *goquery.Selection) {
		result := p.parseSearchResult(s)
		if result.Title != "" {
			results = append(results, result)
			if p.debugMode {
				log.Printf("[Panwiki] 解析到结果 #%d: 标题=%s", i+1, result.Title)
			}
		} else {
			if p.debugMode {
				log.Printf("[Panwiki] 第%d项解析失败，标题为空", i+1)
			}
		}
	})
	
	if p.debugMode {
		log.Printf("[Panwiki] 共解析出 %d 个有效搜索结果", len(results))
	}
	
	return results
}

// parseSearchResult 解析单个搜索结果
func (p *PanwikiPlugin) parseSearchResult(s *goquery.Selection) model.SearchResult {
	// 提取标题和详情页链接
	titleLink := s.Find("h3.xs3 a").First()
	title := p.cleanTitle(titleLink.Text())
	detailPath, _ := titleLink.Attr("href")
	
	var detailURL string
	if detailPath != "" {
		if strings.HasPrefix(detailPath, "http") {
			detailURL = detailPath
		} else {
			detailURL = p.currentBaseURL + "/" + strings.TrimPrefix(detailPath, "/")
		}
	}
	
	// 提取内容摘要
	var content string
	s.Find("p").Each(func(i int, p *goquery.Selection) {
		if i == 1 { // 第二个p标签通常包含内容摘要
			content = strings.TrimSpace(p.Text())
		}
	})
	
	// 提取统计信息（回复数和查看数）
	statsText := s.Find("p.xg1").First().Text()
	var replyCount, viewCount int
	parseStats(statsText, &replyCount, &viewCount)
	
	// 提取时间、作者、分类信息
	var publishTime, author, category string
	lastP := s.Find("p").Last()
	spans := lastP.Find("span")
	if spans.Length() >= 3 {
		publishTime = strings.TrimSpace(spans.Eq(0).Text())
		author = strings.TrimSpace(spans.Eq(1).Find("a").Text())
		category = strings.TrimSpace(spans.Eq(2).Find("a").Text())
	}
	
	// 转换时间格式
	parsedTime := parseTime(publishTime)
	
	// 将详情页URL、作者、分类等信息包含在Content中
	enrichedContent := content
	if author != "" || category != "" {
		enrichedContent = fmt.Sprintf("%s | 作者: %s | 分类: %s | 详情: %s", content, author, category, detailURL)
	} else if detailURL != "" {
		enrichedContent = fmt.Sprintf("%s | 详情: %s", content, detailURL)
	}
	
	// 从详情页URL中提取帖子ID
	var postID string
	if detailURL != "" {
		re := regexp.MustCompile(`tid=(\d+)`)
		matches := re.FindStringSubmatch(detailURL)
		if len(matches) > 1 {
			postID = matches[1]
		}
	}
	
	// 如果没有找到帖子ID，使用时间戳
	if postID == "" {
		postID = fmt.Sprintf("%d", time.Now().UnixNano())
	}
	
	return model.SearchResult{
		MessageID: fmt.Sprintf("%s-%s", p.Name(), postID),
		UniqueID:  fmt.Sprintf("%s-%s", p.Name(), postID),
		Title:     title,
		Content:   enrichedContent,
		Datetime:  parsedTime,
		Links:     []model.Link{}, // 初始为空，后续从详情页获取
		Channel:   "",
	}
}

// cleanTitle 清理标题中的广告内容
func (p *PanwikiPlugin) cleanTitle(title string) string {
	title = strings.TrimSpace(title)
	
	// 移除【】和[]中的广告内容（保留有用的分类信息）
	// 只移除明显的广告，保留如【国漫】这样的分类标签
	adPatterns := []string{
		`【[^】]*(?:论坛|网站|\.com|\.net|\.cn)[^】]*】`,
		`\[[^\]]*(?:论坛|网站|\.com|\.net|\.cn)[^\]]*\]`,
	}
	
	for _, pattern := range adPatterns {
		re := regexp.MustCompile(pattern)
		title = re.ReplaceAllString(title, "")
	}
	
	return strings.TrimSpace(title)
}

// enrichWithDetailLinks 并发获取详情页链接
func (p *PanwikiPlugin) enrichWithDetailLinks(client *http.Client, results []model.SearchResult, keyword string) {
	if len(results) == 0 {
		if p.debugMode {
			log.Printf("[Panwiki] 没有结果需要获取详情页链接")
		}
		return
	}
	
	if p.debugMode {
		log.Printf("[Panwiki] 开始为 %d 个结果获取详情页链接", len(results))
	}
	
	var wg sync.WaitGroup
	semaphore := make(chan struct{}, MaxConcurrency)
	
	for i := range results {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()
			semaphore <- struct{}{}
			defer func() { <-semaphore }()
			
			// 添加延时避免请求过快
			time.Sleep(time.Duration(index%3) * 50 * time.Millisecond)
			
			// 从Content中提取详情页URL
			detailURL := p.extractDetailURLFromContent(results[index].Content)
			if detailURL != "" {
				if p.debugMode {
					log.Printf("[Panwiki] 结果#%d 提取到详情页URL: %s", index+1, detailURL)
				}
				links := p.fetchDetailPageLinksWithKeyword(client, detailURL, keyword)
				if len(links) > 0 {
					results[index].Links = append(results[index].Links, links...)
					if p.debugMode {
						log.Printf("[Panwiki] 结果#%d 从详情页获取到 %d 个链接", index+1, len(links))
					}
				} else {
					if p.debugMode {
						log.Printf("[Panwiki] 结果#%d 详情页未获取到有效链接", index+1)
					}
				}
			} else {
				if p.debugMode {
					log.Printf("[Panwiki] 结果#%d 未找到详情页URL", index+1)
				}
			}
		}(i)
	}
	
	wg.Wait()
	
	if p.debugMode {
		totalLinks := 0
		for i, result := range results {
			totalLinks += len(result.Links)
			log.Printf("[Panwiki] 结果#%d 最终链接数: %d", i+1, len(result.Links))
		}
		log.Printf("[Panwiki] 详情页链接获取完成，总计获得 %d 个链接", totalLinks)
	}
}

// fetchDetailPageLinksWithKeyword 获取详情页中的网盘链接（带关键词过滤）
func (p *PanwikiPlugin) fetchDetailPageLinksWithKeyword(client *http.Client, detailURL string, keyword string) []model.Link {
	if detailURL == "" {
		if p.debugMode {
			log.Printf("[Panwiki] 详情页URL为空，跳过获取链接")
		}
		return []model.Link{}
	}
	
	if p.debugMode {
		log.Printf("[Panwiki] 开始获取详情页链接: %s", detailURL)
	}
	
	// 检查缓存
	if cached, ok := p.detailCache.Load(detailURL); ok {
		if cacheItem, ok := cached.(cacheItem); ok {
			if time.Since(cacheItem.timestamp) < p.cacheTTL {
				return cacheItem.links
			}
		}
	}
	
	req, err := http.NewRequest("GET", detailURL, nil)
	if err != nil {
		return []model.Link{}
	}
	
	p.setRequestHeaders(req)
	
	resp, err := client.Do(req)
	if err != nil {
		return []model.Link{}
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return []model.Link{}
	}
	
	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		if p.debugMode {
			log.Printf("[Panwiki] 解析详情页HTML失败: %v", err)
		}
		return []model.Link{}
	}
	
	links := p.extractDetailPageLinksWithFilter(doc, keyword)
	
	// 缓存结果
	p.detailCache.Store(detailURL, cacheItem{
		links:     links,
		timestamp: time.Now(),
	})
	
	return links
}

// extractDetailPageLinksWithFilter 智能过滤版的详情页链接提取
func (p *PanwikiPlugin) extractDetailPageLinksWithFilter(doc *goquery.Document, keyword string) []model.Link {
	var allLinks []model.Link
	
	if p.debugMode {
		log.Printf("[Panwiki] ==================== 开始智能过滤详情页链接 ====================")
		log.Printf("[Panwiki] 关键词: %s", keyword)
	}
	
	// 查找主要内容区域
	contentArea := doc.Find(".t_f[id^=\"postmessage_\"]").First()
	if contentArea.Length() == 0 {
		contentArea = doc.Find(".t_msgfont, .plhin, .message, [id^='postmessage_']")
	}
	
	if contentArea.Length() == 0 {
		return allLinks
	}
	
	// 先直接提取所有链接，看有多少个
	allFoundLinks := p.extractAllLinksDirectly(contentArea)
	
	if p.debugMode {
		log.Printf("[Panwiki] 提取到链接总数: %d", len(allFoundLinks))
	}
	
	// 核心策略：4个或以下链接直接返回，超过4个才进行内容匹配
	if len(allFoundLinks) <= 4 {
		if p.debugMode {
			log.Printf("[Panwiki] 链接数≤4，直接返回（帖子标题就是资源标题）")
		}
		return allFoundLinks
	}
	
	// 超过4个链接，需要精确匹配
	if p.debugMode {
		log.Printf("[Panwiki] 链接数>4，需要精确匹配")
	}
	
	// 获取HTML内容进行分析
	htmlContent, _ := contentArea.Html()
	lines := strings.Split(htmlContent, "\n")
	
	// 检查是否是单行格式
	if p.isSingleLineFormat(lines, keyword) {
		if p.debugMode {
			log.Printf("[Panwiki] 检测到单行格式，使用精确匹配")
		}
		return p.extractLinksFromSingleLineFormat(lines, keyword)
	}
	
	// 非单行格式，使用分组逻辑
	if p.debugMode {
		log.Printf("[Panwiki] 非单行格式，使用分组逻辑")
	}
	return p.extractLinksWithGrouping(htmlContent, keyword)
}

// filterLinksByContext 基于内容上下文过滤链接
func (p *PanwikiPlugin) filterLinksByContext(links []model.Link, htmlContent, keyword string) []model.Link {
	if len(links) == 0 {
		return links
	}
	
	var filtered []model.Link
	cleanContent := p.cleanHtmlText(htmlContent)
	lines := strings.Split(cleanContent, "\n")
	
	if p.debugMode {
		log.Printf("[Panwiki] 开始上下文过滤，输入链接数: %d", len(links))
	}
	
	for _, link := range links {
		// 查找链接在内容中的位置
		workName := ""
		for _, line := range lines {
			if strings.Contains(line, link.URL) {
				// 提取这个链接对应的作品名
				workName = p.extractWorkNameForLinkInLine(line, link.URL)
				if p.debugMode {
					log.Printf("[Panwiki] 链接 %s 对应作品: '%s'", link.URL, workName)
				}
				break
			}
		}
		
		// 检查作品名是否与关键词相关
		if workName != "" && p.isWorkTitleRelevant(workName, keyword) {
			filtered = append(filtered, link)
			if p.debugMode {
				log.Printf("[Panwiki] ✅ 保留相关链接: %s", link.URL)
			}
		} else if p.debugMode {
			log.Printf("[Panwiki] ❌ 过滤不相关链接: %s", link.URL)
		}
	}
	
	if p.debugMode {
		log.Printf("[Panwiki] 上下文过滤完成，输出链接数: %d", len(filtered))
	}
	
	return filtered
}

// extractWorkNameForLinkInLine 从行中提取链接对应的作品名
func (p *PanwikiPlugin) extractWorkNameForLinkInLine(line, url string) string {
	// 处理单行格式：作品名丨网盘：链接
	pattern := regexp.MustCompile(`([^丨]+)丨[^：]+：` + regexp.QuoteMeta(url))
	matches := pattern.FindStringSubmatch(line)
	if len(matches) > 1 {
		return strings.TrimSpace(matches[1])
	}
	
	// 处理合集格式
	if strings.Contains(line, "合集：") && strings.Contains(line, url) {
		parts := strings.Split(line, "：")
		if len(parts) > 0 {
			return strings.TrimSpace(parts[0])
		}
	}
	
	return ""
}

// isSimpleCase 检查是否是简单情况（单一内容，无需分组）
func (p *PanwikiPlugin) isSimpleCase(htmlContent, keyword string) bool {
	lines := strings.Split(htmlContent, "\n")
	
	// 如果是单行格式，不应该作为简单情况处理
	if p.isSingleLineFormat(lines, keyword) {
		if p.debugMode {
			log.Printf("[Panwiki] 检测到单行格式，不作为简单情况处理")
		}
		return false
	}
	
	var titleCount int
	var linkCount int
	var hasRelevantTitle bool
	var hasRelevantContent bool
	
	// 检查整个页面内容是否与关键词相关
	hasRelevantContent = p.pageContentRelevant(htmlContent, keyword)
	
	for _, line := range lines {
		cleanLine := p.cleanHtmlText(line)
		if len(strings.TrimSpace(cleanLine)) < 5 {
			continue
		}
		
		if p.isNewWorkTitle(cleanLine) {
			titleCount++
			if p.isWorkTitleRelevant(cleanLine, keyword) {
				hasRelevantTitle = true
			}
		}
		
		if strings.Contains(line, "http") && p.containsNetworkLink(line) {
			linkCount++
		}
	}
	
	// 简单情况的判断条件：
	// 大多数帖子都是简单情况（帖子标题已包含关键词，内容只有链接）
	// 1. 标题数不多（<=2），或者
	// 2. 只有少量链接（<=3）且没有多个标题
	// 注：搜索结果本身就是相关的，不需要再次严格过滤
	isSimple := titleCount <= 2 || (linkCount <= 3 && titleCount <= 1)
	
	if p.debugMode {
		log.Printf("[Panwiki] 简单情况判断: 标题数=%d, 链接数=%d, 有相关标题=%v, 内容相关=%v, 结果=%v", 
			titleCount, linkCount, hasRelevantTitle, hasRelevantContent, isSimple)
	}
	
	return isSimple
}

// pageContentRelevant 检查页面整体内容是否与关键词相关
func (p *PanwikiPlugin) pageContentRelevant(htmlContent, keyword string) bool {
	text := p.cleanHtmlText(htmlContent)
	normalizedText := strings.ToLower(strings.ReplaceAll(strings.ReplaceAll(text, " ", ""), ".", ""))
	normalizedKeyword := strings.ToLower(strings.ReplaceAll(strings.ReplaceAll(keyword, " ", ""), ".", ""))
	
	if p.debugMode {
		log.Printf("[Panwiki] 内容相关性检查 - 原文本长度: %d", len(text))
		if len(text) < 300 {
			log.Printf("[Panwiki] 原文本: %s", text)
		}
		log.Printf("[Panwiki] 标准化文本: %s", normalizedText)
		log.Printf("[Panwiki] 标准化关键词: %s", normalizedKeyword)
	}
	
	// 基本匹配
	basicMatch := strings.Contains(normalizedText, normalizedKeyword)
	
	// 对于"凡人修仙传"这样的关键词，还要检查分词匹配
	keywordMatch := false
	if keyword == "凡人修仙传" {
		// 检查各种可能的写法
		variants := []string{
			"凡人修仙传", "凡.人.修.仙.传", "凡人修仙", "修仙传",
			"fanrenxiuxianchuan", "fanren", "xiuxian",
		}
		
		for _, variant := range variants {
			normalizedVariant := strings.ToLower(strings.ReplaceAll(strings.ReplaceAll(variant, " ", ""), ".", ""))
			if strings.Contains(normalizedText, normalizedVariant) {
				keywordMatch = true
				if p.debugMode {
					log.Printf("[Panwiki] 匹配到变体: %s", variant)
				}
				break
			}
		}
	}
	
	result := basicMatch || keywordMatch
	if p.debugMode {
		log.Printf("[Panwiki] 内容相关性结果: 基本匹配=%v, 关键词匹配=%v, 最终结果=%v", basicMatch, keywordMatch, result)
	}
	
	return result
}

// extractAllLinksDirectly 直接提取所有网盘链接（简单情况）
func (p *PanwikiPlugin) extractAllLinksDirectly(contentArea *goquery.Selection) []model.Link {
	var links []model.Link
	
	if p.debugMode {
		log.Printf("[Panwiki] 开始直接提取链接（简单情况）")
	}
	
	// 提取直接的链接
	contentArea.Find("a").Each(func(i int, s *goquery.Selection) {
		href, exists := s.Attr("href")
		if !exists {
			return
		}
		
		if p.debugMode {
			log.Printf("[Panwiki] 找到a标签链接: %s", href)
		}
		
		linkType := p.determineLinkType(href)
		if linkType != "" {
			// 从内容文本中查找对应的密码
			password := p.extractPasswordFromContent(contentArea.Text(), href)
			links = append(links, model.Link{
				URL:      href,
				Type:     linkType,
				Password: password,
			})
			if p.debugMode {
				log.Printf("[Panwiki] 识别为网盘链接: %s (类型: %s)", href, linkType)
			}
		} else if p.debugMode {
			log.Printf("[Panwiki] 不是支持的网盘链接: %s", href)
		}
	})
	
	// 提取文本中的链接
	contentText := contentArea.Text()
	if p.debugMode {
		log.Printf("[Panwiki] 内容文本长度: %d", len(contentText))
		if len(contentText) < 500 {
			log.Printf("[Panwiki] 内容文本: %s", contentText)
		}
	}
	
	textLinks := p.extractLinksFromText(contentText)
	if p.debugMode {
		log.Printf("[Panwiki] 从文本提取到 %d 个链接", len(textLinks))
	}
	links = append(links, textLinks...)
	
	deduplicatedLinks := p.deduplicateLinks(links)
	if p.debugMode {
		log.Printf("[Panwiki] 直接提取完成: 原始 %d 个, 去重后 %d 个", len(links), len(deduplicatedLinks))
	}
	
	return deduplicatedLinks
}

// extractLinksWithGrouping 使用分组逻辑提取链接（复杂情况）
func (p *PanwikiPlugin) extractLinksWithGrouping(htmlContent, keyword string) []model.Link {
	var allLinks []model.Link
	
	// 按行分割并分组处理
	lines := strings.Split(htmlContent, "\n")
	
	// 使用传统的分组逻辑
	// 注意：单行格式已经在extractDetailPageLinksWithFilter中优先处理了
	var currentGroup []string
	var isRelevantGroup bool
	
	for _, line := range lines {
		cleanLine := p.cleanHtmlText(line)
		
		// 跳过空行和无意义内容
		if len(strings.TrimSpace(cleanLine)) < 5 {
			continue
		}
		
		// 检查是否是新的作品标题行
		isTitle := p.isNewWorkTitle(cleanLine)
		if p.debugMode {
			log.Printf("[Panwiki] 检查标题: '%s' -> 是否为标题: %v", cleanLine, isTitle)
		}
		if isTitle {
			// 处理之前的组
			if len(currentGroup) > 0 && isRelevantGroup {
				groupLinks := p.extractLinksFromGroup(currentGroup)
				allLinks = append(allLinks, groupLinks...)
				if p.debugMode {
					log.Printf("[Panwiki] 从相关组提取到 %d 个链接", len(groupLinks))
				}
			}
			
			// 开始新组
			currentGroup = []string{line}
			isRelevantGroup = p.isWorkTitleRelevant(cleanLine, keyword)
			
			if p.debugMode {
				log.Printf("[Panwiki] 新作品组: %s, 相关性: %v, 关键词: %s", cleanLine, isRelevantGroup, keyword)
			}
		} else {
			// 添加到当前组
			if len(currentGroup) > 0 {
				currentGroup = append(currentGroup, line)
				if p.debugMode && strings.Contains(line, "http") {
					log.Printf("[Panwiki] 添加链接行到当前组: %s", cleanLine)
				}
			}
		}
	}
	
	// 处理最后一组
	if len(currentGroup) > 0 && isRelevantGroup {
		groupLinks := p.extractLinksFromGroup(currentGroup)
		allLinks = append(allLinks, groupLinks...)
		if p.debugMode {
			log.Printf("[Panwiki] 从最后相关组提取到 %d 个链接", len(groupLinks))
		}
	}
	
	if p.debugMode {
		log.Printf("[Panwiki] 分组过滤完成，共提取 %d 个相关链接", len(allLinks))
	}
	
	return p.deduplicateLinks(allLinks)
}

// isSingleLineFormat 检查是否是"作品名丨网盘：链接"的单行格式
func (p *PanwikiPlugin) isSingleLineFormat(lines []string, keyword string) bool {
	var validLineCount int
	var matchingLineCount int
	
	// 检查有多少行符合"作品名丨网盘：链接"或"作品名：子标题丨网盘：链接"格式
	// 支持两种格式：
	// 1. "斗破苍穹年番丨夸克：https://..."
	// 2. "凡人修仙传：再临天南丨夸克：https://..."
	singleLinePattern := regexp.MustCompile(`[^丨]*丨[^：]*：https?://[^\s]+`)
	
	for _, line := range lines {
		cleanLine := p.cleanHtmlText(line)
		if len(strings.TrimSpace(cleanLine)) < 10 {
			continue
		}
		
		// 检查是否符合单行格式
		if singleLinePattern.MatchString(cleanLine) {
			validLineCount++
			
			// 检查是否与关键词相关
			if p.isLineTitleRelevant(cleanLine, keyword) {
				matchingLineCount++
			}
			
			if p.debugMode {
				log.Printf("[Panwiki] 单行格式检查: '%s', 相关性: %v", cleanLine, p.isLineTitleRelevant(cleanLine, keyword))
			}
		}
	}
	
	// 如果有至少2行符合单行格式，且有匹配的行，就认为是单行格式
	isMatch := validLineCount >= 2 && matchingLineCount > 0
	
	if p.debugMode {
		log.Printf("[Panwiki] 单行格式判断: 有效行=%d, 匹配行=%d, 结果=%v", validLineCount, matchingLineCount, isMatch)
	}
	
	return isMatch
}

// extractLinksFromSingleLineFormat 从单行格式中提取链接
func (p *PanwikiPlugin) extractLinksFromSingleLineFormat(lines []string, keyword string) []model.Link {
	var allLinks []model.Link
	
	for _, line := range lines {
		cleanLine := p.cleanHtmlText(line)
		if len(strings.TrimSpace(cleanLine)) < 10 {
			continue
		}
		
		// 检查是否包含"丨"和"："的单行格式
		if strings.Contains(cleanLine, "丨") && strings.Contains(cleanLine, "：") {
			if p.debugMode {
				log.Printf("[Panwiki] 处理单行格式: %s", cleanLine)
			}
			
			// 精确提取相关作品的链接
			relevantLinks := p.extractLinksFromSingleLine(cleanLine, keyword)
			allLinks = append(allLinks, relevantLinks...)
		}
	}
	
	if p.debugMode {
		log.Printf("[Panwiki] 单行格式处理完成，共提取 %d 个链接", len(allLinks))
	}
	
	return p.deduplicateLinks(allLinks)
}

// extractLinksFromSingleLine 从单行中提取"作品名丨网盘：链接"格式的相关链接
func (p *PanwikiPlugin) extractLinksFromSingleLine(line, keyword string) []model.Link {
	var results []model.Link
	
	// 使用正则表达式匹配 "作品名丨网盘：链接" 的完整模式
	pattern := regexp.MustCompile(`([^丨]+)丨([^：]+)：(https?://[a-zA-Z0-9\.\-\_\?\=\&\/]+)`)
	matches := pattern.FindAllStringSubmatch(line, -1)
	
	if p.debugMode {
		log.Printf("[Panwiki] 单行匹配到 %d 个模式", len(matches))
	}
	
	for _, match := range matches {
		if len(match) >= 4 {
			workName := strings.TrimSpace(match[1])
			netdisk := strings.TrimSpace(match[2])
			url := strings.TrimSpace(match[3])
			
			if p.debugMode {
				log.Printf("[Panwiki] 作品: '%s', 网盘: '%s', 链接: '%s'", workName, netdisk, url)
			}
			
			if p.isWorkTitleRelevant(workName, keyword) {
				linkType := p.determineLinkType(url)
				if linkType != "" {
					_, password := p.extractPasswordFromURL(url)
					
					results = append(results, model.Link{
						URL:      url,
						Type:     linkType,
						Password: password,
					})
					
					if p.debugMode {
						log.Printf("[Panwiki] ✅ 相关作品链接: %s -> %s", workName, url)
					}
				}
			} else if p.debugMode {
				log.Printf("[Panwiki] ❌ 不相关作品: %s", workName)
			}
		}
	}
	
	return results
}

// isLineTitleRelevant 检查单行中的标题是否与关键词相关
func (p *PanwikiPlugin) isLineTitleRelevant(line, keyword string) bool {
	// 改进版：处理一行多个作品的情况
	// 使用正则表达式找到所有的"作品名丨网盘："模式
	workPattern := regexp.MustCompile(`([^丨]+)丨[^：]+：`)
	matches := workPattern.FindAllStringSubmatch(line, -1)
	
	if p.debugMode {
		log.Printf("[Panwiki] 单行标题相关性检查: 原行='%s', 关键词='%s'", line, keyword)
	}
	
	for _, match := range matches {
		if len(match) > 1 {
			workTitle := strings.TrimSpace(match[1])
			if p.debugMode {
				log.Printf("[Panwiki] 检查作品标题: '%s'", workTitle)
			}
			if p.isWorkTitleRelevant(workTitle, keyword) {
				if p.debugMode {
					log.Printf("[Panwiki] ✅ 找到相关作品: '%s'", workTitle)
				}
				return true
			}
		}
	}
	
	if p.debugMode {
		log.Printf("[Panwiki] 单行标题相关性结果: false")
	}
	
	return false
}

// containsNetworkLink 检查是否包含网盘链接
func (p *PanwikiPlugin) containsNetworkLink(text string) bool {
	networkDomains := []string{
		"pan.quark.cn", "pan.baidu.com", "www.alipan.com", "caiyun.139.com",
		"pan.xunlei.com", "drive.uc.cn", "www.123684.com", "115cdn.com",
		"cloud.189.cn", "pan.uc.cn", "www.123pan.com", "pan.pikpak.com",
	}
	
	for _, domain := range networkDomains {
		if strings.Contains(text, domain) {
			return true
		}
	}
	return false
}

// cleanHtmlText 清理HTML文本
func (p *PanwikiPlugin) cleanHtmlText(html string) string {
	// 移除HTML标签
	re := regexp.MustCompile(`<[^>]*>`)
	text := re.ReplaceAllString(html, "")
	// 清理HTML实体
	text = strings.ReplaceAll(text, "&nbsp;", " ")
	text = strings.ReplaceAll(text, "&amp;", "&")
	return strings.TrimSpace(text)
}

// isNewWorkTitle 检查是否是新作品标题
func (p *PanwikiPlugin) isNewWorkTitle(text string) bool {
	text = strings.TrimSpace(text)
	
	// 如果文本太短，不太可能是标题
	if len(text) < 3 {
		if p.debugMode {
			log.Printf("[Panwiki] 标题检查 '%s': 太短，不是标题", text)
		}
		return false
	}
	
	// 1. 包含年份 (2025)
	if matched, _ := regexp.MatchString(`\(\d{4}\)`, text); matched {
		if p.debugMode {
			log.Printf("[Panwiki] 标题检查 '%s': 匹配年份格式", text)
		}
		return true
	}
	
	// 2. 包含分类标签 [剧情]、[古装]等 或 【作品名】格式
	if matched, _ := regexp.MatchString(`\[[^\]]*\]|【[^\]]*】`, text); matched {
		if p.debugMode {
			log.Printf("[Panwiki] 标题检查 '%s': 匹配标签格式", text)
		}
		return true
	}
	
	// 3. 包含明显的作品信息  
	indicators := []string{
		"4K持续更新", "集完结", "完结", "4K高码", "持续更新",
		"全集", "集】", "更新", "剧版", "真人版", "动画版",
	}
	for _, indicator := range indicators {
		if strings.Contains(text, indicator) {
			if p.debugMode {
				log.Printf("[Panwiki] 标题检查 '%s': 匹配指示词 '%s'", text, indicator)
			}
			return true
		}
	}
	
	// 4. 检查集数格式：【全30集】、【40全】、[全36集]等
	if matched, _ := regexp.MatchString(`【[全\d]+[集\d]*】|【\d+[全集]】|\[\d+[全集]\]|【完结】`, text); matched {
		if p.debugMode {
			log.Printf("[Panwiki] 标题检查 '%s': 匹配集数格式", text)
		}
		return true
	}
	
	// 排除明显不是标题的内容
	nonTitlePrefixes := []string{
		"导演:", "编剧:", "主演:", "类型:", "制片国家", "语言:", "首播:", 
		"集数:", "单集片长:", "评分:", "简介:", "链接：", "链接:",
		"夸克网盘：", "百度网盘：", "阿里云盘：", "迅雷网盘：",
	}
	for _, prefix := range nonTitlePrefixes {
		if strings.HasPrefix(text, prefix) {
			if p.debugMode {
				log.Printf("[Panwiki] 标题检查 '%s': 排除非标题内容", text)
			}
			return false
		}
	}
	
	// 5. 检查是否是常见作品名称格式（仅包含中文、英文、数字、少量符号）
	// 且不包含HTML标记或URL
	if !strings.Contains(text, "http") && !strings.Contains(text, "<") && !strings.Contains(text, ">") {
		// 优先检查短标题（3-6个字符，如"定风波"、"锦月如歌"）
		runeText := []rune(text)
		textLength := len(runeText)
		
		if textLength >= 3 && textLength <= 6 {
			// 短标题：主要是中文字符
			chineseCount := 0
			for _, r := range runeText {
				if r >= 0x4e00 && r <= 0x9fff {
					chineseCount++
				}
			}
			chineseRatio := float64(chineseCount) / float64(textLength)
			
			if p.debugMode {
				log.Printf("[Panwiki] 标题检查 '%s': 短标题检查 - 长度=%d, 中文字符数=%d, 中文比例=%.1f%%", text, textLength, chineseCount, chineseRatio*100)
			}
			
			// 如果主要是中文字符，认为是短标题
			if chineseRatio >= 0.8 { // 至少80%是中文
				if p.debugMode {
					log.Printf("[Panwiki] 标题检查 '%s': 匹配短中文标题", text)
				}
				return true
			}
		}
		
		// 检查是否包含常见的作品名称特征
		if matched, _ := regexp.MatchString(`^[A-Za-z]*[^\s]*(?:传|剧|版|之|的|与|和|：|丨|\s)+`, text); matched {
			if p.debugMode {
				log.Printf("[Panwiki] 标题检查 '%s': 匹配作品名称特征", text)
			}
			return true
		}
		
		// 长标题检查（7-50个字符）
		if textLength >= 7 && textLength <= 50 {
			if matched, _ := regexp.MatchString(`^[\u4e00-\u9fff\w\s\-\(\)（）]+$`, text); matched {
				if p.debugMode {
					log.Printf("[Panwiki] 标题检查 '%s': 匹配长标题", text)
				}
				return true
			}
		}
	}
	
	if p.debugMode {
		log.Printf("[Panwiki] 标题检查 '%s': 不符合任何标题规则", text)
	}
	return false
}

// isWorkTitleRelevant 检查作品标题是否与关键词相关
func (p *PanwikiPlugin) isWorkTitleRelevant(title, keyword string) bool {
	// 标准化 - 移除空格和点号
	normalizedTitle := strings.ToLower(strings.ReplaceAll(strings.ReplaceAll(title, " ", ""), ".", ""))
	normalizedKeyword := strings.ToLower(strings.ReplaceAll(strings.ReplaceAll(keyword, " ", ""), ".", ""))
	
	if p.debugMode {
		log.Printf("[Panwiki] 相关性检查 - 原标题: %s, 原关键词: %s", title, keyword)
		log.Printf("[Panwiki] 相关性检查 - 标准化标题: %s, 标准化关键词: %s", normalizedTitle, normalizedKeyword)
	}
	
	// 针对"凡人修仙传"的严格检查
	if normalizedKeyword == "凡人修仙传" {
		// 只有真正包含"凡人修仙传"相关内容的标题才算相关
		relevantPatterns := []string{
			"凡人修仙传", "凡.人.修.仙.传", "凡人修仙", "修仙传",
			"fanrenxiuxianchuan", "fanren", "xiuxian",
		}
		
		for _, pattern := range relevantPatterns {
			normalizedPattern := strings.ToLower(strings.ReplaceAll(strings.ReplaceAll(pattern, " ", ""), ".", ""))
			if strings.Contains(normalizedTitle, normalizedPattern) {
				if p.debugMode {
					log.Printf("[Panwiki] 匹配到相关模式: %s", pattern)
				}
				return true
			}
		}
		
		if p.debugMode {
			log.Printf("[Panwiki] 凡人修仙传检查：不相关")
		}
		return false
	}
	
	// 对于其他关键词，进行精确匹配
	if strings.Contains(normalizedTitle, normalizedKeyword) {
		if p.debugMode {
			log.Printf("[Panwiki] 其他关键词精确匹配成功")
		}
		return true
	}
	
	if p.debugMode {
		log.Printf("[Panwiki] 不相关")
	}
	
	return false
}

// extractLinksFromGroup 从作品组中提取链接
func (p *PanwikiPlugin) extractLinksFromGroup(group []string) []model.Link {
	var links []model.Link
	
	// 将组合并成HTML文档进行解析
	groupHTML := strings.Join(group, "\n")
	doc, err := goquery.NewDocumentFromReader(strings.NewReader("<div>" + groupHTML + "</div>"))
	if err != nil {
		return links
	}
	
	// 提取链接
	doc.Find("a").Each(func(i int, s *goquery.Selection) {
		href, exists := s.Attr("href")
		if !exists {
			return
		}
		
		linkType := p.determineLinkType(href)
		if linkType != "" {
			links = append(links, model.Link{
				URL:      href,
				Type:     linkType,
				Password: "",
			})
		}
	})
	
	// 从文本中提取链接
	text := doc.Text()
	textLinks := p.extractLinksFromText(text)
	links = append(links, textLinks...)
	
	return links
}

// determineLinkType 确定链接类型
func (p *PanwikiPlugin) determineLinkType(url string) string {
	linkPatterns := map[string]string{
		`pan\.quark\.cn`:          "quark",
		`pan\.baidu\.com`:         "baidu",
		`www\.alipan\.com`:        "aliyun",
		`pan\.xunlei\.com`:        "xunlei",
		`cloud\.189\.cn`:          "tianyi",
		`pan\.uc\.cn`:             "uc",
		`www\.123pan\.com`:        "123",
		`www\.123684\.com`:        "123",
		`115cdn\.com`:             "115",
		`pan\.pikpak\.com`:        "pikpak",
		`caiyun\.139\.cn`:         "mobile",
	}
	
	for pattern, linkType := range linkPatterns {
		matched, _ := regexp.MatchString(pattern, url)
		if matched {
			return linkType
		}
	}
	
	return ""
}

// extractLinksFromText 从文本中提取链接
func (p *PanwikiPlugin) extractLinksFromText(text string) []model.Link {
	var links []model.Link
	
	// 网盘链接正则模式 (修复迅雷链接截断问题，添加下划线和连字符支持)
	patterns := []string{
		`https://pan\.quark\.cn/s/[a-zA-Z0-9_-]+`,
		`https://pan\.baidu\.com/s/[a-zA-Z0-9_-]+`,
		`https://www\.alipan\.com/s/[a-zA-Z0-9_-]+`,
		`https://pan\.xunlei\.com/s/[a-zA-Z0-9_-]+`,  // 修复：添加下划线和连字符
		`https://cloud\.189\.cn/[a-zA-Z0-9_-]+`,
		`https://pan\.uc\.cn/s/[a-zA-Z0-9_-]+`,
		`https://www\.123pan\.com/s/[a-zA-Z0-9_-]+`,
		`https://www\.123684\.com/s/[a-zA-Z0-9_-]+`,
		`https://115cdn\.com/s/[a-zA-Z0-9_-]+`,
		`https://pan\.pikpak\.com/s/[a-zA-Z0-9_-]+`,
		`https://caiyun\.139\.cn/s/[a-zA-Z0-9_-]+`,
	}
	
	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		matches := re.FindAllString(text, -1)
		
		for _, match := range matches {
			linkType := p.determineLinkType(match)
			if linkType != "" {
				links = append(links, model.Link{
					URL:      match,
					Type:     linkType,
					Password: "",
				})
			}
		}
	}
	
	return links
}

// deduplicateLinks 智能去重链接（合并相同资源的不同版本）
func (p *PanwikiPlugin) deduplicateLinks(links []model.Link) []model.Link {
	linkMap := make(map[string]model.Link)
	
	for _, link := range links {
		// 提取和设置密码
		normalizedURL, password := p.extractPasswordFromURL(link.URL)
		
		// 创建带密码信息的新链接
		newLink := model.Link{
			URL:      link.URL,
			Type:     link.Type,
			Password: password,
		}
		
		// 使用标准化URL作为key进行去重
		if existingLink, exists := linkMap[normalizedURL]; exists {
			// 如果已存在，保留更完整的版本（优先带密码的）
			if password != "" && existingLink.Password == "" {
				linkMap[normalizedURL] = newLink
			} else if password == "" && existingLink.Password != "" {
				// 保持原有的（已有密码的版本）
				continue
			} else if len(link.URL) > len(existingLink.URL) {
				// 保留URL更长的版本（通常更完整）
				linkMap[normalizedURL] = newLink
			}
		} else {
			linkMap[normalizedURL] = newLink
		}
	}
	
	// 转换为切片
	var result []model.Link
	for _, link := range linkMap {
		result = append(result, link)
	}
	
	if p.debugMode {
		log.Printf("[Panwiki] 去重前: %d 个链接, 去重后: %d 个链接", len(links), len(result))
	}
	
	return result
}

// extractPasswordFromURL 从URL中提取密码并返回标准化URL
func (p *PanwikiPlugin) extractPasswordFromURL(rawURL string) (normalizedURL string, password string) {
	// 解析URL
	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		return rawURL, ""
	}
	
	// 获取查询参数
	query := parsedURL.Query()
	
	// 检查常见的密码参数
	passwordKeys := []string{"pwd", "password", "pass", "code"}
	for _, key := range passwordKeys {
		if val := query.Get(key); val != "" {
			password = val
			break
		}
	}
	
	// 构建标准化URL（去除密码参数）
	for _, key := range passwordKeys {
		query.Del(key)
	}
	
	parsedURL.RawQuery = query.Encode()
	normalizedURL = parsedURL.String()
	
	// 如果查询参数为空，去掉问号
	if parsedURL.RawQuery == "" {
		normalizedURL = strings.TrimSuffix(normalizedURL, "?")
	}
	
	return normalizedURL, password
}

// cacheItem 缓存项结构
type cacheItem struct {
	links     []model.Link
	timestamp time.Time
}

// extractDetailURLFromContent 从Content中提取详情页URL
func (p *PanwikiPlugin) extractDetailURLFromContent(content string) string {
	// 查找详情URL模式
	re := regexp.MustCompile(`详情:\s*(https?://[^\s]+)`)
	matches := re.FindStringSubmatch(content)
	if len(matches) > 1 {
		return matches[1]
	}
	return ""
}

// 辅助函数
func parseStats(statsText string, replyCount, viewCount *int) {
	// 解析如 "1 个回复 - 87 次查看" 格式
	re := regexp.MustCompile(`(\d+)\s*个回复\s*-\s*(\d+)\s*次查看`)
	matches := re.FindStringSubmatch(statsText)
	if len(matches) >= 3 {
		if reply, err := strconv.Atoi(matches[1]); err == nil {
			*replyCount = reply
		}
		if view, err := strconv.Atoi(matches[2]); err == nil {
			*viewCount = view
		}
	}
}

func parseTime(timeStr string) time.Time {
	// 解析如 "2025-8-14 21:21" 格式
	timeStr = strings.TrimSpace(timeStr)
	
	formats := []string{
		"2006-1-2 15:04",
		"2006-1-2 15:04:05",
		"2025-1-2 15:04",
		"2025-1-2 15:04:05",
	}
	
	for _, format := range formats {
		if t, err := time.Parse(format, timeStr); err == nil {
			return t
		}
	}
	
	// 如果解析失败，返回当前时间
	return time.Now()
}

// Search 执行搜索并返回结果（兼容性方法）
func (p *PanwikiPlugin) Search(keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	result, err := p.SearchWithResult(keyword, ext)
	if err != nil {
		return nil, err
	}
	return result.Results, nil
}

// SearchWithResult 执行搜索并返回包含IsFinal标记的结果
func (p *PanwikiPlugin) SearchWithResult(keyword string, ext map[string]interface{}) (model.PluginSearchResult, error) {
	return p.AsyncSearchWithResult(keyword, p.searchImpl, p.MainCacheKey, ext)
}

// extractPasswordFromContent 从内容文本中提取指定链接的密码
func (p *PanwikiPlugin) extractPasswordFromContent(content, linkURL string) string {
	// 查找链接在内容中的位置
	linkIndex := strings.Index(content, linkURL)
	if linkIndex == -1 {
		return ""
	}
	
	// 提取链接周围的文本（前20字符，后100字符）- 缩小范围避免错误匹配
	start := linkIndex - 20
	if start < 0 {
		start = 0
	}
	end := linkIndex + len(linkURL) + 100
	if end > len(content) {
		end = len(content)
	}
	
	surroundingText := content[start:end]
	
	// 查找密码模式
	passwordPatterns := []string{
		`提取码[：:]\s*([A-Za-z0-9]+)`,
		`密码[：:]\s*([A-Za-z0-9]+)`,
		`pwd[：:=]\s*([A-Za-z0-9]+)`,
		`password[：:=]\s*([A-Za-z0-9]+)`,
	}
	
	for _, pattern := range passwordPatterns {
		re := regexp.MustCompile(pattern)
		matches := re.FindStringSubmatch(surroundingText)
		if len(matches) > 1 {
			if p.debugMode {
				log.Printf("[Panwiki] 为链接 %s 找到密码: %s", linkURL, matches[1])
			}
			return matches[1]
		}
	}
	
	// 也尝试从URL查询参数中提取
	_, urlPassword := p.extractPasswordFromURL(linkURL)
	return urlPassword
}

func init() {
	p := NewPanwikiPlugin()
	plugin.RegisterGlobalPlugin(p)
}