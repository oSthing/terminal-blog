# 部署与发布手册

本文档覆盖本地开发、构建、推送源码仓库、以及把构建产物发布到 `oSthing.github.io` 的完整流程。

## 架构

两个仓库各司其职：

| 仓库 | 角色 | 内容 |
| --- | --- | --- |
| `oSthing/terminal-blog` | 源码仓库 | 源代码、Markdown 文章、配置。不放构建产物。 |
| `oSthing/oSthing.github.io` | 站点仓库 | `npm run build` 生成的 `dist/` 静态文件。GitHub Pages 实际托管的目录。 |

`dist/` 已经被 `.gitignore` 忽略 —— 源码仓库永远不会包含构建产物。

---

## 1. 本地开发

```bash
npm install               # 首次或依赖变化时
npm run dev               # 开发服务器，http://localhost:4321
npm run check             # TypeScript + Content Collections 校验
npm run build             # 生产构建 → ./dist
npm run preview           # 本地预览 ./dist
npm run format            # prettier
```

新建文章：在 `src/content/blog/` 下加一个 `.md` 文件，frontmatter 用下面的模板：

```markdown
---
title: '文章标题'
description: '一句话简介。'
pubDate: 2026-06-16
tags: ['tag-a', 'tag-b']
draft: false
---

正文……
```

`draft: true` 的文章会从 `/blog`、RSS、sitemap、终端 `blog`/`search` 命令中过滤掉。

---

## 2. 一次性环境配置

### 2.1 Git 身份

仓库的 `git init` 已经做完（`main` 分支，44 个文件已暂存）。设置你的提交身份：

```bash
git config --global user.name  "oSthing"
git config --global user.email "osthinggg@gmail.com"
```

> 如果不想动全局配置，可以只对本仓库设置：
> ```bash
> git config user.name  "oSthing"
> git config user.email "osthinggg@gmail.com"
> ```

### 2.2 GitHub 认证

推送时二选一：

**A. HTTPS + Personal Access Token（推荐）**

1. 打开 <https://github.com/settings/tokens?type=beta>，生成一个 **Fine-grained token**。
2. Repository access 选择 `oSthing/terminal-blog` 和 `oSthing/oSthing.github.io`。
3. Permissions 至少勾选 `Contents: Read and write`。
4. 第一次 `git push` 时把 token 当作密码粘进去（Windows 自带的 Git Credential Manager 会记住）。

**B. SSH key**

```bash
ssh-keygen -t ed25519 -C "osthinggg@gmail.com"
# 把 ~/.ssh/id_ed25519.pub 的内容加到 https://github.com/settings/keys
ssh -T git@github.com   # 验证
git remote set-url origin git@github.com:oSthing/terminal-blog.git
```

---

## 3. 推送到源码仓库 `terminal-blog`

### 首次推送

```bash
cd "F:/terminal-blog"
git commit -m "feat: terminal blog v1.0"
git remote add origin https://github.com/oSthing/terminal-blog.git
git push -u origin main
```

### 之后的常规推送

```bash
git add .
git commit -m "<简短描述这次改动>"
git push
```

> ⚠️ 不要把 `dist/`、`node_modules/`、`.env*` 加进来 —— `.gitignore` 已经处理，但养成 `git status` 检查的习惯。

---

## 4. 部署到 `oSthing.github.io`

两种方案选一种即可。**方案 A** 一劳永逸，写一次 workflow 后面全自动；**方案 B** 最简单直观，便于排查问题。

### 方案 A：GitHub Actions 自动部署（推荐）

把构建产物从 `terminal-blog` 推送到 `oSthing.github.io` 的 workflow：

1. 在 `oSthing/terminal-blog` 仓库的 **Settings → Secrets and variables → Actions** 添加一个 secret：
   - `PAGES_DEPLOY_TOKEN`：GitHub PAT（参考 2.2-A），需要 `oSthing/oSthing.github.io` 的写权限。
2. 把下面这段加到 `.github/workflows/deploy.yml` 末尾（或新建一个文件 `.github/workflows/deploy-pages.yml`）：

   ```yaml
   name: Deploy site to oSthing.github.io

   on:
     push:
       branches: [main]
     workflow_dispatch:

   permissions:
     contents: write

   jobs:
     build-and-publish:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4

         - uses: actions/setup-node@v4
           with:
             node-version: 20
             cache: npm

         - run: npm ci
         - run: npm run build

         - name: Push dist to oSthing.github.io
           uses: peaceiris/actions-gh-pages@v4
           with:
             personal_token: ${{ secrets.PAGES_DEPLOY_TOKEN }}
             external_repository: oSthing/oSthing.github.io
             publish_branch: main
             publish_dir: ./dist
             force_orphan: true   # 让目标仓库 main 分支只含 dist/ 内容
             commit_message: "deploy: ${{ github.sha }}"
   ```

3. 推送后，每次 `main` 分支更新，CI 会自动构建并把 `dist/` 强制覆盖到 `oSthing/oSthing.github.io` 的 `main` 分支。
4. 确认 `oSthing/oSthing.github.io` 的 **Settings → Pages** 已经把 Source 设为 `Deploy from a branch` + `main` / `/`。

### 方案 B：手动本地推送

```bash
# 一次性：克隆站点仓库到同级目录
cd ..
git clone https://github.com/oSthing/oSthing.github.io.git site
cd site
```

> ⚠️ **第一次部署前需要清空 `oSthing.github.io` 旧内容。** 这是不可逆操作 —— 旧仓库历史虽然还在 reflog 里，但工作树会被覆盖。执行前先确认你不再需要旧内容。

清空并发布：

```bash
cd ../oSthing.github.io    # 或你克隆的目录
# 清空除 .git 之外的全部文件
find . -maxdepth 1 -mindepth 1 ! -name '.git' -exec rm -rf {} +

# 复制新的构建产物
cp -r ../terminal-blog/dist/* .
cp -r ../terminal-blog/dist/.* . 2>/dev/null || true   # 包含 .nojekyll 等点文件

git add .
git status                  # 复核
git commit -m "deploy: terminal-blog v1.0"
git push origin main
```

之后每次发布：

```bash
# 1. 在源码仓库
cd ../terminal-blog
npm run build

# 2. 同步到站点仓库
cd ../oSthing.github.io
find . -maxdepth 1 -mindepth 1 ! -name '.git' -exec rm -rf {} +
cp -r ../terminal-blog/dist/* .
cp -r ../terminal-blog/dist/.* . 2>/dev/null || true
git add . && git commit -m "deploy: $(date -u +%Y-%m-%dT%H:%M:%SZ)" && git push
```

可以用一行 alias 简化：

```bash
# 加到 ~/.bashrc 或 PowerShell profile
alias deploy='cd /path/to/terminal-blog && npm run build && \
  cd /path/to/oSthing.github.io && \
  find . -maxdepth 1 -mindepth 1 ! -name ".git" -exec rm -rf {} + && \
  cp -r ../terminal-blog/dist/* . && \
  git add . && git commit -m "deploy: $(date -u +%Y-%m-%dT%H:%M:%SZ)" && git push'
```

---

## 5. 一次性清理 `oSthing.github.io` 旧内容

如果方案 A 还没配好、又想让 `oSthing.github.io` 立即显示新博客，按下面的顺序做（**危险操作**）：

```bash
# 1. 备份（强烈建议）
git clone --mirror https://github.com/oSthing/oSthing.github.io.git ~/oSthing.github.io.bak

# 2. 进入工作克隆
cd /path/to/oSthing.github.io    # 已克隆的目录
find . -maxdepth 1 -mindepth 1 ! -name '.git' -exec rm -rf {} +

# 3. 提交空树作为起点
git commit --allow-empty -m "chore: clear old content, preparing for terminal-blog"
git push origin main --force
```

> ⚠️ `git push --force` 会覆盖远端 `main`。误操作可以 `git push --force-with-lease` 减少风险。备份镜像的 `~/oSthing.github.io.bak` 任何时候都能恢复。

然后按方案 B 的步骤把 `dist/` 推上去。

---

## 6. 日常工作流速查

| 你想做的事 | 命令 |
| --- | --- |
| 写新文章 | 在 `src/content/blog/` 下新建 `.md`，保存；dev server 自动热重载 |
| 改样式 / 组件 | 直接保存；dev server 自动热重载 |
| 类型 / 内容校验 | `npm run check` |
| 本地预览生产构建 | `npm run build && npm run preview` |
| 推源码 | `git add . && git commit -m "…" && git push` |
| 部署上线 | 走方案 A 自动 / 走方案 B 手动 |

---

## 7. 故障排查

- **HMR 改完没生效：** 看 dev server 日志 `[watch] …`，HMR 触发后浏览器应该无感刷新；如果状态卡死，刷新一次浏览器。
- **`git push` 报 403：** token 没勾 `Contents: write` 或没覆盖到目标仓库。重新生成 PAT 即可。
- **GitHub Pages 仍然显示旧版本：** Pages 部署有几分钟缓存。在浏览器用 `Ctrl + F5` 强制刷新，或访问 `https://<你的域名>?v=2` 绕过缓存。
- **终端 `friends` 命令没出现：** 检查 `src/data/friends.ts` 是不是至少有一项；`Terminal.astro` 必须成功把 `data-friends` 注入。
- **`npm run build` 报 `Type … is not assignable`：** 跑 `npm run check` 看具体哪个文件。
- **部署到 oSthing.github.io 后 CSS 404：** 99% 是缺 `dist/.nojekyll`（Jekyll 忽略了 `dist/_astro/`）或部署时 `cp -r` 漏了点文件。详见 9.1。

---

## 9. GitHub Pages 踩坑清单

部署到 GitHub Pages 90% 的"样式没了 / 图片 404"都能在这一节里查到。

### 9.1 页面没样式 —— `.nojekyll` 缺失

**症状：** HTML 正常加载，但完全没有样式，排版全乱。DevTools Network 面板里 `/_astro/*.css` 请求 404。

**根因：** GitHub Pages 默认开启 Jekyll。Jekyll 把所有 `_` 开头的文件 / 目录当作内部文件**静默忽略**。Astro 把编译产物放在 `dist/_astro/`，整个目录不发布 → 浏览器请求 CSS 全部 404。

**修复（一次性、永久生效）：**

在 `public/.nojekyll` 放一个空文件。`npm run build` 时 Astro 会原样复制到 `dist/`，告诉 GitHub Pages 跳过 Jekyll。

```bash
# bash
touch public/.nojekyll

# PowerShell
New-Item -ItemType File -Path public/.nojekyll -Force | Out-Null
```

**部署时一定不要漏掉 `dist/.nojekyll`**——shell 默认不复制点文件，必须额外处理：

```bash
# bash —— 只复制点文件
cp -r dist/.[!.]* . 2>/dev/null
# 或 —— 启用 dotglob 后再 *
shopt -s dotglob && cp -r dist/* . && shopt -u dotglob
```

```powershell
# PowerShell —— Copy-Item -Force 默认包含隐藏文件
Copy-Item -Path dist/* -Destination . -Recurse -Force
```

### 9.2 资源 404 通用排查

| 现象 | 大概率原因 | 修复 |
| --- | --- | --- |
| CSS / JS 404 | 缺 `.nojekyll` | 见 9.1 |
| CSS / JS 404 但 `.nojekyll` 已在 | `astro.config.mjs` 的 `base` 错了 | 用户/组织页用 `base: '/'`；项目页用 `base: '/<repo>/'` |
| 图片 404 | 文件没放进 `public/` 或 `src/assets/` | `public/` 下的文件原样输出到 `dist/` 根 |
| 字体 404 | 自托管字体没复制 | 用 `public/fonts/` 或 Tailwind config 配置 |
| 整个页面 404 | Pages 源/分支配置错 | 仓库 Settings → Pages → Source: `Deploy from a branch` / Branch: `main` / Folder: `/` |

### 9.3 `base` 路径配错

`astro.config.mjs`：

```js
base: '/',               // 用户/组织页（oSthing.github.io 根）
base: '/terminal-blog/', // 项目页（oSthing.github.io/terminal-blog/）
```

部署到 `oSthing.github.io` 但 `base` 写成了 `/terminal-blog/`，所有资源路径会变成 `/terminal-blog/_astro/...`，全部 404。

**部署前 sanity check：**

```bash
grep -oE 'href="/[^"]+"' dist/index.html | sort -u
```

应该看到以**单斜杠**开头的路径（`/favicon.svg`、`/_astro/*.css`、`/blog/`），没有 `/terminal-blog/` 前缀。

### 9.4 浏览器看到旧版本

GitHub Pages CDN 有几分钟缓存，部署完别急。

- 强刷：`Ctrl + F5`（Windows）/ `Cmd + Shift + R`（Mac）
- 绕过缓存：URL 后加查询串 `?v=2`
- DevTools → Network → Disable cache
- CDN 状态：<https://www.githubstatus.com/>

### 9.5 Sitemap / RSS 不更新

`@astrojs/sitemap` 和 `@astrojs/rss` 在构建时生成。**改完不重新 build 就 push，sitemap 是旧的。**

```bash
grep -c "<url>" dist/sitemap.xml
# 当前期望：6 静态页 + 3 文章 = 9 条
```

### 9.6 新页面不显示

新页面文件没在 `src/pages/` 下，或 `getStaticPaths()` 报错。

```bash
npm run build 2>&1 | grep -E "page|error" | head -20
```

没看到你的页面名就是没被路由到。

### 9.7 `npm run build` 报 Type 错误

跑 `npm run check` 看具体错。常见：

- 新增 `.astro` 文件没写 `interface Props`
- 用了未配置的 import 别名（`tsconfig.json` 的 `paths`）
- Content Collection frontmatter 不符合 `src/content/config.ts` 的 schema

### 9.8 自定义 404 页面

新建 `src/pages/404.astro`。Astro 在构建时生成 `dist/404.html`，GitHub Pages 找不到对应资源时自动用它。模板可参考 `src/pages/links.astro` 的结构。

### 9.9 自定义域名

1. 站点仓库根加一个**无扩展名**的 `CNAME`（放 `public/CNAME` 让 Astro 复制到 `dist/CNAME`），内容就是域名：
   ```
   osthing.com
   ```
2. DNS 加一条 `CNAME` 记录指向 `oSthing.github.io.`
3. 仓库 Settings → Pages → Custom domain 填上，等 TLS 证书签发
4. `astro.config.mjs` 的 `site: 'https://osthing.com'`

---

## 10. 自动化部署脚本 (PowerShell)

`deploy.ps1` 把"构建 → 推源码 → 同步 dist → 推站点"整条流水线串成一条命令。

### 10.1 流程

```
[1/4] Build                 npm run build
[2/4] Source commit + push   → oSthing/terminal-blog
[3/4] Sync dist → site       清空 oSthing.github.io clone + 复制 dist/
[4/4] Site commit + push     → oSthing/oSthing.github.io
```

走方案 A（GitHub Actions）的用户加 `-SkipDeploy`，由 Actions 接手 3、4 步。

### 10.2 快速上手

```powershell
cd F:\terminal-blog
.\deploy.ps1                       # 构建 + 推送两个仓库，UTC 时间戳作为 commit message
.\deploy.ps1 -Message "fix: typo"  # 自定义 commit message
.\deploy.ps1 -SkipBuild            # 用现有 dist/，跳过 npm run build
.\deploy.ps1 -SkipDeploy           # 只推源码，部署交给 GitHub Actions
.\deploy.ps1 -SkipSource           # 只推站点，源码由你自己单独管理
.\deploy.ps1 -DryRun               # 演练，不真改任何东西
```

### 10.3 路径假设

脚本默认站点仓库在源码仓库的**同级目录**：

```
F:\terminal-blog\          ← 脚本运行处
F:\oSthing.github.io\      ← 站点 clone（自动推断）
```

不一致时用 `-SiteDir` 显式指定：

```powershell
.\deploy.ps1 -SiteDir "D:\repos\oSthing.github.io"
```

### 10.4 Dev 文档自动排除

脚本对源码仓库用 `git add -A` + `git restore --staged` 实现：

- `CLAUDE.md`
- `DEPLOY.md`
- `DESIGN.md`
- `FEATURES.md`
- `PROJECT.md`

这些文件留在工作区作为本地笔记，不会进 commit。需要时 `git add -f <file>` 强制加。

### 10.5 完整参数

```powershell
Get-Help .\deploy.ps1 -Full
```

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `-Message` | `deploy: <UTC ISO8601>` | commit message |
| `-SkipBuild` | off | 跳过 `npm run build` |
| `-SkipSource` | off | 跳过源码仓库的 commit + push |
| `-SkipDeploy` | off | 跳过站点仓库的 commit + push |
| `-SiteDir` | `<srcDir>/../oSthing.github.io` | 站点仓库路径 |
| `-DryRun` | off | 演练，不真改任何东西 |

### 10.6 第一次运行

1. 先完成第 5 节的"一次性清理"（强烈建议先备份 `oSthing.github.io`）。
2. `cd F:\terminal-blog`。
3. `.\deploy.ps1 -DryRun` 先看会做什么。
4. 去掉 `-DryRun` 真跑。
5. 浏览器硬刷 `https://oSthing.github.io/` 验证。

---

## 11. 子路径部署（参考）

如果以后改成项目页（`oSthing.github.io/terminal-blog/`）：

1. `astro.config.mjs` 里改 `base: '/terminal-blog'`。
2. 删掉 `public/robots.txt` 里指向 `sitemap.xml` 的绝对路径，改成相对。
3. 在方案 A 的 workflow 注入 `ASTRO_BASE: /terminal-blog` 环境变量，构建命令改成 `ASTRO_BASE=$ASTRO_BASE npm run build`。
4. 站点仓库的 Pages 仍然是 `main` / `/`，但访问路径变为 `/terminal-blog/`。
