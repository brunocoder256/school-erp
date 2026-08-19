export const appConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "School ERP",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  environment: process.env.NODE_ENV ?? "development",
};
