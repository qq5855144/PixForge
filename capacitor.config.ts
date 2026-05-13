import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pixforge.app',
  appName: 'PixForge',
  webDir: 'dist',
  android: {
    // Allow file:// access for local image processing
    allowMixedContent: true,
  },
  server: {
    // Enable cleartext for local development
    cleartext: true,
  },
};

export default config;
