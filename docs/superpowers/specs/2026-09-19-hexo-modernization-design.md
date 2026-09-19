# Hexo 博客现代化升级设计

## 目标

将博客从 Node.js 10、Hexo 4、NexT Git 子模块和 Travis CI 的历史技术栈，升级到可复现、可维护的现代静态站点构建与 GitHub Pages 发布链路，同时保留既有域名、文章永久链接和全部内容。

## 升级基线

- 使用 Node.js 24 LTS 作为本地与 CI 的受支持运行时。
- 使用 Hexo 8.1.x 和当前最新稳定版 NexT 8.29.x。
- 其余 Hexo 生成器、渲染器和服务器插件升级到实施时 npm `latest` 正式版本，并由 `package-lock.json` 锁定完整依赖树。
- 使用 npm 统一管理依赖，不再保留 Yarn 锁文件或 Git 子模块主题。

## 内容与兼容性

- 以 `master` 为唯一源码与发布分支。
- 保留 `master` 当前四篇文章，并从 `origin/source` 合入其独有的《提升效率之路》，最终保留五篇文章。
- 保留 `source/CNAME` 中的 `aicool.org`。
- 保留 `permalink: :year/:month/:day/:title/`，避免历史文章链接发生变化。
- 保留 about、404 页面和现有 Markdown 正文，不做正文改写。将 404 页的旧 `layout: 404` 元数据改为新版 NexT 支持的页面布局，并验证生成页包含站点框架、404 标题和首页返回入口。
- 构建检查硬编码验证下列历史路径，且校验页面标题/正文标记与首页、归档页链接，防止“页面存在但 URL 已变”被误判为成功：
  - `2017/12/19/Java8字符串拼接/`
  - `2017/12/19/基于redis的延迟队列/`
  - `2018/07/03/什么是锁/`
  - `2020/07/07/随笔1/`
  - `2020/08/22/提升效率之路/`

## 主题管理

- 将 `hexo-theme-next` 作为 npm 依赖安装，删除根目录 `hexo-theme-next` 与 `themes/next` 两个重复子模块以及 `.gitmodules`。
- 删除未被站点配置使用的仓库内旧 Landscape 主题，降低维护面。
- 使用站点根目录 `_config.next.yml` 保存最小的 NexT 覆盖配置，不修改 `node_modules` 中的主题源码。
- 显式保留 Muse 布局、首页/归档菜单和必要的侧栏行为；未配置的功能使用新版 NexT 默认值。

## 构建与发布

- 删除已停用的 `.travis.yml`。
- 新增 GitHub Actions Pages 工作流，在 `master` 推送和手动触发时运行；手动触发的部署任务也必须用 `github.ref == 'refs/heads/master'` 限制，其他 ref 只允许构建、不得覆盖生产站点。
- 工作流使用 Node.js 24、`npm ci`、`npm run clean` 和 `npm run build`，然后上传 `public/` 并通过 GitHub Pages 官方 Actions 部署。
- 工作流拆分为 `build` 与 `deploy` 两个 job，`deploy` 通过 `needs: build` 消费构建产物，绑定 `github-pages` environment，并仅在部署 job 申请 `pages: write` 与 `id-token: write`；其他步骤保持 `contents: read` 最小权限。
- 使用 concurrency 避免重复部署互相覆盖。

## 本地开发与验证

- README 记录 `npm ci`、`npm run server`、`npm run clean`、`npm run build` 的使用方式和 Node.js 版本要求。
- 增加轻量验证脚本，在构建后检查首页、404、CNAME、about 页面和五条固定文章路径，校验关键标题/正文标记，并确认首页与归档页包含全部五篇文章链接。
- 验证顺序为：安装锁定依赖、清理生成物、生成站点、运行产物检查、静态检查 workflow YAML 的结构和关键权限/条件、执行依赖审计。
- 对依赖审计中无法由直接依赖升级消除的问题单独报告，不以静默忽略作为成功标准。

## 已知边界

- 本次不改写文章内容、不重新设计页面、不新增评论、搜索或统计功能。
- 本次只准备可部署配置，不主动推送分支，也不直接修改 GitHub 仓库 Pages 设置或 DNS。上线前必须手动将仓库 Pages Source 从历史 `gh-pages` 分支切换为 **GitHub Actions**，复核自定义域名仍为 `aicool.org`；`source/CNAME` 只负责进入生成产物，不能替代仓库 Pages 设置。
- 升级前基线无法构建：旧锁文件引用证书已过期的淘宝 npm 镜像，且 NexT 子模块未初始化。该失败已获用户确认，可在升级中直接修复。
- 历史 `gh-pages` 分支继续保留作为回滚参考，本次不删除。
- 实际 Pages 发布、DNS 和 TLS 证书属于本地不可验证的外部状态。首次合入并推送 `master` 后，需验收 Actions 部署成功、deployment URL 可访问、`https://aicool.org` 指向新产物且证书有效。

## 成功标准

1. Node.js 24 环境下 `npm ci` 可从官方 npm registry 完成。
2. `npm run build` 成功且无 Hexo/NexT 配置错误。
3. 自动检查确认域名、首页、404、about、五条固定历史文章路径及首页/归档链接均正确。
4. 仓库不再依赖 Travis、Yarn 锁文件或主题 Git 子模块。
5. GitHub Actions 工作流通过静态结构检查，Pages 部署结构、权限、环境及 `master` 限制符合官方推荐方式。
6. 上线后另行确认首次 GitHub Actions 运行、deployment URL、自定义域名和 TLS 证书；这些不作为本地实施完成的虚假成功条件。
