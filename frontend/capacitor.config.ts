import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.promptoptimizer.app",
  appName: "Prompt Optimizer",
  webDir: "build",
  server: {
    androidScheme: "https",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#050505",
      androidSplashResourceName: "splash",
    },
  },
};

export default config;
