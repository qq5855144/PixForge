# PixForge

PixForge 是可以在浏览器和 Android 上使用的本地批量图片工作台。支持格式转换、目标体积压缩、裁剪、旋转、尺寸调整和 ZIP 导出。

- JPG、PNG、WebP、GIF、AVIF、SVG 输出。WebP 取决于浏览器编码能力。位图转 SVG 会嵌入原图像素。
- 透明裁剪建议输出 PNG、WebP 或 AVIF。动画可以保留原文件、重新导出为 GIF，或提取首帧。
- 每个文件保留原图和可撤销的编辑参数。裁剪、旋转、缩放在导出时一次编码。JPEG 默认清除 EXIF，可按需保留。
- Android 支持通过系统分享接收图片，通过系统文件选择器保存图片和 ZIP，或向其他应用分享结果。

## 开发

需要 Node.js 22 或更新版本。Android 构建还需要 JDK 21 和 Android SDK 35。

```sh
npm ci
npm run dev
npm run lint
npm run build
npx playwright install chromium
npm test
```

每次修改 Web 源码后，先构建并同步 Web 资源，再构建 APK。

```sh
npm run build
npx cap sync android
cd android
bash gradlew assembleDebug
```

可体验 [PixForge 网页版](https://qq5855144.github.io/PixForge/)。
