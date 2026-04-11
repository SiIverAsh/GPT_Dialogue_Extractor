# 项目结构说明

这份文档只解释当前项目的目录职责和主要文件作用，方便快速建立整体认知。

## 根目录

### [manifest.json](../manifest.json)

扩展入口文件。

负责声明：

- 扩展名称、版本、描述
- `downloads` 权限
- 后台 `service_worker`
- content script 注入规则
- 匹配的站点范围

当前运行时最关键的配置就在这里。

### [package.json](../package.json)

项目元信息文件。

目前这个项目没有复杂构建流程，这个文件主要用来保留项目名称和基础 npm 元信息。

### [tsconfig.json](../tsconfig.json)

TypeScript 配置。

当前项目现在采用：

- `TypeScript` 作为运行时代码源码
- 编译生成的 `JavaScript` 作为扩展真正加载的文件

所以这里既有开发用的 `tsconfig.json`，也有构建用的 `tsconfig.build.json`。

### [tsconfig.build.json](../tsconfig.build.json)

运行时代码构建配置。

这个文件负责把：

- `src/content/index.ts`
- `src/background/index.ts`

编译回扩展实际运行的：

- `src/content/index.js`
- `src/background/index.js`

### [README.md](../README.md)

中文版使用说明。

### [README.en.md](../README.en.md)

英文版使用说明。

## docs

### [docs/ARCHITECTURE.md](./ARCHITECTURE.md)

架构设计说明。

主要解释为什么项目要拆成：

- 平台无关导出核心
- ChatGPT 平台适配层

这个文件更偏设计思路，不是运行时代码。

### [docs/CHATGPT_ADAPTATION_NOTES.md](./CHATGPT_ADAPTATION_NOTES.md)

ChatGPT 页面适配记录。

主要记录：

- DOM 结构观察结果
- selector 选择思路
- 历史加载策略
- 入口注入位置

这个文件偏分析记录。

### [docs/PROJECT_STRUCTURE.zh-CN.md](./PROJECT_STRUCTURE.zh-CN.md)

当前这份结构说明文档。

## src

`src` 是主代码目录。

它可以分成两部分看：

1. 现在真正参与运行的文件
2. 为后续扩展保留的架构文件

---

## 运行时主链路

### [src/content/index.ts](../src/content/index.ts)

运行时 content script 的 TypeScript 源码。

这是当前项目真正应该维护的 content 主文件。

### [src/content/index.js](../src/content/index.js)

这是由 `src/content/index.ts` 生成的运行时文件。

它负责几乎所有核心能力：

- 注入顶部导出按钮
- 注入导出弹层
- 注入右侧时间轴
- 观察页面变化并重新刷新时间轴/工具栏
- 识别当前会话里的消息节点
- 向上滚动补齐历史
- 读取用户消息和助手消息
- 提取代码块和公式
- 生成 JSON / Markdown / PDF
- 请求后台触发下载

如果你要改逻辑，优先改 `src/content/index.ts`，不要直接改生成后的 `src/content/index.js`。

### [src/content/styles.css](../src/content/styles.css)

content script 的补充样式。

虽然 `index.js` 里已经有很多内联样式，但这个文件仍然负责一些基础样式定义。

### [src/background/index.ts](../src/background/index.ts)

后台 service worker 的 TypeScript 源码。

### [src/background/index.js](../src/background/index.js)

由 `src/background/index.ts` 生成的后台运行文件。

职责很单一：

- 接收 content script 发来的下载请求
- 调用 `chrome.downloads.download`
- 触发浏览器保存文件

当前它不负责复杂业务逻辑，主要是下载桥接层。

---

## 架构层文件

这些文件目前更多是“结构预留”和“后续扩展设计”，不是当前 MVP 的核心运行链。

### [src/index.ts](../src/index.ts)

一个很轻的统一入口文件，偏结构占位。

### [src/core/export/types.ts](../src/core/export/types.ts)

导出相关类型定义。

比如：

- 会话数据结构
- 导出请求结构
- 平台适配层需要返回的数据格式

### [src/core/export/ExporterCore.ts](../src/core/export/ExporterCore.ts)

平台无关的导出核心抽象。

它的职责是定义一个统一的导出流程，让不同平台以后都能接进来，而不把逻辑完全写死在 ChatGPT 上。

### [src/platforms/shared/PlatformAdapter.ts](../src/platforms/shared/PlatformAdapter.ts)

平台适配器接口。

它定义了适配层应该提供哪些能力，例如：

- 是否匹配当前页面
- 如何定位入口
- 如何补齐历史
- 如何收集会话

### [src/platforms/chatgpt/ChatGPTAdapter.ts](../src/platforms/chatgpt/ChatGPTAdapter.ts)

ChatGPT 平台适配器骨架。

这个文件主要保留了 ChatGPT 平台抽象的设计方向。

### [src/platforms/chatgpt/ChatGPTSelectors.ts](../src/platforms/chatgpt/ChatGPTSelectors.ts)

ChatGPT DOM selector 的说明与候选定义。

它的意义主要是把“页面依赖点”集中起来，而不是散落在各处。

### [src/platforms/chatgpt/history/HistoryLoader.ts](../src/platforms/chatgpt/history/HistoryLoader.ts)

历史消息补齐策略抽象。

当前真正执行补齐的是 `src/content/index.js` 中的逻辑，这个文件更像是后续重构的结构预留。

---

## 当前真实运行关系

如果只看“现在扩展运行起来时谁在真正起作用”，关系可以简化成：

1. `manifest.json`
2. `src/content/index.ts`
3. `src/content/index.js`
4. `src/content/styles.css`
5. `src/background/index.ts`
6. `src/background/index.js`

也就是说，当前 MVP 的真实运行核心依然集中，只是现在多了一层 TypeScript 源码和生成产物的关系。

## 推荐阅读顺序

如果你自己要继续维护这个项目，建议按这个顺序看：

1. [manifest.json](../manifest.json)
2. [src/content/index.ts](../src/content/index.ts)
3. [src/background/index.ts](../src/background/index.ts)
4. [docs/CHATGPT_ADAPTATION_NOTES.md](./CHATGPT_ADAPTATION_NOTES.md)
5. [docs/ARCHITECTURE.md](./ARCHITECTURE.md)

## 当前项目特点

这个项目现在的特点很明确：

- 运行时逻辑集中
- DOM 适配较重
- 功能已经可用
- 架构文件为后续扩展留了口子

如果未来继续发展，这个项目最自然的方向是：

- 把 `src/content/index.js` 再拆模块
- 把导出格式生成与 DOM 采集彻底分层
- 让 `PlatformAdapter` 真正接入运行链
