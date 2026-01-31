# 流摹 LiuMo ✍️

> 数字化书法练习伴侣 | A Digital Calligraphy Practice Companion

流摹 (LiuMo) 是一款基于 Tauri 2.0 构建的跨平台书法练习应用。它结合了现代 Web 技术与传统书法美学，为您提供沉浸式的练字体验。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Tauri](https://img.shields.io/badge/Tauri-2.0-orange.svg)
![Vue](https://img.shields.io/badge/Vue-3.0-green.svg)

## ✨ 核心功能 (Features)

*   **海量离线诗词库**: 
    *   内置 **40万+** 首诗词歌赋，无需联网即可搜索。
    *   涵盖：全唐诗、全宋词、元曲、古文观止、诗经、论语、蒙学及现代诗。
    *   支持按朝代、作者、体裁（诗/词/曲/文）快速筛选。
*   **沉浸式体验**:
    *   **水墨涟漪**: 独特的交互反馈，指尖触碰如墨入水。
    *   **每日诗词**: 汲取传统配色的动态主题系统，全面支持**深色模式**。
*   **智能排版策略 (Smart Layout Strategy)**:
    *   **自动适配**: 根据体裁（唐诗/宋词/古文）自动切换布局策略。
    *   **Grid (诗)**: 经典米字格/田字格，严谨对齐。
    *   **Flow (词/曲)**: 动态流式布局，完美呈现长短句韵律。
    *   **Center (文)**: 居中对齐排版，优化长篇古文阅读体验。
    *   完美支持中文古风竖排布局 (`vertical-rl`)。
*   **智能网格系统**: 支持米字格、田字格、回宫格，可自定义显示或隐藏。
*   **本地字体管理**: 
    *   支持拖拽安装 `.ttf/.otf` 字体。
    *   Rust 后端智能校验（自动检测是否支持“永”字）。
    *   无需安装到系统，应用内即拖即用。
*   **专业级导出**: 
    *   **智能分页**: 自动计算诗词布局，防止跨页截断。
    *   **字体嵌入**: 彻底解决 PDF 导出后的字体缺失问题。
    *   **HarfBuzz 引擎**: 引入工业级排版引擎，导出速度提升 50%。
    *   支持将作品导出为 A4 格式 PDF，自动添加页眉页脚与装裱边框。
*   **极致性能 (Ultra Performance)**: 
    *   **FTS5 全文检索**: 基于 SQLite FTS5 + Trigram 分词，40万条数据检索响应 **<50ms**。
    *   **虚拟滚动**: 重构列表渲染引擎，支持数十万条数据丝滑流畅滚动。
    *   数据包高压缩内置，安装包仅 ~60MB。

## 🛠️ 技术栈 (Tech Stack)

*   **Core**: [Rust](https://www.rust-lang.org/) + [Tauri 2.0](https://tauri.app/) + [SQLite (FTS5)](https://www.sqlite.org/fts5.html)
*   **Frontend**: [Vue 3](https://vuejs.org/) + [TypeScript](https://www.typescriptlang.org/) + [Pinia](https://pinia.vuejs.org/)
*   **UI/Styling**: [Tailwind CSS 4](https://tailwindcss.com/) + [daisyUI 5](https://daisyui.com/)
*   **Data Engineering**: Node.js ETL Pipeline (OpenCC + Bun)
*   **Asset Management**: [LiuMo-assets](https://github.com/mcheiyue/LiuMo-assets) - 独立维护的大型二进制资源库（数据库、字体），以保持主仓库轻量化。

## 🤝 致谢 (Credits)

本项目的数据灵魂来自于以下杰出的开源项目，特此感谢：

*   **[chinese-poetry](https://github.com/chinese-poetry/chinese-poetry)**: 最全的中华古诗词数据库（唐宋诗词、古文观止、诗经论语等）。
*   **[modern-poetry](https://github.com/yuxqiu/modern-poetry)**: 最全的中国现代诗歌数据库。

## 🚀 快速开始 (Quick Start)

### 环境要求
*   Node.js (建议 v18+)
*   Rust (Cargo 工具链)
*   VS Build Tools (Windows)

### 安装与运行

```bash
# 1. 克隆项目
git clone https://github.com/mcheiyue/liumo.git

# 2. 安装依赖
npm install
# 或者使用 bun
bun install

# 3. 启动开发模式 (桌面端)
npm run tauri dev
# 或者
bun tauri dev
```

## 📦 打包发布

```bash
bun tauri build
```

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源。
