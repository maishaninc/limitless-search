package feikuai

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"pansou/model"
	"pansou/plugin"
	"pansou/util/json"
)

const (
	// API URL格式
	SearchAPIURL = "https://feikuai.tv/t_search/bm_search.php?kw=%s"
	
	// 默认超时时间
	DefaultTimeout = 15 * time.Second
	
	// HTTP连接池配置
	MaxIdleConns        = 100
	MaxIdleConnsPerHost = 30
	MaxConnsPerHost     = 50
	IdleConnTimeout     = 90 * time.Second
)

// 预编译正则表达式
var (
	// 文件扩展名正则
	fileExtRegex = regexp.MustCompile(`\.(mkv|mp4|avi|rmvb|wmv|flv|mov|ts|m2ts|iso)$`)
	
	// 文件大小信息正则
	fileSizeRegex = regexp.MustCompile(`\s*·\s*[\d.]+\s*[KMGT]B\s*$`)
	
	// 日期时间提取正则
	dateTimeRegex = regexp.MustCompile(`@[^-]+-(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})`)
)

// FeikuaiPlugin Feikuai磁力搜索插件
type FeikuaiPlugin struct {
	*plugin.BaseAsyncPlugin
	optimizedClient *http.Client
}

// createOptimizedHTTPClient 创建优化的HTTP客户端
func createOptimizedHTTPClient() *http.Client {
	transport := &http.Transport{
		MaxIdleConns:        MaxIdleConns,
		MaxIdleConnsPerHost: MaxIdleConnsPerHost,
		MaxConnsPerHost:     MaxConnsPerHost,
		IdleConnTimeout:     IdleConnTimeout,
		DisableKeepAlives:   false,
	}

	return &http.Client{
		Transport: transport,
		Timeout:   DefaultTimeout,
	}
}

// NewFeikuaiPlugin 创建新的Feikuai插件
func NewFeikuaiPlugin() *FeikuaiPlugin {
	return &FeikuaiPlugin{
		BaseAsyncPlugin: plugin.NewBaseAsyncPluginWithFilter("feikuai", 3, true), // 跳过Service层过滤
		optimizedClient: createOptimizedHTTPClient(),
	}
}

func init() {
	plugin.RegisterGlobalPlugin(NewFeikuaiPlugin())
}

// Search 同步搜索接口
func (p *FeikuaiPlugin) Search(keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	result, err := p.SearchWithResult(keyword, ext)
	if err != nil {
		return nil, err
	}
	return result.Results, nil
}

// SearchWithResult 带结果统计的搜索接口
func (p *FeikuaiPlugin) SearchWithResult(keyword string, ext map[string]interface{}) (model.PluginSearchResult, error) {
	return p.AsyncSearchWithResult(keyword, p.searchImpl, p.MainCacheKey, ext)
}

// searchImpl 搜索实现
func (p *FeikuaiPlugin) searchImpl(client *http.Client, keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	// 使用优化的客户端
	if p.optimizedClient != nil {
		client = p.optimizedClient
	}

	// 构建API搜索URL
	searchURL := fmt.Sprintf(SearchAPIURL, url.QueryEscape(keyword))
	
	// 创建带超时的上下文
	ctx, cancel := context.WithTimeout(context.Background(), DefaultTimeout)
	defer cancel()
	
	// 创建请求
	req, err := http.NewRequestWithContext(ctx, "GET", searchURL, nil)
	if err != nil {
		return nil, fmt.Errorf("[%s] 创建请求失败: %w", p.Name(), err)
	}
	
	// 设置请求头
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
	req.Header.Set("Accept", "application/json, text/plain, */*")
	req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
	req.Header.Set("Connection", "keep-alive")
	req.Header.Set("Referer", "https://feikuai.tv/")
	
	// 发送请求（带重试）
	resp, err := p.doRequestWithRetry(req, client)
	if err != nil {
		return nil, fmt.Errorf("[%s] 搜索请求失败: %w", p.Name(), err)
	}
	defer resp.Body.Close()
	
	// 检查状态码
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("[%s] 请求返回状态码: %d", p.Name(), resp.StatusCode)
	}
	
	// 读取并解析JSON响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("[%s] 读取响应失败: %w", p.Name(), err)
	}
	
	var apiResp FeikuaiAPIResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("[%s] JSON解析失败: %w", p.Name(), err)
	}
	
	// 检查API响应状态
	if apiResp.Code != 0 {
		return nil, fmt.Errorf("[%s] API返回错误: %s (code: %d)", p.Name(), apiResp.Msg, apiResp.Code)
	}
	
	// 解析搜索结果
	var results []model.SearchResult
	for _, item := range apiResp.Items {
		// 每个item可能包含多个种子
		for _, torrent := range item.Torrents {
			result := p.parseTorrent(keyword, item, torrent)
			if result.Title != "" && len(result.Links) > 0 {
				results = append(results, result)
			}
		}
	}
	
	// 使用关键词过滤结果
	return plugin.FilterResultsByKeyword(results, keyword), nil
}

// FeikuaiAPIResponse API响应结构
type FeikuaiAPIResponse struct {
	Code    int                `json:"code"`
	Msg     string             `json:"msg"`
	Keyword string             `json:"keyword"`
	Count   int                `json:"count"`
	Items   []FeikuaiAPIItem   `json:"items"`
}

// FeikuaiAPIItem API数据项
type FeikuaiAPIItem struct {
	ContentID *string           `json:"content_id"`
	Title     string            `json:"title"`
	Type      string            `json:"type"`
	Year      *int              `json:"year"`
	Torrents  []FeikuaiTorrent  `json:"torrents"`
}

// FeikuaiTorrent 种子数据
type FeikuaiTorrent struct {
	InfoHash     string  `json:"info_hash"`
	Magnet       string  `json:"magnet"`
	Name         string  `json:"name"`
	SizeBytes    int64   `json:"size_bytes"`
	SizeGB       float64 `json:"size_gb"`
	Seeders      int     `json:"seeders"`
	Leechers     int     `json:"leechers"`
	PublishedAt  string  `json:"published_at"`
	PublishedAgo string  `json:"published_ago"`
	FilePath     string  `json:"file_path"`
	FileExt      string  `json:"file_ext"`
}

// parseTorrent 解析种子数据为SearchResult
func (p *FeikuaiPlugin) parseTorrent(keyword string, item FeikuaiAPIItem, torrent FeikuaiTorrent) model.SearchResult {
	// 构建唯一ID
	uniqueID := fmt.Sprintf("%s-%s", p.Name(), torrent.InfoHash)
	
	// 构建work_title
	workTitle := p.buildWorkTitle(keyword, torrent.Name)
	
	// 构建描述信息
	content := p.buildContent(item, torrent)
	
	// 解析发布时间
	datetime := p.parsePublishedTime(torrent.PublishedAt)
	
	// 构建标签
	tags := p.extractTags(item.Title, torrent.Name)
	
	// 构建磁力链接
	links := []model.Link{
		{
			Type:      "magnet",
			URL:       torrent.Magnet,
			Password:  "",  // 磁力链接无密码
			Datetime:  datetime,
			WorkTitle: workTitle,
		},
	}
	
	return model.SearchResult{
		UniqueID: uniqueID,
		Title:    workTitle,  // 使用处理后的work_title作为标题
		Content:  content,
		Links:    links,
		Tags:     tags,
		Channel:  "", // 插件搜索结果Channel为空
		Datetime: datetime,
	}
}

// buildWorkTitle 构建work_title（核心功能）
func (p *FeikuaiPlugin) buildWorkTitle(keyword, fileName string) string {
	// 1. 清洗文件名
	cleanedName := p.cleanFileName(fileName)
	
	// 2. 检查是否包含关键词
	if p.containsKeywords(keyword, cleanedName) {
		return cleanedName
	}
	
	// 3. 不包含关键词，拼接中文关键词
	return fmt.Sprintf("%s-%s", keyword, cleanedName)
}

// cleanFileName 清洗文件名
func (p *FeikuaiPlugin) cleanFileName(fileName string) string {
	// 去除文件扩展名
	fileName = fileExtRegex.ReplaceAllString(fileName, "")
	
	// 去除文件大小信息
	fileName = fileSizeRegex.ReplaceAllString(fileName, "")
	
	// 去除日期时间部分（@来源-日期 时间）
	if idx := strings.Index(fileName, "@"); idx != -1 {
		fileName = fileName[:idx]
	}
	
	return strings.TrimSpace(fileName)
}

// containsKeywords 检查文本是否包含关键词
func (p *FeikuaiPlugin) containsKeywords(keyword, text string) bool {
	// 简化处理：分词并检查
	keywords := p.splitKeywords(keyword)
	lowerText := strings.ToLower(text)
	
	for _, kw := range keywords {
		if strings.Contains(lowerText, strings.ToLower(kw)) {
			return true
		}
	}
	
	return false
}

// splitKeywords 分词提取关键词
func (p *FeikuaiPlugin) splitKeywords(keyword string) []string {
	// 移除标点符号和空格
	keyword = strings.TrimSpace(keyword)
	
	// 简单按空格、中文标点分割
	separators := []string{" ", "　", "，", "。", "、", "；", "：", "！", "？", "-", "_"}
	
	parts := []string{keyword}
	for _, sep := range separators {
		var newParts []string
		for _, part := range parts {
			if strings.Contains(part, sep) {
				newParts = append(newParts, strings.Split(part, sep)...)
			} else {
				newParts = append(newParts, part)
			}
		}
		parts = newParts
	}
	
	// 过滤空字符串和过短的词
	var result []string
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if len(part) >= 2 { // 至少2个字符
			result = append(result, part)
		}
	}
	
	return result
}

// buildContent 构建内容描述
func (p *FeikuaiPlugin) buildContent(item FeikuaiAPIItem, torrent FeikuaiTorrent) string {
	var contentParts []string
	
	// 文件名
	contentParts = append(contentParts, fmt.Sprintf("文件名: %s", torrent.Name))
	
	// 文件大小
	contentParts = append(contentParts, fmt.Sprintf("大小: %.2f GB", torrent.SizeGB))
	
	// 做种数和下载数
	contentParts = append(contentParts, fmt.Sprintf("做种: %d", torrent.Seeders))
	contentParts = append(contentParts, fmt.Sprintf("下载: %d", torrent.Leechers))
	
	// 发布时间（人类可读格式）
	if torrent.PublishedAgo != "" {
		contentParts = append(contentParts, fmt.Sprintf("发布: %s", torrent.PublishedAgo))
	}
	
	return strings.Join(contentParts, " | ")
}

// extractTags 提取标签
func (p *FeikuaiPlugin) extractTags(title, fileName string) []string {
	var tags []string
	combinedText := strings.ToUpper(title + " " + fileName)
	
	// 分辨率标签
	if strings.Contains(combinedText, "2160P") || strings.Contains(combinedText, "4K") {
		tags = append(tags, "4K")
	} else if strings.Contains(combinedText, "1080P") {
		tags = append(tags, "1080P")
	} else if strings.Contains(combinedText, "720P") {
		tags = append(tags, "720P")
	}
	
	// 编码格式
	if strings.Contains(combinedText, "H265") || strings.Contains(combinedText, "HEVC") {
		tags = append(tags, "H265")
	} else if strings.Contains(combinedText, "H264") || strings.Contains(combinedText, "AVC") {
		tags = append(tags, "H264")
	}
	
	// HDR标签
	if strings.Contains(combinedText, "HDR") {
		tags = append(tags, "HDR")
	}
	
	// 60帧
	if strings.Contains(combinedText, "60FPS") || strings.Contains(combinedText, "60HZ") {
		tags = append(tags, "60fps")
	}
	
	return tags
}

// parsePublishedTime 解析发布时间
func (p *FeikuaiPlugin) parsePublishedTime(timeStr string) time.Time {
	if timeStr == "" {
		return time.Now()
	}
	
	// 解析ISO 8601格式: "2025-11-18 00:54:20.659664+00"
	layouts := []string{
		"2006-01-02 15:04:05.999999-07",
		"2006-01-02 15:04:05.999999+07",
		"2006-01-02 15:04:05-07",
		"2006-01-02 15:04:05+07",
		"2006-01-02 15:04:05",
	}
	
	for _, layout := range layouts {
		if t, err := time.Parse(layout, timeStr); err == nil {
			return t
		}
	}
	
	// 解析失败，返回当前时间
	return time.Now()
}

// doRequestWithRetry 带重试的HTTP请求
func (p *FeikuaiPlugin) doRequestWithRetry(req *http.Request, client *http.Client) (*http.Response, error) {
	maxRetries := 3
	var lastErr error
	
	for i := 0; i < maxRetries; i++ {
		if i > 0 {
			// 指数退避
			backoff := time.Duration(1<<uint(i-1)) * 200 * time.Millisecond
			time.Sleep(backoff)
		}
		
		// 克隆请求避免并发问题
		reqClone := req.Clone(req.Context())
		
		resp, err := client.Do(reqClone)
		if err == nil {
			if resp.StatusCode == 200 {
				return resp, nil
			}
			resp.Body.Close()
			lastErr = fmt.Errorf("HTTP状态码: %d", resp.StatusCode)
		} else {
			lastErr = err
		}
	}
	
	return nil, fmt.Errorf("[%s] 重试 %d 次后仍然失败: %w", p.Name(), maxRetries, lastErr)
}
