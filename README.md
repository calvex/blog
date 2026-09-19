# aicool.org 博客

这是 aicool.org 的 Hexo 个人博客项目。文章 Markdown 源文件位于 `source/`，NexT 主题通过 npm 管理；向 `master` 推送后，由 GitHub Actions 构建并发布站点。

## 环境要求

- Node.js 24 LTS
- npm

项目通过 `.nvmrc` 声明 Node.js 版本。安装并启用 nvm 后，可在项目目录执行 `nvm use` 切换到对应版本；不要求使用 Homebrew，可按操作系统选择合适的 Node.js/nvm 安装方式。

## 安装

```bash
npm ci
```

## 本地开发与检查

- `npm run server`：启动本地 Hexo 服务，预览博客。
- `npm run clean`：清理 Hexo 生成的缓存和输出目录。
- `npm run build`：构建静态站点到 `public/`。
- `npm test`：执行项目契约检查，包括源码检查、清理与构建、五条历史 URL/页面检查，以及 GitHub Actions workflow 契约检查。

文章位于 `source/_posts/`。新增文章可执行：

```bash
npx hexo new post "标题"
```

## 发布机制

向 `master` 推送会触发 `.github/workflows/pages.yml`。该 workflow 将构建与部署分离，只有 `master` 分支会执行部署；其他分支可用于开发和验证，不会发布线上站点。

## 首次上线

请严格按以下顺序操作：

1. 在 GitHub **Settings → Pages** 中，先将 **Source** 设置为 **GitHub Actions**。
2. 复核自定义域名 `aicool.org`，并保留历史 `gh-pages` 分支作为回滚参考。
3. 合并并推送升级分支到 `master`。
4. 如果首次 workflow 在切换期间失败，从 `master` 手动重新运行该 workflow。
5. 检查首次 Actions deployment URL。
6. 验证 `https://aicool.org`、DNS 和 TLS 证书。

> 本地构建成功不等于线上已发布；仍需确认 Actions deployment、域名解析和 TLS 访问均正常。
