# Edge 商店发布准备

这份文档是给仓库维护者自己看的，目标是把当前项目整理成可以提交到 Microsoft Edge Add-ons 的状态。

## 1. 当前已经具备的内容

- 可运行的 MV3 扩展
- `manifest.json`
- `background service worker`
- `content script`
- 本地导出能力
- 中英文 README
- 隐私政策文档

## 2. 当前还需要你手动准备的内容

根据微软官方文档，提交到 Microsoft Edge Add-ons 时需要：

- 扩展代码 zip 包
- 商店视觉素材
- 名称和简介
- 隐私政策链接

我已经补好的部分：

- 代码仓库文档
- 隐私政策文件
- 发布打包脚本

你还需要手动准备：

### 视觉素材

至少准备：

- 扩展 logo
- 商店小图
- 截图

建议你自己准备一套正式的 PNG 资源，再补进仓库。

### 商店文案

需要准备：

- 标题
- 简短描述
- 详细描述
- 类别
- 隐私政策 URL

## 3. 隐私政策 URL

当前仓库里已经有：

- [PRIVACY_POLICY.md](../PRIVACY_POLICY.md)

如果你把项目 push 到 GitHub，可以把它作为公开文档托管。

更稳的做法：

- 用 GitHub Pages
- 或单独放到你的个人站点

## 4. 打包扩展

项目里已经补了一个发布脚本：

- [scripts/prepare-release.ps1](../scripts/prepare-release.ps1)

执行方式：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\prepare-release.ps1
```

它会：

- 清理旧的 `release/`
- 拷贝运行时所需文件
- 生成提交用 zip 包

输出目录：

- `release/edge-store/`
- `release/gpt-dialogue-extractor-edge.zip`

## 5. 提交前检查

提交前建议确认：

1. `manifest.json` 里的版本号是否正确
2. 名称和描述是否是正式发布文案
3. 隐私政策链接是否可访问
4. zip 包里是否只包含运行时需要的文件
5. 本地开发专用文件是否没有打进去

## 6. 官方要求摘要

根据 Microsoft 官方文档，商店提交流程至少需要：

- 开发者账号
- 扩展 zip 包
- 视觉素材
- 隐私政策链接

官方文档：

- Microsoft Learn: Publish a Microsoft Edge extension
- Microsoft Learn: Register as a Microsoft Edge extension developer
- Microsoft Learn: Extension hosting

## 7. 当前建议

你现在最适合的顺序是：

1. 先 push 当前仓库
2. 准备图标和商店截图
3. 跑一次 `prepare-release.ps1`
4. 在 Edge Add-ons 后台填写商店信息并上传 zip
