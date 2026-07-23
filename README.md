# WAIC 2026 分享站

WAIC 2026 展商总览、Sara 参展心得与展商速查。网站为纯静态站点，所有公开内容来自仓库中的 JSON、图片和视频文件。

## 本地运行

需要 Node.js `>=22.13.0`。

```bash
cd "WAIC web"
npm install
npm run dev
```

## 数据与内容

- `public/data/exhibitors.json`：980 条展商资料（含 17 条由现场照片补录的展商或展区）；页面按跨场馆重复规则合并为 953 张卡片。
- `public/data/photo_matches.json`：185 个展商或展区与 322 张照片的对应关系。
- `public/data/exhibitor_research.json`：公司与产品补充资料。
- `public/data/agent-index.json`：由 `npm run build:agent-index` 生成的展商筛选标签索引。
- `public/data/insights.json`：Sara 心得正文与精选展商卡片配置。

工作区根目录的 `../data/` 是处理层数据，`public/data/` 是网站发布副本。外部公开报道补图的原图与来源记录保存在 `../materials/外部补图/`。

重新生成展商筛选标签索引：

```bash
node scripts/build-agent-index.mjs
```

## 验证

```bash
npm run lint
npm test
```

## GitHub Pages 部署

推送到 `main` 分支后，`.github/workflows/deploy-pages.yml` 会构建静态文件并发布到 GitHub Pages。
