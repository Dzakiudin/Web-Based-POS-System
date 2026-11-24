import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dzakiudin.pos',
  appName: 'TOKO AZNUN',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      'earthquaking-jen-faunlike.ngrok-free.dev',
      '*.ngrok-free.dev',
      '*.indevs.in',
      '*.ryzedns.org',
      'localhost',
      '127.0.0.1'
    ]
  }
};

export default config;
