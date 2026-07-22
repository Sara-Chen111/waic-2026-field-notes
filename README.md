# WAIC 2026 分享站

WAIC 2026 展商总览、Sara 参展心得、展商速查与管理者后台。

## 本地运行

需要 Node.js `>=22.13.0`。

```bash
cd "WAIC web"
npm install
npm run dev
```

本地未设置管理口令时，后台预览口令为 `preview`。生产环境不接受该口令。

## 环境变量

复制 `.env.example` 中的变量名到部署平台的服务端环境配置：

- `WAIC_ADMIN_TOKEN`：管理者后台口令，应使用长随机值。

密钥不能写入客户端代码、公共 JSON 或 Git 仓库。

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

## 部署边界

反馈、后台编辑和图片上传依赖 D1、R2 与服务端环境变量，不能部署为纯 GitHub Pages 静态站。GitHub 可用于代码托管，站点需要部署到当前项目支持的 Cloudflare 全栈运行时，并配置 `DB` 与 `MEDIA` 绑定。
