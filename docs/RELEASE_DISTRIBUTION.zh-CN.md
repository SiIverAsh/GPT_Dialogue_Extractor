# GitHub Release 分发说明

这份文档是给仓库维护者的。

目标：

- 不通过扩展商店
- 直接把扩展打包后发给别人使用

## 推荐分发方式

建议使用：

1. GitHub Release
2. 上传 zip 包
3. 让用户按“加载已解压扩展程序”的方式安装

这是当前项目最稳妥的非商店分发方式。

## 打包步骤

在仓库根目录执行：

```powershell
npm run release:prepare
```

执行后会生成：

- `release/edge-store/`
- `release/gpt-dialogue-extractor-edge.zip`

## 推荐上传内容

建议在 GitHub Release 中上传：

- `gpt-dialogue-extractor-edge.zip`

如果你还想让用户更容易理解，也可以同时附上：

- 安装说明文档

## 推荐发布说明

GitHub Release 文案建议至少写：

1. 这是一个未上商店的开发者模式扩展
2. 用户需要解压后手动加载
3. 支持的浏览器
4. 当前版本新增或修复的内容

## 用户安装方式

用户侧的安装说明见：

- [INSTALL.zh-CN.md](./INSTALL.zh-CN.md)

## 每次发布前建议检查

1. `npm run build`
2. `npm run typecheck`
3. `npm run release:prepare`
4. 解压 release 包，确认至少包含：
   - `manifest.json`
   - `src/background/index.js`
   - `src/content/index.js`
   - `src/content/styles.css`
5. 用 Edge 或 Chrome 实际加载一次 release 目录
6. 测试：
   - JSON 导出
   - Markdown 导出
   - PDF 导出
   - 时间轴跳转

## 不建议的方式

当前不建议：

- 直接让用户 clone 仓库
- 直接发源码目录而不打包
- 强依赖 `.crx` 离线安装

对于这个项目，GitHub Release + 解压加载是最省事、兼容性也最好的方式。
