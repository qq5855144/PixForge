# PixForge

一款免费、高效的在线图片格式转换与压缩工具，纯浏览器端处理，保护您的隐私。

## ✨ 功能特性

- 🔄 **格式转换** — 支持 JPEG、PNG、WebP、AVIF、SVG 等主流图片格式互转
- 📦 **批量处理** — 一次性上传多张图片，批量转换并打包下载（ZIP）
- ⚡ **极速压缩** — 智能压缩算法，在视觉质量与文件大小之间取得最佳平衡
- 🔒 **隐私优先** — 所有处理均在浏览器本地完成，图片不会上传到任何服务器
- 📱 **PWA 支持** — 可安装为桌面/移动端离线应用
- 🤖 **Android APK** — 通过 GitHub Actions 自动构建 WebView 封装的 Android 安装包

## 🛠 技术栈

- **前端框架**：React / Vite
- **样式**：Modern CSS
- **图像处理**：Canvas API / Web Workers
- **打包压缩**：JSZip
- **CI/CD**：GitHub Actions（自动构建 APK）

## 🚀 在线使用

访问 [https://[用户名].github.io/PixForge](https://[用户名].github.io/PixForge) 即可直接使用。

## 💻 本地开发

```bash
# 克隆仓库
git clone https://github.com/[用户名]/PixForge.git
cd PixForge

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 📱 构建 Android APK

本项目配置了 GitHub Actions，推送代码到 `main` 分支即可自动构建 APK。

你也可以手动构建：

1. 确保安装了 Android SDK 和 JDK 11
2. 将 `index.html` 及 `assets/` 目录复制到 `android/app/src/main/assets/`
3. 在 `android/` 目录下执行 `./gradlew assembleDebug`
4. APK 生成路径：`android/app/build/outputs/apk/debug/app-debug.apk`

构建产物可在 GitHub Actions 的 Artifacts 中下载。

## 📂 项目结构

```
PixForge/
├── .github/workflows/   # GitHub Actions 工作流
│   └── build-apk.yml     # Android APK 自动构建
├── android/              # Android WebView 封装项目
├── assets/               # 构建产物（JS/CSS/JSZip）
├── index.html            # 入口页面
└── README.md
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: 添加新功能'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目基于 MIT 许可证开源。详见 [LICENSE](LICENSE) 文件。

---

<p align="center">Made with ❤️ by PixForge Team</p>
