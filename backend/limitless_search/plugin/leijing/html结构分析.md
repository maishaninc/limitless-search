# leijing插件HTML结构分析

## 网站信息
- 网站名称：雷鲸小站-天翼云盘交流站
- 主域名：https://leijing.xyz
- 网站类型：天翼云盘资源分享论坛
- 特点：
  - **专注天翼云盘**（只有天翼云盘链接）
  - 部分帖子需要回复才能看到链接（这些会被自动忽略）
  - 有些搜索结果直接在摘要中包含链接

## 1. 搜索页面结构

### 搜索URL格式
```
https://leijing.xyz/search?keyword={关键词}
```

### 搜索结果容器
- 主容器：`<div class="topicModule">`
- 结果列表：`<div class="topicList">`
- 单个结果项：`<div class="topicItem">`

### 搜索结果项结构
```html
<div class="topicItem">
    <div class="avatarBox">
        <!-- 用户头像 -->
    </div>
    
    <div class="content clearfix">
        <ul class="info">
            <li>
                <span class="module">话题</span>
                <span class="tag">剧集</span>
                <a class="userName" href="...">用户名</a>
                <span class="postTime">发表时间：2025-07-27 12:15:41</span>
                <span class="lastReplyTime">最新回复：2025-08-09 18:48:25</span>
            </li>
        </ul>
        <h2 class="title highlight clearfix">
            <a href="thread?topicId=42230">凡人修仙传 (2025) 杨洋/金晨 4K 普码+高码 首更 04 集</a>
        </h2>
        <div class="detail">
            <h2 class="summary highlight">
                凡人修仙传 (2025) 杨洋/金晨 首更 04 集 
                普码 -https://cloud.189.cn/t/YZRfuuAnaeQz 
                4K60 帧 -https://cloud.189.cn/t/aiuYru7zIfqq 
                4KHQ 高码 - https://cloud.189.cn/t/RZBjQ3Y77ZNb
            </h2>
        </div>
    </div>
    
    <div class="statistic clearfix">
        <div class="viewTotal">
            <i class="cms-view icon"></i>
            7442
        </div>
        <div class="commentTotal">
            <i class="cms-commentCount icon"></i>
            3
        </div>
    </div>
</div>
```

### 字段提取要点
- **标题**：`.title a` 的文本内容
- **详情页链接**：`.title a` 的 `href` 属性（格式：`thread?topicId={id}`）
- **摘要**：`.summary` 的文本内容（可能包含天翼云盘链接）
- **分类标签**：`.tag` 的文本内容
- **发布时间**：`.postTime` 的文本内容
- **查看数**：`.viewTotal` 的文本内容
- **评论数**：`.commentTotal` 的文本内容

### 天翼云盘链接提取
从摘要文本中使用正则表达式提取：
```
https://cloud.189.cn/t/[a-zA-Z0-9]+
```

## 2. 详情页面结构

### 详情页URL格式
```
https://leijing.xyz/thread?topicId={id}
```

### 页面结构
```html
<div class="topicContentModule">
    <div class="left">
        <div class="topic-wrap">
            <div class="topicBox">
                <div class="title">
                    凡人修仙传 (2025) 杨洋/金晨 4K 普码+高码 首更 04 集
                </div>
                <div class="topicInfo clearfix">
                    <div class="postTime">2025-07-27 12:15:41</div>
                    <div class="viewTotal">7443次阅读</div>
                    <div class="comment">3个评论</div>
                </div>
                <div topicId="42230" class="topicContent">
                    <div style="text-align: center;">
                        <strong>凡人修仙传 (2025) 杨洋/金晨 首更 04 集</strong>
                        <br><strong>普码</strong>
                        <br><strong><a href="https://cloud.189.cn/t/YZRfuuAnaeQz">https://cloud.189.cn/t/YZRfuuAnaeQz</a></strong>
                        <br><strong>4K60 帧</strong>
                        <br><strong><a href="https://cloud.189.cn/t/aiuYru7zIfqq">https://cloud.189.cn/t/aiuYru7zIfqq</a></strong>
                        <!-- 更多内容 -->
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
```

### 字段提取要点
- **标题**：`.topicBox .title` 的文本内容
- **内容**：`.topicContent` 的HTML内容
- **发布时间**：`.topicInfo .postTime` 的文本内容
- **查看数**：`.topicInfo .viewTotal` 的文本内容

### 天翼云盘链接提取
从详情页内容中提取：
1. 查找所有 `<a>` 标签
2. 过滤出包含 `cloud.189.cn` 的链接
3. 提取 `href` 属性

## 3. 特殊处理事项

### 回复可见内容
- 有些帖子内容需要回复才能看到
- 这类帖子通常不包含可提取的链接
- 如果提取不到链接，直接忽略该结果

### 链接格式统一
天翼云盘链接格式：
- 正常格式：`https://cloud.189.cn/t/{shareCode}`
- 部分可能有访问码：`https://cloud.189.cn/t/{shareCode}?pwd={password}`

### 搜索策略
1. 先从搜索结果的摘要中提取链接（速度快）
2. 如果摘要中有链接，直接使用
3. 如果摘要中没有链接，访问详情页提取
4. 如果详情页也没有链接（需要回复），忽略该结果

## 4. 实现建议

### 优化策略
1. **优先使用摘要链接**：很多搜索结果的摘要中已包含完整链接
2. **批量处理**：对需要访问详情页的结果进行并发处理
3. **缓存机制**：缓存详情页结果，避免重复访问

### 错误处理
1. 处理需要回复才能看到的内容（返回空结果）
2. 处理链接提取失败的情况
3. 处理网站访问异常

### 链接类型
所有链接统一标记为 `tianyi`（天翼云盘）