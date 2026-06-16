# Cyber Terminal Blog

一个极简的、终端驱动的个人博客。基于 Astro、TypeScript、TailwindCSS 和 xterm.js 构建。

- **在线预览：** https://example.com
- **技术栈：** Astro 5 · TypeScript · TailwindCSS · xterm.js
- **部署方式：** GitHub Pages

## 特性

- 首页是一个交互式终端，自带虚拟文件系统
- 内置十二个命令：`help`、`clear`、`ls`、`pwd`、`cd`、`cat`、`whoami`、`blog`、`projects`、`contact`、`theme`、`search`
- 通过 Astro Content Collections 加载 Markdown 内容
- 每篇文章自动生成阅读时间、标签芯片、目录
- 自动生成 RSS 订阅和站点地图
- 支持浅色 / 深色 / 跟随系统三套主题，无闪烁（FOUC）
- 完全静态 —— 无服务端、无数据库

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:4321）
npm run dev

# 生产构建，产物输出到 ./dist
npm run build

# 本地预览生产构建
npm run preview

# 类型与内容校验
npm run check
```

## 项目结构

```
src/
├── components/        # Header、Footer、ThemeToggle、PostCard、TableOfContents、ThemeScript
├── content/blog/      # Markdown 文章（自动注册）
├── layouts/           # BaseLayout、BlogLayout
├── pages/             # 路由，含 rss.xml.ts 和 sitemap.xml.ts
├── scripts/           # terminal.ts、commands.ts、filesystem.ts、store.ts
└── styles/global.css  # Tailwind 入口与自定义 CSS 变量
```

## 写一篇文章

在 `src/content/blog/` 下新建一个 Markdown 文件，使用以下 frontmatter：

```markdown
---
title: '文章标题'
description: '一句话简介。'
pubDate: 2026-06-15
tags: ['主题-a', '主题-b']
draft: false
---

正文内容。
```

文章会自动注册，并出现在以下位置：

- 首页终端的 `blog` 命令列表中；
- `/blog` 文章列表页；
- RSS 订阅；
- 站点地图；
- `search` 命令的索引中。

## 终端命令

| 命令 | 说明 |
| --- | --- |
| `help` | 列出所有命令及其简要说明。 |
| `clear` | 清屏。 |
| `ls [path]` | 列出当前目录（或指定路径）。 |
| `pwd` | 显示当前工作目录。 |
| `cd <path>` | 切换目录。支持 `.`、`..` 和绝对路径。 |
| `cat <file>` | 输出文件内容。 |
| `whoami` | 简短的个人简介。 |
| `blog [slug]` | 列出全部文章，或打开指定一篇。 |
| `projects` | 列出项目。 |
| `contact` | 显示联系方式。 |
| `theme <light\|dark\|system>` | 切换主题。 |
| `search <query>` | 搜索文章的标题、简介、正文和标签。 |

使用 ↑ / ↓ 可以翻阅历史命令。

## 部署

仓库自带 GitHub Actions 工作流 `.github/workflows/deploy.yml`，流程如下：

1. 安装依赖（`npm ci`）；
2. 构建静态站点（`npm run build`）；
3. 将 `dist/` 发布到 GitHub Pages。

启用步骤：

1. 将仓库推送到 GitHub。
2. 打开 **Settings → Pages**，将 **Source** 设为 **GitHub Actions**。
3. 推送到 `main` 分支即可自动部署，后续推送会自动重新部署。

### 项目页面（子路径）

如果你的仓库叫 `you/terminal-blog`，希望部署在 `you.github.io/terminal-blog/`：

1. 添加工作流变量 `ASTRO_BASE: /terminal-blog`，并将构建步骤改为 `ASTRO_BASE=$ASTRO_BASE npm run build`；
2. 在 `astro.config.mjs` 中设置 `base: '/terminal-blog'`；
3. 更新 `public/robots.txt` 中的站点地图 URL。

## 自定义

- **站点元信息：** 编辑 `src/consts.ts`（标题、简介、社交链接）。
- **配色：** 调整 `src/styles/global.css` 与 `tailwind.config.mjs` 中的 CSS 变量。
- **导航：** 在 `src/consts.ts → NAV` 中增删条目。
- **终端输出：** 编辑 `src/scripts/commands.ts`。

## 许可证

MIT —— 详见 `LICENSE`。
