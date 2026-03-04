export interface Env {
  DB: any; // 运行时由 Cloudflare D1 提供，开发期不强约束类型
  JWT_SECRET: string;
  ADMIN_TOKEN: string;
  OPENLIST_BASE_URL: string;
}

