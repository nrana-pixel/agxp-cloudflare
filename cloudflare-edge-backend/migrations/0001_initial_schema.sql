-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Cloudflare connections table
CREATE TABLE IF NOT EXISTS cloudflare_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    account_id TEXT NOT NULL,
    token_encrypted TEXT NOT NULL,
    token_type TEXT DEFAULT 'api_token',
    scope TEXT,
    connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cf_connections_user_id ON cloudflare_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_cf_connections_status ON cloudflare_connections(status);

-- Deployments table
CREATE TABLE IF NOT EXISTS deployments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    zone_id TEXT NOT NULL,
    zone_name TEXT NOT NULL,
    worker_name TEXT NOT NULL,
    kv_namespace_id TEXT NOT NULL,
    route_pattern TEXT,
    route_id TEXT,
    status TEXT DEFAULT 'active',
    deployed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_deployments_user_id ON deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_deployments_zone_id ON deployments(zone_id);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);

-- Variants table
CREATE TABLE IF NOT EXISTS variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    deployment_id INTEGER NOT NULL,
    url_path TEXT NOT NULL,
    content TEXT NOT NULL,
    content_hash TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (deployment_id) REFERENCES deployments(id) ON DELETE CASCADE,
    UNIQUE(deployment_id, url_path)
);

CREATE INDEX IF NOT EXISTS idx_variants_deployment_id ON variants(deployment_id);
CREATE INDEX IF NOT EXISTS idx_variants_user_id ON variants(user_id);
CREATE INDEX IF NOT EXISTS idx_variants_status ON variants(status);

-- API keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    key_hash TEXT NOT NULL,
    deployment_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (deployment_id) REFERENCES deployments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_deployment_id ON api_keys(deployment_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);

-- AI requests table (analytics)
CREATE TABLE IF NOT EXISTS ai_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deployment_id INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    bot_type TEXT,
    url_path TEXT,
    variant_served INTEGER DEFAULT 0,
    response_time_ms INTEGER DEFAULT 0,
    FOREIGN KEY (deployment_id) REFERENCES deployments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_requests_deployment_id ON ai_requests(deployment_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_timestamp ON ai_requests(timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_requests_bot_type ON ai_requests(bot_type);
