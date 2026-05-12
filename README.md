# PixForge 🎨

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="version">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license">
  <img src="https://img.shields.io/badge/platform-web%20%7C%20android-brightgreen" alt="platform">
  <img src="https://img.shields.io/badge/privacy-first-ff69b4" alt="privacy">
  <img src="https://img.shields.io/badge/PWA-ready-5a0fc8" alt="pwa">
</p>

<p align="center">
  <b>免费 · 高效 · 隐私优先</b><br>
  一款完全在浏览器端运行的在线图片格式转换与压缩工具。<br>
  无需上传服务器，所有处理均在本地完成，保障您的数据安全。
</p>

---

## 📖 目录

- [功能特性](#-功能特性)
- [在线使用](#-在线使用)
- [本地开发](#-本地开发)
- [构建 Android APK](#-构建-android-apk)
- [项目结构](#-项目结构)
- [技术栈](#-技术栈)
- [浏览器兼容性](#-浏览器兼容性)
- [常见问题](#-常见问题)
- [贡献指南](#-贡献指南)
- [许可证](#-许可证)

---

## ✨ 功能特性

| 功能 | 说明 |
|------|------|
| 🔄 **格式转换** | 支持 JPEG、PNG、WebP、AVIF、SVG、BMP、TIFF 等主流图片格式互转 |
| 📦 **批量处理** | 一次性上传多张图片，批量转换并自动打包为 ZIP 下载 |
| ⚡ **智能压缩** | 可调节质量参数，在视觉质量与文件大小之间取得最佳平衡 |
| 🔒 **隐私优先** | 所有处理均在浏览器本地完成，图片绝不会上传到任何远程服务器 |
| 📱 **PWA 支持** | 可安装为桌面或移动端离线应用，无需网络即可使用 |
| 🤖 **Android APK** | 通过 GitHub Actions 自动构建 WebView 封装的原生 Android 安装包 |
| 🌓 **主题切换** | 支持明色/暗色模式，跟随系统偏好自动切换 |
| 🧩 **拖拽上传** | 支持拖拽图片到页面直接添加，操作直观便捷 |
| 📋 **格式选项** | 转换前可预览并调整输出格式、质量、尺寸等参数 |

---

## 🚀 在线使用

访问 **[https://[用户名].github.io/PixForge](https://[用户名].github.io/PixForge)** 即可立即使用，无需安装任何软件。

> 💡 **提示**：在浏览器地址栏右侧点击「安装」图标，可将 PixForge 添加为桌面应用。

---

## 💻 本地开发

### 环境要求

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0 或 **yarn** >= 1.22.0

### 快速开始

```bash
# 克隆仓库
git clone https://github.com/[用户名]/PixForge.git
cd PixForge

# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:5173）
npm run dev

# 构建生产版本（输出至 dist/ 目录）
npm run build

# 本地预览生产版本
npm run preview
```

### 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器，支持热更新 |
| `npm run build` | 构建生产版本，开启代码压缩与优化 |
| `npm run preview` | 本地预览已构建的生产版本 |
| `npm run lint` | 运行 ESLint 代码风格检查 |

---

## 📱 构建 Android APK

本项目配置了 GitHub Actions 自动化工作流，推送代码到 `main` 分支即可自动触发 APK 构建。

### 自动构建（推荐）

1. 推送代码到 `main` 分支
2. 前往仓库 **Actions** 标签页查看构建进度
3. 构建完成后，在对应 Workflow Run 的 **Artifacts** 中下载 APK

### 手动构建

| 步骤 | 操作 |
|------|------|
| 1. 环境准备 | 安装 Android SDK（API 34）和 JDK 11 |
| 2. 复制资源 | 将 `dist/` 目录内容复制到 `android/app/src/main/assets/` |
| 3. 构建 APK | 在 `android/` 目录执行 `./gradlew assembleDebug` |
| 4. 获取产物 | APK 生成于 `android/app/build/outputs/apk/debug/app-debug.apk` |

> ⚠️ **注意**：手动构建前请先执行 `npm run build` 生成最新的前端资源。

---

## 📂 项目结构

```
PixForge/
├── .github/
│   └── workflows/          # GitHub Actions 工作流
│       ├── deploy.yml      # 自动部署到 GitHub Pages
│       └── build-apk.yml   # Android APK 自动构建
├── android/                # Android WebView 封装项目
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── assets/     # 前端构建产物（自动复制）
│   │   │   ├── java/       # Android 原生代码
│   │   │   └── res/        # Android 资源文件
│   │   └── build.gradle
│   └── build.gradle        # 项目级 Gradle 配置
├── src/                    # 前端源代码
│   ├── components/         # React 组件
│   ├── utils/              # 工具函数（格式转换、压缩算法等）
│   ├── workers/            # Web Workers 文件
│   └── App.tsx             # 应用入口
├── public/                 # 静态资源
│   ├── favicon.ico
│   └── manifest.json       # PWA 清单文件
├── index.html              # HTML 入口
├── vite.config.ts          # Vite 构建配置
├── package.json            # 项目依赖与脚本
├── README.md
└── LICENSE
```

---

## 🛠 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **框架** | React 18 | 基于函数组件与 Hooks 的声明式 UI |
| **构建工具** | Vite 5 | 极速开发体验，原生 ESM 支持 |
| **语言** | TypeScript | 提供完整的类型安全保障 |
| **样式** | CSS Modules / Tailwind CSS | 模块化样式，避免全局污染 |
| **图像处理** | Canvas API + Web Workers | 多线程图像处理，不阻塞主线程 UI |
| **打包压缩** | JSZip | 浏览器端 ZIP 打包，支持流式处理 |
| **PWA** | Workbox | Service Worker 缓存策略与离线支持 |
| **CI/CD** | GitHub Actions | 自动构建、测试、部署与 APK 打包 |
| **代码质量** | ESLint + Prettier | 统一代码风格，自动格式化 |

---

## 🌐 浏览器兼容性

| 浏览器 | 最低版本 | 说明 |
|--------|----------|------|
| Chrome | 90+ | 全面支持，推荐使用 |
| Firefox | 90+ | 全面支持 |
| Safari | 15+ | 支持 WebP/AVIF 转换 |
| Edge | 90+ | 基于 Chromium，全面支持 |
| Opera | 76+ | 全面支持 |

> ℹ️ **注意**：AVIF 格式的编码/解码在部分旧版本浏览器中可能受限，系统会自动降级为 WebP。

---

## ❓ 常见问题

<details>
<summary><b>Q: 我的图片真的不会被上传吗？</b></summary>
<p>
是的。PixForge 的所有图像处理均通过浏览器原生 API（Canvas、Web Workers）在本地完成，您可以打开开发者工具的网络面板验证——转换过程中不会产生任何网络请求。
</p>
</details>

<details>
<summary><b>Q: 最大支持多大的图片？</b></summary>
<p>
理论上受浏览器内存限制，一般建议单张图片不超过 50MB。对于超大图片（如 8000×8000 像素以上），建议适当缩小尺寸后再上传以获得更流畅的体验。
</p>
</details>

<details>
<summary><b>Q: 转换后的图片质量如何？</b></summary>
<p>
您可以在转换前手动调节质量参数（1-100%）。默认质量设置为 85%，在视觉无损的前提下可显著减小文件体积。对于需要极致质量的场景，建议设置为 95% 以上。
</p>
</details>

<details>
<summary><b>Q: 支持 SVG 转 PNG/JPEG 吗？</b></summary>
<p>
支持。PixForge 可将 SVG 矢量图渲染为指定尺寸的 PNG 或 JPEG 位图，适合用于生成预览缩略图或兼容不支持 SVG 的场景。
</p>
</details>

<details>
<summary><b>Q: 移动端使用体验如何？</b></summary>
<p>
PixForge 针对移动端进行了响应式适配，同时支持 PWA 安装和独立 APK 安装，在移动设备上可获得接近原生应用的体验。
</p>
</details>

---

## 🤝 贡献指南

我们非常欢迎社区贡献！无论是报告 Bug、提出新功能建议，还是提交代码，请遵循以下流程：

### 贡献流程

1. **Fork** 本仓库到您的 GitHub 账户
2. **创建分支** → `git checkout -b feature/your-feature-name`
3. **编写代码** → 请遵循项目的 ESLint 规则，确保代码风格一致
4. **提交更改** → 使用 Conventional Commits 格式：
   ```bash
   git commit -m "feat: 添加 WebP 无损压缩选项"
   git commit -m "fix: 修复批量转换时内存泄漏问题"
   git commit -m "docs: 更新 API 文档"
   ```
5. **推送分支** → `git push origin feature/your-feature-name`
6. **创建 Pull Request** → 请填写清晰的标题和描述，关联相关 Issue

### 提交规范

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 Bug |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 重构（既非新功能也非修复） |
| `perf` | 性能优化 |
| `test` | 添加测试 |
| `chore` | 构建过程或辅助工具变更 |
| `ci` | CI 配置变更 |

### Issue 规范

- 🐛 **Bug 报告**：请提供复现步骤、期望行为、实际行为及浏览器版本
- 💡 **功能建议**：请描述使用场景、期望效果及实现思路
- ❓ **问题咨询**：请先查阅常见问题，如未解决再提 Issue

---

## 📄 许可证

本项目基于 **MIT 许可证** 开源。您可以自由使用、修改、分发本项目的代码，但需保留原始版权声明。

详见 [LICENSE](LICENSE) 文件。

---

<p align="center">
  <sub>Made with ❤️ by <a href="https://github.com/[用户名]">PixForge Team</a></sub><br>
  <sub>如果这个项目对您有帮助，请给我们一颗 ⭐ Star！</sub>
</p>
