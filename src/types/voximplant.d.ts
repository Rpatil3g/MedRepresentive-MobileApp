declare module '@voximplant/react-native-foreground-service' {
  interface NotificationChannelConfig {
    id: string;
    name: string;
    description?: string;
    enableVibration?: boolean;
  }

  interface ServiceConfig {
    channelId: string;
    id: number;
    title: string;
    text: string;
    icon: string;
    button?: boolean;
  }

  class VIForegroundService {
    static getInstance(): VIForegroundService;
    createNotificationChannel(config: NotificationChannelConfig): Promise<void>;
    startService(config: ServiceConfig): Promise<void>;
    stopService(): Promise<void>;
  }

  export default VIForegroundService;
}
