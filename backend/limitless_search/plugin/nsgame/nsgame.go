package nsgame

import (
	"context"
	"crypto/md5"
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

const (
	// 插件名称
	pluginName = "nsgame"
	
	// API地址
	apiURL = "https://nsthwj.com/thwj/game/query"
	
	// 优先级
	defaultPriority = 2
	
	// 超时时间
	defaultTimeout = 10 * time.Second
	
	// 每页大小
	pageSize = 1000
)

// 预编译的正则表达式
var (
	// 提取URL的正则表达式
	urlRegex = regexp.MustCompile(`https?://[^\s]+`)
	
	// 百度网盘链接和密码提取
	baiduLinkRegex = regexp.MustCompile(`https://pan\.baidu\.com/s/[^?\s]+`)
	baiduPwdRegex  = regexp.MustCompile(`\?pwd=([a-zA-Z0-9]+)`)
)

// NSGameAsyncPlugin NSGame异步插件
type NSGameAsyncPlugin struct {
	*plugin.BaseAsyncPlugin
}

// NSGameResponse API响应结构
type NSGameResponse struct {
	Success bool   `json:"success"`
	Data    struct {
		PageData struct {
			TotalCount int          `json:"totalCount"`
			PageNum    int          `json:"pageNum"`
			Data       []NSGameItem `json:"data"`
		} `json:"pageData"`
		PageView interface{} `json:"pageView"`
	} `json:"data"`
	Code    string      `json:"code"`
	Message interface{} `json:"message"`
}

// NSGameItem 游戏资源项
type NSGameItem struct {
	Name     string `json:"name"`     // 游戏名称
	URL      string `json:"url"`      // 网盘链接（多行文本）
	Password string `json:"password"` // 版本信息
}

// 在init函数中注册插件
func init() {
	plugin.RegisterGlobalPlugin(NewNSGamePlugin())
}

// NewNSGamePlugin 创建新的NSGame异步插件
func NewNSGamePlugin() *NSGameAsyncPlugin {
	return &NSGameAsyncPlugin{
		BaseAsyncPlugin: plugin.NewBaseAsyncPlugin(pluginName, defaultPriority),
	}
}

// Search 执行搜索并返回结果（兼容性方法）
func (p *NSGameAsyncPlugin) Search(keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	result, err := p.SearchWithResult(keyword, ext)
	if err != nil {
		return nil, err
	}
	return result.Results, nil
}

// SearchWithResult 执行搜索并返回包含IsFinal标记的结果
func (p *NSGameAsyncPlugin) SearchWithResult(keyword string, ext map[string]interface{}) (model.PluginSearchResult, error) {
	return p.AsyncSearchWithResult(keyword, p.searchImpl, p.MainCacheKey, ext)
}

// searchImpl 实现具体的搜索逻辑
func (p *NSGameAsyncPlugin) searchImpl(client *http.Client, keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	// 1. 构建搜索URL
	searchURL := fmt.Sprintf("%s?pageNum=1&pageSize=%d&type=&queryName=%s", 
		apiURL, pageSize, url.QueryEscape(keyword))
	
	// 2. 创建带超时的上下文
	ctx, cancel := context.WithTimeout(context.Background(), defaultTimeout)
	defer cancel()
	
	// 3. 创建请求
	req, err := http.NewRequestWithContext(ctx, "GET", searchURL, nil)
	if err != nil {
		return nil, fmt.Errorf("[%s] 创建请求失败: %w", p.Name(), err)
	}
	
	// 4. 设置请求头
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "application/json, text/plain, */*")
	req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
	req.Header.Set("Referer", "https://nsthwj.com/")
	
	// 5. 发送请求（带重试机制）
	resp, err := p.doRequestWithRetry(req, client)
	if err != nil {
		return nil, fmt.Errorf("[%s] 搜索请求失败: %w", p.Name(), err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("[%s] 请求返回状态码: %d", p.Name(), resp.StatusCode)
	}
	
	// 6. 读取响应体
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("[%s] 读取响应失败: %w", p.Name(), err)
	}
	
	// 7. 解析JSON响应
	var apiResp NSGameResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("[%s] JSON解析失败: %w", p.Name(), err)
	}
	
	// 8. 检查响应状态
	if !apiResp.Success || apiResp.Code != "200" {
		return nil, fmt.Errorf("[%s] API返回错误: success=%v, code=%s", p.Name(), apiResp.Success, apiResp.Code)
	}
	
	// 9. 转换为标准格式
	var results []model.SearchResult
	for _, item := range apiResp.Data.PageData.Data {
		// 解析网盘链接
		links := p.parseLinks(item.URL)
		if len(links) == 0 {
			continue
		}
		
		// 生成唯一ID
		uniqueID := p.generateUniqueID(item.Name)
		
		// 将版本信息拼接到标题中
		title := item.Name
		if item.Password != "" {
			// 将换行符替换为空格，使标题更紧凑
			versionInfo := strings.ReplaceAll(item.Password, "\n", " ")
			title = fmt.Sprintf("%s（%s）", item.Name, versionInfo)
		}
		
		// 构建结果
		result := model.SearchResult{
			UniqueID: uniqueID,
			Title:    title, // 标题包含版本信息
			Content:  item.Password, // 保留原始版本信息在Content中
			Links:    links,
			Tags:     []string{"NS游戏", "Switch"},
			Channel:  "", // 插件搜索结果 Channel 必须为空
			Datetime: time.Now(),
		}
		
		results = append(results, result)
	}
	
	// 10. 关键词过滤
	return plugin.FilterResultsByKeyword(results, keyword), nil
}

// parseLinks 解析url字段中的多个网盘链接
func (p *NSGameAsyncPlugin) parseLinks(urlText string) []model.Link {
	var links []model.Link
	
	// 按换行符分割
	lines := strings.Split(urlText, "\n")
	
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		
		// 判断链接类型并提取
		if strings.Contains(line, "[夸克网盘]") {
			// 夸克网盘格式: [夸克网盘]：https://pan.quark.cn/s/xxx
			if url := p.extractURL(line); url != "" && strings.Contains(url, "pan.quark.cn") {
				links = append(links, model.Link{
					Type:     "quark",
					URL:      url,
					Password: "",
				})
			}
		} else if strings.Contains(line, "[UC网盘]") {
			// UC网盘格式: [UC网盘]：https://drive.uc.cn/s/xxx
			if url := p.extractURL(line); url != "" && strings.Contains(url, "drive.uc.cn") {
				links = append(links, model.Link{
					Type:     "uc",
					URL:      url,
					Password: "",
				})
			}
		} else if strings.Contains(line, "pan.baidu.com") {
			// 百度网盘格式: https://pan.baidu.com/s/xxx?pwd=xxxx
			url, password := p.extractBaiduLink(line)
			if url != "" {
				links = append(links, model.Link{
					Type:     "baidu",
					URL:      url,
					Password: password,
				})
			}
		}
	}
	
	return links
}

// extractURL 从文本中提取URL
func (p *NSGameAsyncPlugin) extractURL(text string) string {
	matches := urlRegex.FindString(text)
	return strings.TrimSpace(matches)
}

// extractBaiduLink 从百度网盘链接中提取URL和密码
func (p *NSGameAsyncPlugin) extractBaiduLink(line string) (url, password string) {
	// 提取完整URL
	fullURL := urlRegex.FindString(line)
	if fullURL == "" {
		return
	}
	
	// 提取基础链接
	linkMatches := baiduLinkRegex.FindString(fullURL)
	if linkMatches == "" {
		return
	}
	url = linkMatches
	
	// 提取密码
	pwdMatches := baiduPwdRegex.FindStringSubmatch(fullURL)
	if len(pwdMatches) >= 2 {
		password = pwdMatches[1]
	}
	
	return
}

// generateUniqueID 基于游戏名称生成唯一ID
func (p *NSGameAsyncPlugin) generateUniqueID(gameName string) string {
	// 使用MD5哈希生成稳定的唯一ID
	hash := md5.Sum([]byte(gameName))
	return fmt.Sprintf("%s-%x", p.Name(), hash)[:28]
}

// doRequestWithRetry 带重试机制的HTTP请求
func (p *NSGameAsyncPlugin) doRequestWithRetry(req *http.Request, client *http.Client) (*http.Response, error) {
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
	
	return nil, fmt.Errorf("重试 %d 次后仍然失败: %w", maxRetries, lastErr)
}

