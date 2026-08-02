import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.taskflow.mobile',
  appName: 'TaskFlow',
  webDir: '../../dist',
  server: { androidScheme: 'https' },
};

export default config;
