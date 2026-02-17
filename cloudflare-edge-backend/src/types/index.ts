// Environment bindings
export interface Env {
  DB: D1Database;
  KV_SESSIONS: KVNamespace;
  KV_TOKENS: KVNamespace;
  ENCRYPTION_KEY: string;
  JWT_SECRET: string;
  FRONTEND_URL: string;
  API_BASE_URL: string;
  FIRECRAWL_API_KEY?: string;
  GEMINI_API_KEY?: string;
}

// Client Worker Environment
export interface ClientWorkerEnv {
  VARIANTS: KVNamespace;
  CLIENT_API_KEY: string;
  SITE_ID: string;
  API_ENDPOINT: string;
}

// Database Models
export interface User {
  id: number;
  email: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CloudflareConnection {
  id: number;
  user_id: number;
  account_id: string;
  token_encrypted: string;
  token_type: string;
  scope: string | null;
  connected_at: string;
  status: 'active' | 'disconnected';
}

export interface Deployment {
  id: number;
  user_id: number;
  zone_id: string;
  zone_name: string;
  worker_name: string;
  kv_namespace_id: string;
  route_pattern: string | null;
  route_id: string | null;
  status: 'active' | 'deleted';
  deployed_at: string;
  last_updated: string;
}

export interface Variant {
  id: number;
  user_id: number;
  deployment_id: number;
  url_path: string;
  content: string;
  content_hash: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: number;
  user_id: number;
  key_hash: string;
  deployment_id: number | null;
  created_at: string;
  status: string;
}

export interface AiRequest {
  id: number;
  deployment_id: number;
  timestamp: string;
  user_agent: string | null;
  bot_type: string | null;
  url_path: string | null;
  variant_served: number;
  response_time_ms: number;
}

// API Request/Response Types
export interface ConnectCloudflareRequest {
  token: string;
}

export interface ConnectCloudflareResponse {
  success: boolean;
  accountId?: string;
  error?: string;
}

export interface CloudflareZone {
  id: string;
  name: string;
  status: string;
}

export interface ListZonesResponse {
  zones: CloudflareZone[];
}

export interface CreateDeploymentRequest {
  zoneId: string;
  zoneName: string;
  siteId: string;
}

export interface CreateDeploymentResponse {
  success: boolean;
  deploymentId?: number;
  workerName?: string;
  kvNamespaceId?: string;
  error?: string;
}

export interface CreateVariantRequest {
  deploymentId: number;
  urlPath: string;
  content: string;
}

export interface CreateVariantResponse {
  success: boolean;
  variantId?: number;
  error?: string;
}

export interface AutoGenerateVariantRequest {
  deploymentId: number;
  urlPath: string;
  sourceUrl: string;
  instructions?: string;
}

export interface AutoGenerateVariantResponse {
  success: boolean;
  variantId?: number;
  contentPreview?: string;
  error?: string;
}

export interface UpdateVariantRequest {
  content: string;
}

export interface AnalyticsLogRequest {
  path: string;
  userAgent: string;
  botType: string;
  variantServed: boolean;
  timestamp: string;
}

export interface AnalyticsResponse {
  totalRequests: number;
  variantsServed: number;
  botTypes: Record<string, number>;
  topPaths: Array<{ path: string; count: number }>;
}

export interface AnalyticsSummaryResponse {
  requests24h: number;
  variantsServed24h: number;
  requests7d: number;
  variantsServed7d: number;
}

// JWT Payload
export interface JwtPayload {
  userId: number;
  email: string;
  exp: number;
}

// Cloudflare API Response Types
export interface CloudflareApiResponse<T = any> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
  result: T;
}

export interface CloudflareAccount {
  id: string;
  name: string;
}

export interface CloudflareKVNamespace {
  id: string;
  title: string;
}

export interface CloudflareWorkerRoute {
  id: string;
  pattern: string;
  script: string;
}

// Deployment Service Types
export interface DeploymentResult {
  success: boolean;
  deploymentId?: number;
  workerName?: string;
  kvNamespaceId?: string;
  error?: string;
  variantsUploaded?: number;
}
