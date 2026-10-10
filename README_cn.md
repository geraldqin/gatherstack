# 智能剪报（GatherStack）

使用 AI 解析网页、按 Skill 抽取信息并存到本机浏览器，方便后续汇总与对比。

完整产品说明见 [ABOUT_cn.md](./ABOUT_cn.md)。English: [README.md](./README.md) · [ABOUT.md](./ABOUT.md)。

本仓库目录是基于 [Plasmo](https://docs.plasmo.com/) 的 Chrome 扩展（Manifest V3）。

## Getting Started

安装依赖后启动开发服务：

```bash
pnpm install
pnpm dev
# or
npm install
npm run dev
```

在 Chrome 打开 `chrome://extensions`，开启「开发者模式」，加载 `build/chrome-mv3-dev`。

主要入口：

- 侧栏：`src/sidepanel.tsx`
- 选项页：`src/options.tsx`

改动后一般会自动热更新；若侧栏或后台脚本未刷新，在扩展管理页点一次重新加载。

更多框架说明见 [Plasmo 文档](https://docs.plasmo.com/)。

## Making production build

```bash
pnpm build
# or
npm run build
```

产物在 `build/chrome-mv3-prod`。

可选：

```bash
pnpm package
```
