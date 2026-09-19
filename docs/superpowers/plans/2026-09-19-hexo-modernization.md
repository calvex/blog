# Hexo Blog Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将历史 Hexo 博客升级到 Node.js 24 LTS、Hexo 8.1、npm 管理的最新稳定版 NexT 和 GitHub Actions Pages，同时合并并保留五篇文章及其历史 URL。

**Architecture:** `master` 作为唯一源码分支，Markdown 由 Hexo 和 npm 安装的 NexT 生成 `public/`。Node 内置测试先定义源码、生成站点和工作流契约；GitHub Actions 分离 build/deploy job，并只允许 `master` 部署到 Pages。

**Tech Stack:** Node.js 24 LTS、npm、Hexo 8.1、hexo-theme-next 8.29、Node `node:test`、GitHub Actions Pages

---

## 文件结构

- `package.json`：依赖、Node 版本约束及 build/test 脚本。
- `package-lock.json`：从 npm 官方 registry 生成的可复现依赖树。
- `.nvmrc`：本地 Node.js 24 提示。
- `_config.yml`：站点、URL、永久链接及 Hexo 配置。
- `_config.next.yml`：最小 NexT 覆盖配置，避免修改主题包。
- `source/_posts/提升效率之路.md`：从 `origin/source` 合并的第五篇文章。
- `source/404.md`：兼容新版 NexT 的 404 页面元数据与返回入口。
- `test/source-content.test.mjs`：验证五篇源码、元数据、域名与永久链接。
- `test/generated-site.test.mjs`：验证构建产物、固定历史路径和页面链接。
- `test/pages-workflow.test.mjs`：静态验证 Pages workflow 的触发条件、job、权限和环境。
- `.github/workflows/pages.yml`：GitHub Pages 构建与部署。
- `README.md`：本地开发、构建、发布和首次上线说明。
- 删除 `.travis.yml`、`.gitmodules`、`yarn.lock`、`hexo-theme-next`、`themes/next` 和 `themes/landscape`。

### Task 0: 固定并验证 Node.js 24 工具链

**Files:**
- Create: `.nvmrc`

- [ ] **Step 1: 安装 Node.js 24 LTS**

Run: `rtk brew install node@24`

Expected: Homebrew 安装当前 Node.js 24 LTS；该 formula 为 keg-only，不替换系统已链接的 Node 26。

- [ ] **Step 2: 固定项目版本并验证实际二进制**

写入 `.nvmrc`：`24`。本计划所有 Node/npm 命令均使用以下 PATH 形式，确保不是误用 Node 26：

```bash
env PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin" rtk node --version
env PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin" rtk npm --version
```

Expected: Node 输出 `v24.x.x`。若不是 24，停止实施并修正工具链，不生成锁文件。

- [ ] **Step 3: 提交工具链约束**

```bash
rtk git add .nvmrc
rtk git commit -m "chore: require node 24"
```

### Task 1: 合并内容并建立源码契约

**Files:**
- Create: `test/source-content.test.mjs`
- Create: `source/_posts/提升效率之路.md`
- Modify: `source/404.md`

- [ ] **Step 1: 写入失败的源码契约测试**

写入完整测试：

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const posts = [
  ['Java8字符串拼接.md', 'title: Java8字符串拼接', 'date: 2017-12-19 10:58:27'],
  ['基于redis的延迟队列.md', 'title: 基于redis的延迟队列', 'date: 2017-12-19 14:02:37'],
  ['什么是锁.md', 'title: 什么是锁', 'date: 2018-07-03 18:54:08'],
  ['随笔1.md', 'title: 随笔', 'date: 2020-07-07 17:25:00'],
  ['提升效率之路.md', 'title: 提升效率之路', 'date: 2020-08-22 17:58:12']
];

const read = relativePath => readFile(new URL(relativePath, root), 'utf8');

test('source contains all five posts with stable metadata', async () => {
  for (const [file, title, date] of posts) {
    const source = await read(`source/_posts/${file}`);
    assert.match(source, new RegExp(`^${title}$`, 'm'));
    assert.match(source, new RegExp(`^${date}$`, 'm'));
  }
});

test('site identity and permalink stay stable', async () => {
  assert.equal((await read('source/CNAME')).trim(), 'aicool.org');
  assert.match(await read('_config.yml'), /^permalink: :year\/:month\/:day\/:title\/$/m);
});

test('404 source uses a supported page layout and explicit home link', async () => {
  const source = await read('source/404.md');
  assert.match(source, /^layout: page$/m);
  assert.match(source, /\[返回首页\]\(\/\)/);
});
```

- [ ] **Step 2: 运行测试并确认按预期失败**

Run: `env PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin" rtk node --test test/source-content.test.mjs`

Expected: FAIL，明确指出 `source/_posts/提升效率之路.md` 不存在，不能是语法错误。

- [ ] **Step 3: 合并第五篇文章并修正 404 元数据**

从 `origin/source:source/_posts/提升效率之路.md` 原样复制正文；将 `source/404.md` 的 `layout` 改为 `page`，正文增加 `[返回首页](/)`，不改其他文章正文。

- [ ] **Step 4: 运行源码契约测试**

Run: `env PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin" rtk node --test test/source-content.test.mjs`

Expected: PASS，所有五篇文章、CNAME、permalink 和 404 契约通过。

- [ ] **Step 5: 提交内容合并**

```bash
rtk git add test/source-content.test.mjs source/_posts/提升效率之路.md source/404.md
rtk git commit -m "feat: consolidate blog source content"
```

### Task 2: 以测试定义生成站点契约

**Files:**
- Create: `test/generated-site.test.mjs`

- [ ] **Step 1: 写入失败的生成站点测试**

写入完整生成站点测试：

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../public/', import.meta.url);
const posts = [
  ['2017/12/19/Java8字符串拼接', 'Java8字符串拼接', 'String.join'],
  ['2017/12/19/基于redis的延迟队列', '基于redis的延迟队列', '延时消息队列'],
  ['2018/07/03/什么是锁', '什么是锁', '多个线程'],
  ['2020/07/07/随笔1', '随笔', '挣扎自救'],
  ['2020/08/22/提升效率之路', '提升效率之路', '工具的作用']
];

const read = relativePath => readFile(new URL(relativePath, root), 'utf8');

test('all historical post routes render their expected content', async () => {
  for (const [route, title, marker] of posts) {
    const html = await read(`${route}/index.html`);
    assert.ok(html.includes(title), `${route} is missing its title`);
    assert.ok(html.includes(marker), `${route} is missing its content marker`);
  }
});

test('home and archive link every historical route', async () => {
  const [home, archive] = await Promise.all([
    read('index.html'),
    read('archives/index.html')
  ]);
  for (const [route] of posts) {
    const href = encodeURI(`/${route}/`);
    assert.ok(home.includes(href), `home is missing ${href}`);
    assert.ok(archive.includes(href), `archive is missing ${href}`);
  }
});

test('CNAME and supporting pages are complete', async () => {
  assert.equal((await read('CNAME')).trim(), 'aicool.org');
  const about = await read('about/index.html');
  assert.ok(about.includes('<html'));
  assert.ok(about.includes('about'));
  assert.ok(about.includes('纯粹蹭热度'));

  const notFound = await read('404.html');
  assert.ok(notFound.includes('<html'));
  assert.ok(notFound.includes('个人博客'));
  assert.ok(notFound.includes('404'));
  assert.match(notFound, /<a[^>]+href="\/"[^>]*>返回首页<\/a>/);
});
```

- [ ] **Step 2: 运行测试并确认按预期失败**

Run: `env PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin" rtk node --test test/generated-site.test.mjs`

Expected: FAIL，原因是升级前没有 `public/index.html`。

- [ ] **Step 3: 仅提交测试契约**

```bash
rtk git add test/generated-site.test.mjs
rtk git commit -m "test: define generated blog contract"
```

### Task 3: 升级 Node、Hexo、插件和 NexT

**Files:**
- Modify: `package.json`
- Create: `package-lock.json`
- Modify: `_config.yml`
- Create: `_config.next.yml`
- Delete: `yarn.lock`
- Delete: `.gitmodules`
- Delete: `hexo-theme-next`
- Delete: `themes/next`
- Delete: `themes/landscape/**`

- [ ] **Step 1: 核对实施时的正式最新版**

Run:

```bash
env PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin" rtk npm view hexo version
env PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin" rtk npm view hexo-theme-next version
env PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin" rtk npm view hexo-generator-archive version
env PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin" rtk npm view hexo-generator-category version
env PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin" rtk npm view hexo-generator-index version
env PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin" rtk npm view hexo-generator-tag version
env PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin" rtk npm view hexo-renderer-ejs version
env PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin" rtk npm view hexo-renderer-marked version
env PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin" rtk npm view hexo-renderer-stylus version
env PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin" rtk npm view hexo-server version
```

Expected: Hexo 为 8.1.x、NexT 为 8.29.x；若正式 latest 已变化，使用新的正式版并在交付说明中记录，不使用 beta/rc。

- [ ] **Step 2: 清理旧主题和包管理遗留**

删除两处主题 gitlink、`.gitmodules`、旧 Landscape 主题和 `yarn.lock`。执行 `rtk git status --short`，确认只删除设计中列出的路径，文章源码不受影响。

- [ ] **Step 3: 更新包配置**

`package.json` 应包含：

```json
{
  "name": "aicool-blog",
  "version": "1.0.0",
  "private": true,
  "engines": { "node": ">=24" },
  "scripts": {
    "build": "hexo generate",
    "clean": "hexo clean",
    "server": "hexo server",
    "test:source": "node --test test/source-content.test.mjs",
    "test:site": "node --test test/generated-site.test.mjs",
    "test:workflow": "node --test test/pages-workflow.test.mjs",
    "test": "npm run test:source && npm run clean && npm run build && npm run test:site && npm run test:workflow"
  }
}
```

保留最新正式版 archive/category/index/tag generators、ejs/marked/stylus renderers、server，新增 `hexo-theme-next`；新增 `yaml` 开发依赖用于结构化解析 workflow。用精确直接依赖版本和 `package-lock.json` 保证复现。

- [ ] **Step 4: 更新 Hexo 和 NexT 配置**

保留站点标题、作者、CNAME、目录、分页和永久链接；将站点 URL 改为 `https://aicool.org`，保持 `theme: next`。删除 Hexo 7 已移除的 `use_date_for_updated`，改为 `updated_option: mtime`。新增 `_config.next.yml`：

```yaml
scheme: Muse
menu:
  home: / || fa fa-home
  archives: /archives/ || fa fa-archive
sidebar:
  position: left
```

- [ ] **Step 5: 从官方 npm registry 安装并锁定依赖**

Run: `env PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin" rtk npm install --registry=https://registry.npmjs.org/`

Expected: 生成 `package-lock.json`，其中 resolved URL 不含 `registry.npm.taobao.org`；`npm ls --depth=0` 无 missing/invalid。

- [ ] **Step 6: 构建并运行已有契约**

Run:

```bash
env PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin" rtk npm run test:source
env PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin" rtk npm run clean
env PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin" rtk npm run build
env PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin" rtk npm run test:site
```

Expected: 全部 PASS；Hexo 生成五篇文章且无主题配置错误。

- [ ] **Step 7: 提交运行时升级**

```bash
rtk git add package.json package-lock.json _config.yml _config.next.yml test/generated-site.test.mjs
rtk git add -u .gitmodules yarn.lock hexo-theme-next themes
rtk git commit -m "feat: modernize hexo runtime and theme"
```

### Task 4: 用测试定义安全的 Pages 工作流

**Files:**
- Create: `test/pages-workflow.test.mjs`
- Create: `.github/workflows/pages.yml`
- Delete: `.travis.yml`

- [ ] **Step 1: 写入失败的 workflow 契约测试**

使用 `yaml` 包结构化解析，而不是文本搜索，核心测试如下：

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import YAML from 'yaml';

const workflowPath = new URL('../.github/workflows/pages.yml', import.meta.url);

test('Pages workflow has a safe build and deploy boundary', async () => {
  const workflow = YAML.parse(await readFile(workflowPath, 'utf8'));
  assert.deepEqual(workflow.on.push.branches, ['master']);
  assert.ok(Object.hasOwn(workflow.on, 'workflow_dispatch'));
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  assert.deepEqual(workflow.concurrency, {
    group: 'pages',
    'cancel-in-progress': false
  });

  const { build, deploy } = workflow.jobs;
  assert.equal(build['runs-on'], 'ubuntu-latest');
  assert.equal(build.permissions, undefined);
  const uses = build.steps.map(step => step.uses).filter(Boolean);
  assert.deepEqual(uses, [
    'actions/checkout@v5',
    'actions/setup-node@v6',
    'actions/configure-pages@v5',
    'actions/upload-pages-artifact@v4'
  ]);
  assert.equal(build.steps[1].with['node-version'], 24);
  assert.equal(build.steps[1].with.cache, 'npm');
  assert.deepEqual(build.steps.filter(step => step.run).map(step => step.run), [
    'npm ci',
    'npm test'
  ]);

  assert.equal(deploy.needs, 'build');
  assert.equal(deploy.if, "github.ref == 'refs/heads/master'");
  assert.deepEqual(deploy.permissions, {
    pages: 'write',
    'id-token': 'write'
  });
  assert.deepEqual(deploy.environment, {
    name: 'github-pages',
    url: '${{ steps.deployment.outputs.page_url }}'
  });
  assert.deepEqual(deploy.steps, [{
    name: 'Deploy to GitHub Pages',
    id: 'deployment',
    uses: 'actions/deploy-pages@v4'
  }]);
});
```

- [ ] **Step 2: 运行测试并确认按预期失败**

Run: `env PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin" rtk node --test test/pages-workflow.test.mjs`

Expected: FAIL，原因是 `.github/workflows/pages.yml` 不存在。

- [ ] **Step 3: 编写 GitHub Pages workflow**

删除 `.travis.yml`，并写入完整 workflow：

```yaml
name: Deploy Hexo to Pages

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v5
      - name: Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: npm
      - name: Configure Pages
        uses: actions/configure-pages@v5
      - name: Install dependencies
        run: npm ci
      - name: Build and verify
        run: npm test
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v4
        with:
          path: ./public

  deploy:
    if: github.ref == 'refs/heads/master'
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 4: 运行 workflow 契约测试**

Run: `env PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin" rtk node --test test/pages-workflow.test.mjs`

Expected: PASS。

- [ ] **Step 5: 提交 Pages 工作流**

```bash
rtk git add test/pages-workflow.test.mjs .github/workflows/pages.yml
rtk git add -u .travis.yml
rtk git commit -m "ci: migrate blog deployment to github pages"
```

### Task 5: 更新使用与上线文档

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 更新 README**

README 说明：项目用途、Node 24 要求、`npm ci`、`npm run server`、`npm run clean`、`npm run build`、`npm test`、文章目录；明确发布来自 `master` 的 GitHub Actions。

- [ ] **Step 2: 记录首次上线人工步骤**

README 必须列出：

1. 在 GitHub Settings → Pages 先将 Source 设为 GitHub Actions；
2. 复核自定义域名 `aicool.org`，保留历史 `gh-pages` 分支用于回滚参考；
3. 合并并推送升级分支到 `master`；
4. 若首次 workflow 在切换期间失败，从 `master` 手动重新运行；
5. 检查首次 Actions deployment URL；
6. 验证 `https://aicool.org`、DNS 和 TLS 证书。

- [ ] **Step 3: 确认 Travis 已移除并提交文档**

```bash
rtk git add README.md
rtk git commit -m "docs: document modern blog workflow"
```

### Task 6: 全量验证与审计

**Files:**
- Modify only if verification exposes a scoped defect.

- [ ] **Step 1: 确认最终验证仍使用 Node 24**

Run: `env PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin" rtk node --version`

Expected: `v24.x.x`。

- [ ] **Step 2: 从零验证锁文件安装**

Run: `env PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin" rtk npm ci --registry=https://registry.npmjs.org/`

Expected: 安装成功，无淘宝镜像请求。

- [ ] **Step 3: 运行完整测试**

Run: `env PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin" rtk npm test`

Expected: source、构建产物和 workflow 测试全部 PASS，Hexo 构建退出码为 0。

- [ ] **Step 4: 检查依赖树和安全审计**

Run:

```bash
env PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin" rtk npm ls --depth=0
env PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin" rtk npm audit --omit=dev
```

Expected: 无 missing/invalid；audit 无高危或严重漏洞。若存在上游暂不可修复项，记录包、路径、等级和可用缓解措施，不执行破坏性 `npm audit fix --force`。

- [ ] **Step 5: 检查仓库状态与差异**

Run:

```bash
rtk git diff --check master...HEAD
rtk git status --short
rtk git log --oneline --decorate master..HEAD
```

Expected: `git diff --check` 无输出；状态只包含计划文档可能尚未提交的变更；提交历史清晰。

- [ ] **Step 6: 提交任何验证修正**

```bash
rtk git add -u
rtk git commit -m "chore: finalize hexo modernization"
```

如果 Step 1–5 暴露并修正任何缺陷，必须从 Step 1 重新执行 Node 版本、`npm ci`、完整测试、audit、diff/status 全套检查；只有复验全部通过后才提交。若没有实现修正，则跳过本步骤，不创建空提交。若修正新建了文件，先用其精确路径执行 `rtk git add <path>`。

- [ ] **Step 7: 提交后复验干净状态**

Run:

```bash
env PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin" rtk npm test
rtk git diff --check master...HEAD
rtk git status --short
```

Expected: 测试全绿、diff check 无输出、工作树干净。

- [ ] **Step 8: 最终验收说明**

报告：实际版本、五篇文章与固定 URL、测试数量、构建结果、audit 结果、分支/工作树路径，以及尚需用户执行的 Pages Source 切换和首次线上验证。不得把未运行的线上部署描述为成功。
