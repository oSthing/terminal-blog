# Features

## Terminal System

实现一个前端模拟文件系统。

当前目录：

/

支持命令：

help

clear

ls

pwd

cd

cat

whoami

blog

projects

contact

theme

search

------

help

显示所有命令

------

pwd

显示当前路径

------

ls

列出当前目录

------

cd

切换目录

示例：

cd blog

cd projects

cd ..

------

cat

显示文件内容

示例：

cat about.txt

------

whoami

显示个人简介

------

blog

列出所有文章

------

blog [slug]

打开文章

例如：

blog hash-length-extension

跳转：

/blog/hash-length-extension

------

projects

显示项目列表

------

contact

显示联系方式

------

theme

切换主题

light

dark

system

------

search

搜索文章

例如：

search zerologon

返回匹配文章

------

## Markdown Blog

目录：

src/content/blog

所有 Markdown 自动注册

自动生成：

标题

日期

标签

阅读时间

目录

------

支持：

Markdown

GitHub Markdown

代码高亮

Mermaid

KaTeX

代码复制按钮

------

## RSS

自动生成RSS

------

## Sitemap

自动生成

------

## 评论

预留接口

默认关闭

未来可接：

Giscus

Utterances

------

## Analytics

预留接口

未来可接：

Plausible

Umami