# XYS（小云搜索）插件HTML结构分析

## API流程概述

### 第一步：获取Token
- **请求URL**: `https://www.yunso.net/index/user/s?wd={keyword}&mode=undefined&stype=undefined`
- **方法**: GET
- **Headers**: 
  - `Referer: https://www.yunso.net/`
  - `User-Agent: Mozilla/5.0...`
- **Token提取**: 从返回HTML中匹配 `const DToken = "42b63a003f80bd5ff0a731fcd2a49fd40aefb5e96a46d546abbf92094da54763";`

### 第二步：执行搜索
- **请求URL**: `https://www.yunso.net/api/validate/searchX2`
- **方法**: POST
- **URL参数**:
  - `DToken2={token}`
  - `requestID=undefined`
  - `mode=90002`
  - `stype=undefined`
  - `scope_content=0`
  - `wd={keyword}` (URL编码)
  - `uk=`
  - `page=1`
  - `limit=20`
  - `screen_filetype=`
- **Headers**:
  - `Referer: https://www.yunso.net/`
  - `Content-Type: application/x-www-form-urlencoded`

## 搜索结果结构

### JSON响应格式
```json
{
  "code": 0,
  "msg": "",
  "time": "1755998625",
  "data": "HTML内容"
}
```

### HTML结构 (在data字段中)

#### 搜索结果项
```html
<div class="layui-card" style="..." id="{qid}-{timestamp}-{hash}" data-qid="{qid}">
  <div class="layui-card-header" style="...">
    <div style="...">
      序号、 <span class="layui-badge">24小时内</span>
      <img src="/assets/xyso/icon/filetype_folder.png" style="...">
      <a onclick="open_sid(this)" id="{qid}-{timestamp}-{hash}" 
         url="{base64_url}" href="{real_url}" pa="{password}" target="_blank">
        标题内容
      </a>
    </div>
    <div class="responsive-container">
      <div><i class="layui-icon layui-icon-time"></i> 2025-08-24 22:56:32</div>
      <div>按钮组</div>
    </div>
  </div>
  <div class="layui-card-body">
    <p>
      <span>所有文件共计: 合计 :N/A</span>
      <img src="/assets/xyso/{type}.png" alt="{platform}">
    </p>
  </div>
</div>
```

## 数据提取要点

### 1. 标题提取
- **选择器**: `.layui-card-header a[onclick="open_sid(this)"]`
- **内容**: 链接文本内容，可能包含 `@` 等特殊符号需要清理

### 2. 链接提取
- **属性**: `href` - 真实链接URL
- **属性**: `url` - Base64编码的URL (备用)
- **属性**: `pa` - 提取码/密码

### 3. 时间提取
- **选择器**: `.layui-icon-time` 的父元素或下一个兄弟元素
- **格式**: `2025-08-24 22:56:32`

### 4. 网盘类型提取
- **选择器**: `.layui-card-body img[alt]`
- **类型映射**:
  - `夸克` → quark
  - `百度` → baidu
  - `阿里` → aliyun
  - 等等

### 5. 结果统计
- **总数**: 从顶部 `找到相关结果约 <strong>5919</strong> 个` 提取

## 特殊处理

### 1. 标题清理
- 移除 `@` 符号: `凡@人@修@仙@传` → `凡人修仙传`
- 移除HTML标签: `<font color='red'>凡人修仙传</font>` → `凡人修仙传`

### 2. 链接处理
- 优先使用 `href` 属性
- 如果没有则解码 `url` 属性 (Base64)
- 提取密码从 `pa` 属性

### 3. 时间解析
- 格式: `2025-08-24 22:56:32`
- 转换为标准时间格式

### 4. 网盘识别
- 根据图片alt属性确定网盘类型
- 根据URL域名辅助识别