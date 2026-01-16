package util

import (
	netUrl "net/url"
	"regexp"
	"strings"
)

// 通用网盘链接匹配正则表达式 - 修改为更精确的匹配模式
var AllPanLinksPattern = regexp.MustCompile(`(?i)(?:(?:magnet:\?xt=urn:btih:[a-zA-Z0-9]+)|(?:ed2k://\|file\|[^|]+\|\d+\|[A-Fa-f0-9]+\|/?)|(?:https?://(?:(?:[\w.-]+\.)?(?:pan\.(?:baidu|quark)\.cn|(?:www\.)?(?:alipan|aliyundrive)\.com|drive\.uc\.cn|cloud\.189\.cn|caiyun\.139\.com|(?:www\.)?123(?:684|685|912|pan|592)\.(?:com|cn)|115\.com|115cdn\.com|anxia\.com|pan\.xunlei\.com|mypikpak\.com|pan\.pikpak\.com))(?:/[^\s'"<>()]*)?))`)

// 单独定义各种网盘的链接匹配模式，以便更精确地提取
// 修改百度网盘链接正则表达式，确保只匹配到链接本身，不包含后面的文本
var BaiduPanPattern = regexp.MustCompile(`https?://pan\.baidu\.com/s/[a-zA-Z0-9_-]+(?:\?pwd=[a-zA-Z0-9]{4})?`)
var QuarkPanPattern = regexp.MustCompile(`https?://pan\.quark\.cn/s/[a-zA-Z0-9]+`)
var XunleiPanPattern = regexp.MustCompile(`https?://pan\.xunlei\.com/s/[a-zA-Z0-9]+(?:\?pwd=[a-zA-Z0-9]{4})?(?:#)?`)
// 添加天翼云盘链接正则表达式 - 精确匹配，支持URL编码的访问码
var TianyiPanPattern = regexp.MustCompile(`https?://cloud\.189\.cn/t/[a-zA-Z0-9]+(?:%[0-9A-Fa-f]{2})*(?:（[^）]*）)?`)
// 添加UC网盘链接正则表达式
var UCPanPattern = regexp.MustCompile(`https?://drive\.uc\.cn/s/[a-zA-Z0-9]+(?:\?public=\d)?`)
// 添加123网盘链接正则表达式
var Pan123Pattern = regexp.MustCompile(`https?://(?:www\.)?123(?:684|865|685|912|pan|592)\.(?:com|cn)/s/[a-zA-Z0-9_-]+(?:\?(?:%E6%8F%90%E5%8F%96%E7%A0%81|提取码)[:：][a-zA-Z0-9]+)?`)
// 添加115网盘链接正则表达式
var Pan115Pattern = regexp.MustCompile(`https?://(?:115\.com|115cdn\.com|anxia\.com)/s/[a-zA-Z0-9]+(?:\?password=[a-zA-Z0-9]{4})?(?:#)?`)
// 添加阿里云盘链接正则表达式
var AliyunPanPattern = regexp.MustCompile(`https?://(?:www\.)?(?:alipan|aliyundrive)\.com/s/[a-zA-Z0-9]+`)

// 提取码匹配正则表达式 - 增强提取密码的能力
var PasswordPattern = regexp.MustCompile(`(?i)(?:(?:提取|访问|提取密|密)码|pwd)[：:]\s*([a-zA-Z0-9]{4})(?:[^a-zA-Z0-9]|$)`)
var UrlPasswordPattern = regexp.MustCompile(`(?i)[?&]pwd=([a-zA-Z0-9]{4})(?:[^a-zA-Z0-9]|$)`)

// 百度网盘密码专用正则表达式 - 确保只提取4位密码
var BaiduPasswordPattern = regexp.MustCompile(`(?i)(?:链接：.*?提取码：|密码：|提取码：|pwd=|pwd:|pwd：)([a-zA-Z0-9]{4})(?:[^a-zA-Z0-9]|$)`)

// GetLinkType 获取链接类型
func GetLinkType(url string) string {
	url = strings.ToLower(url)
	
	// 处理可能带有"链接："前缀的情况
	if strings.Contains(url, "链接：") || strings.Contains(url, "链接:") {
		url = strings.Split(url, "链接")[1]
		if strings.HasPrefix(url, "：") || strings.HasPrefix(url, ":") {
			url = url[1:]
		}
		url = strings.TrimSpace(url)
	}
	
	// 根据关键词判断ed2k链接
	if strings.Contains(url, "ed2k:") {
		return "ed2k"
	}
	
	if strings.HasPrefix(url, "magnet:") {
		return "magnet"
	}
	
	if strings.Contains(url, "pan.baidu.com") {
		return "baidu"
	}
	if strings.Contains(url, "pan.quark.cn") {
		return "quark"
	}
	if strings.Contains(url, "alipan.com") || strings.Contains(url, "aliyundrive.com") {
		return "aliyun"
	}
	if strings.Contains(url, "cloud.189.cn") {
		return "tianyi"
	}
	if strings.Contains(url, "drive.uc.cn") {
		return "uc"
	}
	if strings.Contains(url, "caiyun.139.com") {
		return "mobile"
	}
	if strings.Contains(url, "115.com") || strings.Contains(url, "115cdn.com") || strings.Contains(url, "anxia.com") {
		return "115"
	}
	if strings.Contains(url, "mypikpak.com") || strings.Contains(url, "pan.pikpak.com") {
		return "pikpak"
	}
	if strings.Contains(url, "pan.xunlei.com") {
		return "xunlei"
	}
	
	// 123网盘有多个域名
	if strings.Contains(url, "123684.com") || strings.Contains(url, "123685.com") || strings.Contains(url, "123865.com") || 
	   strings.Contains(url, "123912.com") || strings.Contains(url, "123pan.com") || 
	   strings.Contains(url, "123pan.cn") || strings.Contains(url, "123592.com") {
		return "123"
	}
	
	return "others"
}

// CleanBaiduPanURL 清理百度网盘URL，确保链接格式正确
func CleanBaiduPanURL(url string) string {
	// 如果URL包含"https://pan.baidu.com/s/"，提取出正确的链接部分
	if strings.Contains(url, "https://pan.baidu.com/s/") {
		// 找到链接的起始位置
		startIdx := strings.Index(url, "https://pan.baidu.com/s/")
		if startIdx >= 0 {
			// 从起始位置开始提取
			url = url[startIdx:]
			
			// 查找可能的结束标记
			endMarkers := []string{" ", "\n", "\t", "，", "。", "；", ";", "，", ",", "?pwd="}
			minEndIdx := len(url)
			
			for _, marker := range endMarkers {
				idx := strings.Index(url, marker)
				if idx > 0 && idx < minEndIdx {
					minEndIdx = idx
				}
			}
			
			// 如果找到了结束标记，截取到结束标记位置
			if minEndIdx < len(url) {
				url = url[:minEndIdx]
			}
			
			// 特殊处理pwd参数，确保只保留4位密码
			if strings.Contains(url, "?pwd=") {
				pwdIdx := strings.Index(url, "?pwd=")
				if pwdIdx >= 0 && len(url) > pwdIdx+5 { // ?pwd= 有5个字符
					// 只保留?pwd=后面的4位密码
					pwdEndIdx := pwdIdx + 9 // ?pwd=xxxx 总共9个字符
					if pwdEndIdx <= len(url) {
						return url[:pwdEndIdx]
					}
					// 如果剩余字符不足4位，返回所有可用字符
					return url
				}
			}
		}
	}
	return url
}

// CleanTianyiPanURL 清理天翼云盘URL，确保链接格式正确
func CleanTianyiPanURL(url string) string {
	// 如果URL包含"https://cloud.189.cn/t/"，提取出正确的链接部分
	if strings.Contains(url, "https://cloud.189.cn/t/") {
		// 找到链接的起始位置
		startIdx := strings.Index(url, "https://cloud.189.cn/t/")
		if startIdx >= 0 {
			// 从起始位置开始提取
			url = url[startIdx:]
			
			// 查找可能的结束标记
			endMarkers := []string{" ", "\n", "\t", "，", "。", "；", ";", "，", ",", "实时", "天翼", "更多"}
			minEndIdx := len(url)
			
			for _, marker := range endMarkers {
				idx := strings.Index(url, marker)
				if idx > 0 && idx < minEndIdx {
					minEndIdx = idx
				}
			}
			
			// 如果找到了结束标记，截取到结束标记位置
			if minEndIdx < len(url) {
				url = url[:minEndIdx]
			}
			
			// 标准化URL：将URL编码转换为中文，用于去重
			if decoded, err := netUrl.QueryUnescape(url); err == nil {
				url = decoded
			}
		}
	}
	return url
}

// CleanUCPanURL 清理UC网盘URL，确保链接格式正确
func CleanUCPanURL(url string) string {
	// 如果URL包含"https://drive.uc.cn/s/"，提取出正确的链接部分
	if strings.Contains(url, "https://drive.uc.cn/s/") {
		// 找到链接的起始位置
		startIdx := strings.Index(url, "https://drive.uc.cn/s/")
		if startIdx >= 0 {
			// 从起始位置开始提取
			url = url[startIdx:]
			
			// 查找可能的结束标记（包括常见的网盘名称，可能出现在链接后面）
			endMarkers := []string{" ", "\n", "\t", "，", "。", "；", ";", "，", ",", "网盘", "123", "夸克", "阿里", "百度"}
			minEndIdx := len(url)
			
			for _, marker := range endMarkers {
				idx := strings.Index(url, marker)
				if idx > 0 && idx < minEndIdx {
					minEndIdx = idx
				}
			}
			
			// 如果找到了结束标记，截取到结束标记位置
			if minEndIdx < len(url) {
				return url[:minEndIdx]
			}
			
			// 处理public参数
			if strings.Contains(url, "?public=") {
				publicIdx := strings.Index(url, "?public=")
				if publicIdx > 0 {
					// 确保只保留?public=1这样的参数，不包含后面的文本
					if publicIdx+9 <= len(url) { // ?public=1 总共9个字符
						return url[:publicIdx+9]
					}
					return url[:publicIdx+8] // 如果参数不完整，至少保留?public=
				}
			}
		}
	}
	return url
}

// Clean123PanURL 清理123网盘URL，确保链接格式正确
func Clean123PanURL(url string) string {
	// 检查是否为123网盘链接
	domains := []string{"123684.com", "123685.com","123865.com", "123912.com", "123pan.com", "123pan.cn", "123592.com"}
	isDomain123 := false
	
	for _, domain := range domains {
		if strings.Contains(url, domain+"/s/") {
			isDomain123 = true
			break
		}
	}
	
	if isDomain123 {
		// 确保链接有协议头
		hasProtocol := strings.HasPrefix(url, "http://") || strings.HasPrefix(url, "https://")
		
		// 找到链接的起始位置
		startIdx := -1
		for _, domain := range domains {
			if idx := strings.Index(url, domain+"/s/"); idx >= 0 {
				startIdx = idx
				break
			}
		}
		
		if startIdx >= 0 {
			// 如果链接没有协议头，添加协议头
			if !hasProtocol {
				// 提取链接部分
				linkPart := url[startIdx:]
				// 添加协议头
				url = "https://" + linkPart
			} else if startIdx > 0 {
				// 如果链接有协议头，但可能包含前缀文本，提取完整URL
				protocolIdx := strings.Index(url, "://")
				if protocolIdx >= 0 {
					protocol := url[:protocolIdx+3]
					url = protocol + url[startIdx:]
				}
			}
			
			// 保留提取码参数，但需要处理可能的表情符号和其他无关文本
			// 查找可能的结束标记（表情符号、标签标识等）
			// 注意：我们不再将"提取码"作为结束标记，因为它是URL的一部分
			endMarkers := []string{" ", "\n", "\t", "，", "。", "；", ";", "，", ",", "📁", "🔍", "标签", "🏷", "📎", "🔗", "📌", "📋", "📂", "🗂️", "🔖", "📚", "📒", "📔", "📕", "📓", "📗", "📘", "📙", "📄", "📃", "📑", "🧾", "📊", "📈", "📉", "🗒️", "🗓️", "📆", "📅", "🗑️", "🔒", "🔓", "🔏", "🔐", "🔑", "🗝️"}
			minEndIdx := len(url)
			
			for _, marker := range endMarkers {
				idx := strings.Index(url, marker)
				if idx > 0 && idx < minEndIdx {
					minEndIdx = idx
				}
			}
			
			// 如果找到了结束标记，截取到结束标记位置
			if minEndIdx < len(url) {
				return url[:minEndIdx]
			}
			
			// 标准化URL编码的提取码，统一使用非编码形式
			if strings.Contains(url, "%E6%8F%90%E5%8F%96%E7%A0%81") {
				url = strings.Replace(url, "%E6%8F%90%E5%8F%96%E7%A0%81", "提取码", 1)
			}
		}
	}
	return url
}

// Clean115PanURL 清理115网盘URL，确保链接格式正确
func Clean115PanURL(url string) string {
	// 检查是否为115网盘链接
	if strings.Contains(url, "115.com/s/") || strings.Contains(url, "115cdn.com/s/") || strings.Contains(url, "anxia.com/s/") {
		// 找到链接的起始位置
		startIdx := -1
		if idx := strings.Index(url, "115.com/s/"); idx >= 0 {
			startIdx = idx
		} else if idx := strings.Index(url, "115cdn.com/s/"); idx >= 0 {
			startIdx = idx
		} else if idx := strings.Index(url, "anxia.com/s/"); idx >= 0 {
			startIdx = idx
		}
		
		if startIdx >= 0 {
			// 确保链接有协议头
			hasProtocol := strings.HasPrefix(url, "http://") || strings.HasPrefix(url, "https://")
			
			// 如果链接没有协议头，添加协议头
			if !hasProtocol {
				// 提取链接部分
				linkPart := url[startIdx:]
				// 添加协议头
				url = "https://" + linkPart
			} else if startIdx > 0 {
				// 如果链接有协议头，但可能包含前缀文本，提取完整URL
				protocolIdx := strings.Index(url, "://")
				if protocolIdx >= 0 {
					protocol := url[:protocolIdx+3]
					url = protocol + url[startIdx:]
				}
			}
			
			// 如果链接包含password参数，确保只保留到password=xxxx部分（4位密码）
			if strings.Contains(url, "?password=") {
				pwdIdx := strings.Index(url, "?password=")
				if pwdIdx > 0 && pwdIdx+14 <= len(url) { // ?password=xxxx 总共14个字符
					// 截取到密码后面4位
					url = url[:pwdIdx+14]
					return url
				}
			}
			
			// 如果链接包含#，截取到#位置
			hashIdx := strings.Index(url, "#")
			if hashIdx > 0 {
				url = url[:hashIdx]
				return url
			}
		}
	}
	return url
}

// CleanAliyunPanURL 清理阿里云盘URL，确保链接格式正确
func CleanAliyunPanURL(url string) string {
	// 如果URL包含阿里云盘域名，提取出正确的链接部分
	if strings.Contains(url, "alipan.com/s/") || strings.Contains(url, "aliyundrive.com/s/") {
		// 找到链接的起始位置和域名部分
		startIdx := -1
		
		if idx := strings.Index(url, "www.alipan.com/s/"); idx >= 0 {
			startIdx = idx
		} else if idx := strings.Index(url, "alipan.com/s/"); idx >= 0 {
			startIdx = idx
		} else if idx := strings.Index(url, "www.aliyundrive.com/s/"); idx >= 0 {
			startIdx = idx
		} else if idx := strings.Index(url, "aliyundrive.com/s/"); idx >= 0 {
			startIdx = idx
		}
		
		if startIdx >= 0 {
			// 确保链接有协议头
			hasProtocol := strings.HasPrefix(url, "http://") || strings.HasPrefix(url, "https://")
			
			// 如果链接没有协议头，添加协议头
			if !hasProtocol {
				// 提取链接部分
				linkPart := url[startIdx:]
				// 添加协议头
				url = "https://" + linkPart
			} else if startIdx > 0 {
				// 如果链接有协议头，但可能包含前缀文本，提取完整URL
				protocolIdx := strings.Index(url, "://")
				if protocolIdx >= 0 {
					protocol := url[:protocolIdx+3]
					url = protocol + url[startIdx:]
				}
			}
			
			// 查找可能的结束标记（表情符号、标签标识等）
			endMarkers := []string{" ", "\n", "\t", "，", "。", "；", ";", "，", ",", "📁", "🔍", "标签", "🏷", "📎", "🔗", "📌", "📋", "📂", "🗂️", "🔖", "📚", "📒", "📔", "📕", "📓", "📗", "📘", "📙", "📄", "📃", "📑", "🧾", "📊", "📈", "📉", "🗒️", "🗓️", "📆", "📅", "🗑️", "🔒", "🔓", "🔏", "🔐", "🔑", "🗝️"}
			minEndIdx := len(url)
			
			for _, marker := range endMarkers {
				idx := strings.Index(url, marker)
				if idx > 0 && idx < minEndIdx {
					minEndIdx = idx
				}
			}
			
			// 如果找到了结束标记，截取到结束标记位置
			if minEndIdx < len(url) {
				return url[:minEndIdx]
			}
		}
	}
	return url
}

// normalizeAliyunPanURL 标准化阿里云盘URL，确保链接格式正确
func normalizeAliyunPanURL(url string, password string) string {
	// 清理URL，确保获取正确的链接部分
	url = CleanAliyunPanURL(url)
	
	// 阿里云盘链接通常不在URL中包含密码参数
	// 但是我们确保返回的是干净的链接
	return url
}

// ExtractPassword 提取链接密码
func ExtractPassword(content, url string) string {
	// 特殊处理天翼云盘URL中的访问码
	if strings.Contains(url, "cloud.189.cn") {
		// 天翼云盘访问码格式：（访问码：xxxx）或者URL编码形式
		tianyiPasswordPattern := regexp.MustCompile(`(?:（访问码：|%EF%BC%88%E8%AE%BF%E9%97%AE%E7%A0%81%EF%BC%9A)([a-zA-Z0-9]+)(?:）|%EF%BC%89)`)
		tianyiMatches := tianyiPasswordPattern.FindStringSubmatch(url)
		if len(tianyiMatches) > 1 {
			return tianyiMatches[1]
		}
	}
	
	// 特殊处理迅雷网盘URL中的pwd参数
	if strings.Contains(url, "pan.xunlei.com") && strings.Contains(url, "?pwd=") {
		pwdPattern := regexp.MustCompile(`\?pwd=([a-zA-Z0-9]{4})`)
		pwdMatches := pwdPattern.FindStringSubmatch(url)
		if len(pwdMatches) > 1 {
			return pwdMatches[1]
		}
	}
	
	// 先从URL中提取密码
	matches := UrlPasswordPattern.FindStringSubmatch(url)
	if len(matches) > 1 {
		return matches[1]
	}
	
	// 特殊处理115网盘URL中的密码
	if (strings.Contains(url, "115.com") || 
		strings.Contains(url, "115cdn.com") || 
		strings.Contains(url, "anxia.com")) && 
		strings.Contains(url, "password=") {
		
		// 尝试从URL中提取密码
		passwordPattern := regexp.MustCompile(`password=([a-zA-Z0-9]{4})`)
		passwordMatches := passwordPattern.FindStringSubmatch(url)
		if len(passwordMatches) > 1 {
			return passwordMatches[1]
		}
	}
	
	// 特殊处理123网盘URL中的提取码
	if (strings.Contains(url, "123684.com") || 
		strings.Contains(url, "123685.com") || 
		strings.Contains(url, "123865.com") || 
		strings.Contains(url, "123912.com") || 
		strings.Contains(url, "123pan.com") || 
		strings.Contains(url, "123pan.cn") || 
		strings.Contains(url, "123592.com")) && 
		(strings.Contains(url, "提取码") || strings.Contains(url, "%E6%8F%90%E5%8F%96%E7%A0%81")) {
		
		// 尝试从URL中提取提取码（处理普通文本和URL编码两种情况）
		extractCodePattern := regexp.MustCompile(`(?:提取码|%E6%8F%90%E5%8F%96%E7%A0%81)[:：]([a-zA-Z0-9]+)`)
		codeMatches := extractCodePattern.FindStringSubmatch(url)
		if len(codeMatches) > 1 {
			return codeMatches[1]
		}
	}
	
	// 检查123网盘URL中的提取码参数
	if (strings.Contains(url, "123684.com") || 
		strings.Contains(url, "123685.com") || 
		strings.Contains(url, "123865.com") || 
		strings.Contains(url, "123912.com") || 
		strings.Contains(url, "123pan.com") || 
		strings.Contains(url, "123pan.cn") || 
		strings.Contains(url, "123592.com")) && 
		strings.Contains(url, "提取码") {
		
		// 尝试从URL中提取提取码
		parts := strings.Split(url, "提取码")
		if len(parts) > 1 {
			// 提取码通常跟在冒号后面
			codeStart := strings.IndexAny(parts[1], ":：")
			if codeStart >= 0 && codeStart+1 < len(parts[1]) {
				// 提取冒号后面的内容，去除空格
				code := strings.TrimSpace(parts[1][codeStart+1:])
				
				// 如果提取码后面有其他字符（如表情符号、标签等），只取提取码部分
				// 增加更多可能的结束标记
				endIdx := strings.IndexAny(code, " \t\n\r，。；;,🏷📁🔍📎🔗📌📋📂🗂️🔖📚📒📔📕📓📗📘📙📄📃📑🧾📊📈📉🗒️🗓️📆��🗑️🔒🔓🔏🔐🔑🗝️")
				if endIdx > 0 {
					code = code[:endIdx]
				}
				
				// 去除可能的空格和其他无关字符
				code = strings.TrimSpace(code)
				
				// 确保提取码是有效的（通常是4位字母数字）
				if len(code) > 0 && len(code) <= 6 && isValidPassword(code) {
					return code
				}
			}
		}
	}
	
	// 检查内容中是否包含"提取码"字样
	if strings.Contains(content, "提取码") {
		// 尝试从内容中提取提取码
		parts := strings.Split(content, "提取码")
		for _, part := range parts {
			if len(part) > 0 {
				// 提取码通常跟在冒号后面
				codeStart := strings.IndexAny(part, ":：")
				if codeStart >= 0 && codeStart+1 < len(part) {
					// 提取冒号后面的内容，去除空格
					code := strings.TrimSpace(part[codeStart+1:])
					
					// 如果提取码后面有其他字符，只取提取码部分
					endIdx := strings.IndexAny(code, " \t\n\r，。；;,🏷📁🔍📎🔗📌📋📂🗂️🔖📚📒📔📕📓📗📘📙📄📃📑🧾📊📈📉🗒️🗓️📆📅🗑️🔒🔓🔏🔐🔑🗝️")
					if endIdx > 0 {
						code = code[:endIdx]
					} else {
						// 如果没有明显的结束标记，假设提取码是4-6位字符
						if len(code) > 6 {
							// 检查前4-6位是否是有效的提取码
							for i := 4; i <= 6 && i <= len(code); i++ {
								if isValidPassword(code[:i]) {
									code = code[:i]
									break
								}
							}
							// 如果没有找到有效的提取码，取前4位
							if len(code) > 6 {
								code = code[:4]
							}
						}
					}
					
					// 去除可能的空格和其他无关字符
					code = strings.TrimSpace(code)
					
					// 如果提取码不为空且是有效的，返回
					if code != "" && isValidPassword(code) {
						return code
					}
				}
			}
		}
	}
	
	// 再从内容中提取密码
	// 对于百度网盘链接，尝试查找特定格式的密码
	if strings.Contains(strings.ToLower(url), "pan.baidu.com") {
		// 尝试匹配百度网盘特定格式的密码
		baiduMatches := BaiduPasswordPattern.FindStringSubmatch(content)
		if len(baiduMatches) > 1 {
			return baiduMatches[1]
		}
	}
	
	// 通用密码提取
	matches = PasswordPattern.FindStringSubmatch(content)
	if len(matches) > 1 {
		return matches[1]
	}
	
	return ""
}

// isValidPassword 检查提取码是否有效（只包含字母和数字）
func isValidPassword(password string) bool {
	for _, c := range password {
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')) {
			return false
		}
	}
	return true
}

// ExtractNetDiskLinks 从文本中提取所有网盘链接
func ExtractNetDiskLinks(text string) []string {
	var links []string
	
	// 提取百度网盘链接
	baiduMatches := BaiduPanPattern.FindAllString(text, -1)
	for _, match := range baiduMatches {
		// 清理并添加百度网盘链接
		cleanURL := CleanBaiduPanURL(match)
		// 确保链接末尾不包含https
		if strings.HasSuffix(cleanURL, "https") {
			cleanURL = cleanURL[:len(cleanURL)-5]
		}
		if cleanURL != "" {
			links = append(links, cleanURL)
		}
	}
	
	// 提取天翼云盘链接
	tianyiMatches := TianyiPanPattern.FindAllString(text, -1)
	for _, match := range tianyiMatches {
		// 清理并添加天翼云盘链接
		cleanURL := CleanTianyiPanURL(match)
		// 确保链接末尾不包含https
		if strings.HasSuffix(cleanURL, "https") {
			cleanURL = cleanURL[:len(cleanURL)-5]
		}
		if cleanURL != "" {
			links = append(links, cleanURL)
		}
	}
	
	// 提取UC网盘链接
	ucMatches := UCPanPattern.FindAllString(text, -1)
	for _, match := range ucMatches {
		// 清理并添加UC网盘链接
		cleanURL := CleanUCPanURL(match)
		// 确保链接末尾不包含https
		if strings.HasSuffix(cleanURL, "https") {
			cleanURL = cleanURL[:len(cleanURL)-5]
		}
		if cleanURL != "" {
			links = append(links, cleanURL)
		}
	}
	
	// 提取123网盘链接
	pan123Matches := Pan123Pattern.FindAllString(text, -1)
	for _, match := range pan123Matches {
		// 清理并添加123网盘链接
		cleanURL := Clean123PanURL(match)
		// 确保链接末尾不包含https
		if strings.HasSuffix(cleanURL, "https") {
			cleanURL = cleanURL[:len(cleanURL)-5]
		}
		if cleanURL != "" {
			// 检查是否已经存在相同的链接（比较完整URL）
			isDuplicate := false
			for _, existingLink := range links {
				// 标准化链接以进行比较（仅移除协议）
				normalizedExisting := normalizeURLForComparison(existingLink)
				normalizedNew := normalizeURLForComparison(cleanURL)
				
				if normalizedExisting == normalizedNew {
					isDuplicate = true
					break
				}
			}
			
			if !isDuplicate {
				links = append(links, cleanURL)
			}
		}
	}
	
	// 提取115网盘链接
	pan115Matches := Pan115Pattern.FindAllString(text, -1)
	for _, match := range pan115Matches {
		// 清理并添加115网盘链接
		cleanURL := Clean115PanURL(match) // 115网盘链接的清理逻辑与123网盘类似
		// 确保链接末尾不包含https
		if strings.HasSuffix(cleanURL, "https") {
			cleanURL = cleanURL[:len(cleanURL)-5]
		}
		if cleanURL != "" {
			// 检查是否已经存在相同的链接（比较完整URL）
			isDuplicate := false
			for _, existingLink := range links {
				normalizedExisting := normalizeURLForComparison(existingLink)
				normalizedNew := normalizeURLForComparison(cleanURL)
				
				if normalizedExisting == normalizedNew {
					isDuplicate = true
					break
				}
			}
			
			if !isDuplicate {
				links = append(links, cleanURL)
			}
		}
	}
	
	// 提取阿里云盘链接
	aliyunMatches := AliyunPanPattern.FindAllString(text, -1)
	if aliyunMatches != nil {
		for _, match := range aliyunMatches {
			// 清理并添加阿里云盘链接
			cleanURL := CleanAliyunPanURL(match)
			// 确保链接末尾不包含https
			if strings.HasSuffix(cleanURL, "https") {
				cleanURL = cleanURL[:len(cleanURL)-5]
			}
			if cleanURL != "" {
				// 检查是否已经存在相同的链接
				isDuplicate := false
				for _, existingLink := range links {
					normalizedExisting := normalizeURLForComparison(existingLink)
					normalizedNew := normalizeURLForComparison(cleanURL)
					
					if normalizedExisting == normalizedNew {
						isDuplicate = true
						break
					}
				}
				
				if !isDuplicate {
					links = append(links, cleanURL)
				}
			}
		}
	}
	
	// 提取夸克网盘链接
	quarkLinks := QuarkPanPattern.FindAllString(text, -1)
	if quarkLinks != nil {
		for _, match := range quarkLinks {
			// 确保链接末尾不包含https
			cleanURL := match
			if strings.HasSuffix(cleanURL, "https") {
				cleanURL = cleanURL[:len(cleanURL)-5]
			}
			// 检查是否已经存在相同的链接
			isDuplicate := false
			for _, existingLink := range links {
				if strings.Contains(existingLink, cleanURL) || strings.Contains(cleanURL, existingLink) {
					isDuplicate = true
					break
				}
			}
			
			if !isDuplicate {
				links = append(links, cleanURL)
			}
		}
	}
	
	// 提取迅雷网盘链接
	xunleiLinks := XunleiPanPattern.FindAllString(text, -1)
	if xunleiLinks != nil {
		for _, match := range xunleiLinks {
			// 确保链接末尾不包含https
			cleanURL := match
			if strings.HasSuffix(cleanURL, "https") {
				cleanURL = cleanURL[:len(cleanURL)-5]
			}
			// 检查是否已经存在相同的链接
			isDuplicate := false
			for _, existingLink := range links {
				if strings.Contains(existingLink, cleanURL) || strings.Contains(cleanURL, existingLink) {
					isDuplicate = true
					break
				}
			}
			
			if !isDuplicate {
				links = append(links, cleanURL)
			}
		}
	}
	
	// 使用通用模式提取其他可能的链接
	otherLinks := AllPanLinksPattern.FindAllString(text, -1)
	if otherLinks != nil {
		// 过滤掉已经添加过的链接
		for _, link := range otherLinks {
			// 确保链接末尾不包含https
			cleanURL := link
			if strings.HasSuffix(cleanURL, "https") {
				cleanURL = cleanURL[:len(cleanURL)-5]
			}
			// 跳过百度、夸克、迅雷、天翼、UC和123网盘链接，因为已经单独处理过
			if strings.Contains(cleanURL, "pan.baidu.com") || 
			   strings.Contains(cleanURL, "pan.quark.cn") || 
			   strings.Contains(cleanURL, "pan.xunlei.com") ||
			   strings.Contains(cleanURL, "cloud.189.cn") ||
			   strings.Contains(cleanURL, "drive.uc.cn") ||
			   strings.Contains(cleanURL, "123684.com") ||
			   strings.Contains(cleanURL, "123685.com") ||
			   strings.Contains(cleanURL, "123865.com") ||
			   strings.Contains(cleanURL, "123912.com") ||
			   strings.Contains(cleanURL, "123pan.com") ||
			   strings.Contains(cleanURL, "123pan.cn") ||
			   strings.Contains(cleanURL, "123592.com") {
				continue
			}
			
			isDuplicate := false
			for _, existingLink := range links {
				normalizedExisting := normalizeURLForComparison(existingLink)
				normalizedNew := normalizeURLForComparison(cleanURL)
				
				// 使用完整URL比较，包括www.前缀
				if normalizedExisting == normalizedNew || 
				   strings.Contains(normalizedExisting, normalizedNew) || 
				   strings.Contains(normalizedNew, normalizedExisting) {
					isDuplicate = true
					break
				}
			}
			
			if !isDuplicate {
				links = append(links, cleanURL)
			}
		}
	}
	
	return links
}

// normalizeURLForComparison 标准化URL以便于比较
// 移除协议头，标准化提取码，保留完整域名用于比较
func normalizeURLForComparison(url string) string {
	// 移除协议头
	if idx := strings.Index(url, "://"); idx >= 0 {
		url = url[idx+3:]
	}
	
	// 标准化URL编码的提取码，统一使用非编码形式
	if strings.Contains(url, "%E6%8F%90%E5%8F%96%E7%A0%81") {
		url = strings.Replace(url, "%E6%8F%90%E5%8F%96%E7%A0%81", "提取码", 1)
	}
	
	return url
} 
