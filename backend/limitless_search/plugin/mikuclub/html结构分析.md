# mikuclub (初音社) HTML结构分析

## 页面概览
- 详情页 URL: `https://www.mikuclub.uk/{post_id}`
- 主体容器：`div.article_content`
- 常见内容顺序：
  1. 顶部广告表格/图片
  2. 资源简介（`<p>` 或 `<blockquote>`）
  3. 下载链接段落（`链接：...`、`地址：...`）
  4. 标签、入群提示、二维码等

## 关键节点

| 数据项 | 选择器/特征 | 说明 |
|--------|-------------|------|
| 标题 | `.post .title h1` | 文章标题 |
| 作者/分类/时间 | `.post .title .info span` | 包含 `<i class="fa fa-user">`、`fa-columns`、`fa-clock-o` |
| 正文 | `div.article_content` | 下载信息、描述等均位于此 |
| 标签 | `span.tag a` | 站内标签 |
| 相关推荐 | `div.related li` | 可忽略 |

## 下载链接形态

### 1. 标准段落
```html
<p>链接：<a href="https://pan.quark.cn/s/08211da2cb83" rel="nofollow">https://pan.quark.cn/s/08211da2cb83</a></p>
<p>百度：https://pan.baidu.com/s/1_BG5kkk... ?pwd=2222</p>
```

### 2. 文本块
```html
<p>https://pan.quark.cn/s/c3ec23e8f698</p>
<p>夸克网盘：<a href="https://pan.quark.cn/s/0d70b5e3b554">点击跳转</a></p>
```

### 3. 表格/列表
```html
<table>
  <tr><td>夸克：</td><td><a href="https://pan.quark.cn/s/bee413c5e8e8">https://pan.quark.cn/s/bee413c5e8e8</a></td></tr>
</table>
```

### 提取码位置
- 链接参数：`https://pan.baidu.com/... ?pwd=2222`
- 同段文本：`提取码：xxxx`、`密码：xxxx`
- 邻近节点（`<span>`、`<strong>` 等）

## 实现提示
1. 解析时优先选择 `.article_content`，若不存在则退回 `article.post` 或 `body`。
2. 使用 goquery 遍历 `<a href>`，根据域名判断网盘类型。
3. 对正文纯文本执行正则匹配，捕获未包裹 `<a>` 的 URL。
4. 在链接文本、`title`、父节点和相邻节点中搜索提取码关键词；若无则再在链接上下文文本中匹配。
5. 过滤广告/站内跳转链接（无网盘域名）。

## 支持的网盘域名
- 夸克：`pan.quark.cn/s/`、`pan.quark.cn/g/`
- 百度：`pan.baidu.com/s/`
- 阿里云盘：`www.aliyundrive.com/s/`
- 迅雷：`pan.xunlei.com/s/`
- 123网盘：`123pan.com/s/`
- 可按需继续扩展（迅雷群等）

