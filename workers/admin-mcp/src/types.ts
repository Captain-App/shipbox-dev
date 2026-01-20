export interface Env {
  ADMIN_AGENT: DurableObjectNamespace;
  SHIPBOX_API: Fetcher;
  SANDBOX_MCP: Fetcher;
  ENVIRONMENT: string;
  SENTRY_DSN?: string;
  HONEYCOMB_API_KEY?: string;
  HONEYCOMB_DATASET?: string;
  ADMIN_TOKEN: string;
  SENTRY_AUTH_TOKEN?: string;
  SENTRY_ORG: string;
  SENTRY_PROJECT_API: string;
  SENTRY_PROJECT_ENGINE: string;
  // Auth
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}
