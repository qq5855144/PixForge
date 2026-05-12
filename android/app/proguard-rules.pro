# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in the Android SDK tools proguard/proguard-android-optimize.txt

# Retain WebView related classes
-keep class * extends android.webkit.WebViewClient
-keep class * extends android.webkit.WebChromeClient

# Keep the MainActivity
-keep class com.pixforge.webview.MainActivity { *; }
