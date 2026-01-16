package sousou

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"sync"
	"time"

	"pansou/model"
	"pansou/plugin"
	"pansou/util/json"
)

var debugEnabled = false

func debugLog(format string, args ...interface{}) {
	if debugEnabled {
		log.Printf("[sousou DEBUG] "+format, args...)
	}
}

// 在init函数中注册插件
func init() {
	plugin.RegisterGlobalPlugin(NewSousouAsyncPlugin())
}

const (
	// API端点
	SousouAPI = "https://sousou.pro/api.php"

	// 默认参数
	DefaultPerSize = 30
	DefaultMaxPages = 3
)

// 支持的网盘类型列表
var supportedDiskTypes = []string{
	"QUARK",   // 夸克网盘
	"BDY",     // 百度网盘
	"ALY",     // 阿里云盘
	"XUNLEI",  // 迅雷网盘
	"UC",      // UC网盘
	"115",     // 115网盘
}

// SousouAsyncPlugin Sousou搜索异步插件
type SousouAsyncPlugin struct {
	*plugin.BaseAsyncPlugin
}

// NewSousouAsyncPlugin 创建新的Sousou搜索异步插件
func NewSousouAsyncPlugin() *SousouAsyncPlugin {
	return &SousouAsyncPlugin{
		BaseAsyncPlugin: plugin.NewBaseAsyncPlugin("sousou", 3),
	}
}

// Search 执行搜索并返回结果（兼容性方法）
func (p *SousouAsyncPlugin) Search(keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	result, err := p.SearchWithResult(keyword, ext)
	if err != nil {
		return nil, err
	}
	return result.Results, nil
}

// SearchWithResult 执行搜索并返回包含IsFinal标记的结果
func (p *SousouAsyncPlugin) SearchWithResult(keyword string, ext map[string]interface{}) (model.PluginSearchResult, error) {
	return p.AsyncSearchWithResult(keyword, p.doSearch, p.MainCacheKey, ext)
}

// doSearch 实际的搜索实现 - 并发搜索多种网盘类型
func (p *SousouAsyncPlugin) doSearch(client *http.Client, keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	debugLog("开始搜索，关键词: %s", keyword)

	// 创建结果通道和错误通道
	resultChan := make(chan []SousouItem, len(supportedDiskTypes))
	errChan := make(chan error, len(supportedDiskTypes))

	// 创建等待组
	var wg sync.WaitGroup

	// 并发搜索每种网盘类型
	for _, diskType := range supportedDiskTypes {
		wg.Add(1)

		go func(dt string) {
			defer wg.Done()
			debugLog("开始搜索网盘类型: %s", dt)
			
			items, err := p.searchByType(client, keyword, dt)
			if err != nil {
				debugLog("%s 网盘搜索错误: %v", dt, err)
				errChan <- fmt.Errorf("%s API error: %w", dt, err)
				return
			}
			
			debugLog("%s 网盘返回 %d 条结果", dt, len(items))
			resultChan <- items
		}(diskType)
	}

	// 启动一个goroutine等待所有请求完成并关闭通道
	go func() {
		wg.Wait()
		close(resultChan)
		close(errChan)
	}()

	// 收集结果
	var allItems []SousouItem
	var errors []error

	// 从通道读取结果
	for items := range resultChan {
		allItems = append(allItems, items...)
	}

	// 收集错误（不阻止处理）
	for err := range errChan {
		errors = append(errors, err)
	}

	debugLog("收集到 %d 条原始结果，%d 个错误", len(allItems), len(errors))

	// 如果没有获取到任何结果且有错误，则返回第一个错误
	if len(allItems) == 0 && len(errors) > 0 {
		return nil, errors[0]
	}

	// 去重处理
	uniqueItems := p.deduplicateItems(allItems)
	debugLog("去重后剩余 %d 条结果", len(uniqueItems))

	// 转换为标准格式
	results := p.convertResults(uniqueItems)
	debugLog("转换后得到 %d 条最终结果", len(results))

	// 关键词过滤
	filteredResults := plugin.FilterResultsByKeyword(results, keyword)
	debugLog("过滤后剩余 %d 条结果", len(filteredResults))

	return filteredResults, nil
}

// searchByType 搜索指定网盘类型
func (p *SousouAsyncPlugin) searchByType(client *http.Client, keyword string, diskType string) ([]SousouItem, error) {
	// 创建结果通道和错误通道（用于多页并发）
	resultChan := make(chan []SousouItem, DefaultMaxPages)
	errChan := make(chan error, DefaultMaxPages)

	// 创建等待组，用于等待所有页面请求完成
	var wg sync.WaitGroup

	// 并发请求每一页
	for page := 1; page <= DefaultMaxPages; page++ {
		wg.Add(1)

		go func(pageNum int) {
			defer wg.Done()

			// 构建请求URL
			apiURL := fmt.Sprintf("%s?action=search&q=%s&page=%d&per_size=%d&type=%s",
				SousouAPI,
				url.QueryEscape(keyword),
				pageNum,
				DefaultPerSize,
				diskType,
			)

			debugLog("请求URL (page %d, type %s): %s", pageNum, diskType, apiURL)

			// 创建带超时的上下文
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()

			// 创建请求
			req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
			if err != nil {
				debugLog("创建请求失败 (page %d, type %s): %v", pageNum, diskType, err)
				errChan <- fmt.Errorf("create request failed (page %d, type %s): %w", pageNum, diskType, err)
				return
			}

			// 设置请求头
			req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
			req.Header.Set("Accept", "application/json, text/plain, */*")
			req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
			req.Header.Set("Connection", "keep-alive")
			req.Header.Set("Referer", "https://sousou.pro/")

			// 发送请求
			resp, err := client.Do(req)
			if err != nil {
				debugLog("请求失败 (page %d, type %s): %v", pageNum, diskType, err)
				errChan <- fmt.Errorf("request failed (page %d, type %s): %w", pageNum, diskType, err)
				return
			}
			defer resp.Body.Close()

			debugLog("收到响应 (page %d, type %s), 状态码: %d", pageNum, diskType, resp.StatusCode)

			// 检查状态码
			if resp.StatusCode != 200 {
				debugLog("HTTP错误 (page %d, type %s): %d", pageNum, diskType, resp.StatusCode)
				errChan <- fmt.Errorf("HTTP error (page %d, type %s): %d", pageNum, diskType, resp.StatusCode)
				return
			}

			// 读取响应体
			respBody, err := io.ReadAll(resp.Body)
			if err != nil {
				debugLog("读取响应失败 (page %d, type %s): %v", pageNum, diskType, err)
				errChan <- fmt.Errorf("read response body failed (page %d, type %s): %w", pageNum, diskType, err)
				return
			}

			debugLog("响应内容 (page %d, type %s, 前500字符): %s", pageNum, diskType, string(respBody[:min(500, len(respBody))]))

			// 解析响应
			var apiResp SousouResponse
			if err := json.Unmarshal(respBody, &apiResp); err != nil {
				debugLog("JSON解析失败 (page %d, type %s): %v", pageNum, diskType, err)
				errChan <- fmt.Errorf("decode response failed (page %d, type %s): %w", pageNum, diskType, err)
				return
			}

			// 检查响应状态
			if apiResp.Code != 200 {
				debugLog("API返回错误 (page %d, type %s): code=%d, msg=%s", pageNum, diskType, apiResp.Code, apiResp.Msg)
				errChan <- fmt.Errorf("API returned error (page %d, type %s): %s", pageNum, diskType, apiResp.Msg)
				return
			}

			debugLog("成功获取第 %d 页数据 (type %s)，共 %d 条结果", pageNum, diskType, len(apiResp.Data.List))

			// 将结果发送到通道
			resultChan <- apiResp.Data.List
		}(page)
	}

	// 启动一个goroutine等待所有页面请求完成并关闭通道
	go func() {
		wg.Wait()
		close(resultChan)
		close(errChan)
	}()

	// 收集结果
	var allItems []SousouItem
	for items := range resultChan {
		allItems = append(allItems, items...)
	}

	// 检查是否有错误
	var errors []error
	for err := range errChan {
		errors = append(errors, err)
	}

	// 如果没有获取到任何结果且有错误，则返回第一个错误
	if len(allItems) == 0 && len(errors) > 0 {
		return nil, errors[0]
	}

	return allItems, nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// deduplicateItems 去重处理
func (p *SousouAsyncPlugin) deduplicateItems(items []SousouItem) []SousouItem {
	// 使用map进行去重，以disk_id为键
	uniqueMap := make(map[string]SousouItem)

	for _, item := range items {
		// 创建唯一键：优先使用DiskID，如果为空则使用Link
		var key string
		if item.DiskID != "" {
			key = item.DiskID
		} else if item.Link != "" {
			key = item.Link
		} else {
			// 如果DiskID和Link都为空，则使用DiskName+DiskType作为键
			key = item.DiskName + "|" + item.DiskType
		}

		// 如果已存在，保留信息更丰富的那个
		if existing, exists := uniqueMap[key]; exists {
			// 比较文件列表长度和其他信息
			existingScore := len(existing.Files)
			newScore := len(item.Files)

			// 如果新项有密码而现有项没有，增加新项分数
			if existing.DiskPass == "" && item.DiskPass != "" {
				newScore += 5
			}

			// 如果新项有时间而现有项没有，增加新项分数
			if existing.SharedTime == "" && item.SharedTime != "" {
				newScore += 3
			}

			// 如果新项有标签而现有项没有，增加新项分数
			if existing.Tags == nil && item.Tags != nil {
				newScore += 2
			}

			if newScore > existingScore {
				uniqueMap[key] = item
			}
		} else {
			uniqueMap[key] = item
		}
	}

	// 将map转回切片
	result := make([]SousouItem, 0, len(uniqueMap))
	for _, item := range uniqueMap {
		result = append(result, item)
	}

	return result
}

// convertResults 将API响应转换为标准SearchResult格式
func (p *SousouAsyncPlugin) convertResults(items []SousouItem) []model.SearchResult {
	results := make([]model.SearchResult, 0, len(items))

	for i, item := range items {
		// 跳过无效链接的结果
		if item.Link == "" {
			debugLog("跳过无链接的结果: %s", item.DiskName)
			continue
		}

		// 创建链接
		link := model.Link{
			URL:      item.Link,
			Type:     p.convertDiskType(item.DiskType),
			Password: item.DiskPass,
		}

		// 创建唯一ID
		uniqueID := fmt.Sprintf("sousou-%s", item.DiskID)
		if item.DiskID == "" {
			// 使用索引作为后备
			uniqueID = fmt.Sprintf("sousou-%d-%d", time.Now().Unix(), i)
		}

		// 解析时间
		var datetime time.Time
		if item.SharedTime != "" {
			// 尝试解析时间，格式：2025-10-27 21:38:59
			parsedTime, err := time.Parse("2006-01-02 15:04:05", item.SharedTime)
			if err == nil {
				datetime = parsedTime
			} else {
				debugLog("时间解析失败: %s, err: %v", item.SharedTime, err)
			}
		}

		// 如果时间解析失败，使用零值
		if datetime.IsZero() {
			datetime = time.Time{}
		}

		// 处理标签
		tags := p.processTags(item.Tags)

		// 创建搜索结果
		result := model.SearchResult{
			UniqueID: uniqueID,
			Title:    item.DiskName,
			Content:  item.Files,
			Datetime: datetime,
			Tags:     tags,
			Links:    []model.Link{link},
			Channel:  "", // 插件搜索结果必须为空字符串
		}

		debugLog("转换结果: ID=%s, Title=%s, Type=%s, Link=%s", uniqueID, result.Title, link.Type, link.URL)
		results = append(results, result)
	}

	return results
}

// convertDiskType 将API的网盘类型转换为标准链接类型
func (p *SousouAsyncPlugin) convertDiskType(diskType string) string {
	switch diskType {
	case "BDY":
		return "baidu"
	case "ALY":
		return "aliyun"
	case "QUARK":
		return "quark"
	case "TIANYI":
		return "tianyi"
	case "UC":
		return "uc"
	case "CAIYUN":
		return "mobile"
	case "115":
		return "115"
	case "XUNLEI":
		return "xunlei"
	case "123PAN":
		return "123"
	case "PIKPAK":
		return "pikpak"
	default:
		return "others"
	}
}

// processTags 处理标签字段（可能为null）
func (p *SousouAsyncPlugin) processTags(tags interface{}) []string {
	if tags == nil {
		return nil
	}

	// 类型断言为字符串数组
	if tagArray, ok := tags.([]interface{}); ok {
		result := make([]string, 0, len(tagArray))
		for _, tag := range tagArray {
			if tagStr, ok := tag.(string); ok && tagStr != "" {
				result = append(result, tagStr)
			}
		}
		if len(result) > 0 {
			return result
		}
	}

	return nil
}

// SousouResponse API响应结构
type SousouResponse struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Data struct {
		Total   int          `json:"total"`
		PerSize int          `json:"per_size"`
		Took    int          `json:"took"`
		List    []SousouItem `json:"list"`
	} `json:"data"`
}

// SousouItem API响应中的单个结果项
type SousouItem struct {
	DiskID      string      `json:"disk_id"`
	DiskName    string      `json:"disk_name"`
	DiskPass    string      `json:"disk_pass"`
	DiskType    string      `json:"disk_type"`
	Files       string      `json:"files"`
	DocID       string      `json:"doc_id"`
	ShareUser   string      `json:"share_user"`
	ShareUserID string      `json:"share_user_id"`
	SharedTime  string      `json:"shared_time"`
	RelMovie    string      `json:"rel_movie"`
	IsMine      bool        `json:"is_mine"`
	Tags        interface{} `json:"tags"` // 可能为null或字符串数组
	Link        string      `json:"link"`
	Enabled     bool        `json:"enabled"`
	Weight      int         `json:"weight"`
	Status      int         `json:"status"`
}

