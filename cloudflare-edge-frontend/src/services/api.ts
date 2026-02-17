const API_BASE_URL = 'http://localhost:8787';

// Test JWT for development (expires in 1 year)
// User: { userId: 1, email: 'test@example.com' }
const MOCK_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImV4cCI6MTgwMjc4MTA1MH0.Vlj_Nr_906D5nwIH0qguxy5-vpAMd5uE9vI4X8Xdq_0'; 

export async function connectCloudflare(token: string) {
  const res = await fetch(`${API_BASE_URL}/api/cloudflare/connect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MOCK_JWT}`
    },
    body: JSON.stringify({ token }),
  });
  return res.json();
}

export async function getZones() {
  const res = await fetch(`${API_BASE_URL}/api/cloudflare/zones`, {
    headers: { 'Authorization': `Bearer ${MOCK_JWT}` }
  });
  return res.json();
}

export async function createDeployment(zoneId: string, zoneName: string, siteId: string) {
  const res = await fetch(`${API_BASE_URL}/api/deployments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MOCK_JWT}`
    },
    body: JSON.stringify({ zoneId, zoneName, siteId }),
  });
  return res.json();
}

export async function getDeployments() {
  const res = await fetch(`${API_BASE_URL}/api/deployments`, {
    headers: { 'Authorization': `Bearer ${MOCK_JWT}` }
  });
  return res.json();
}

export async function createVariant(deploymentId: number, urlPath: string, content: string) {
  const res = await fetch(`${API_BASE_URL}/api/variants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MOCK_JWT}`
    },
    body: JSON.stringify({ deploymentId, urlPath, content }),
  });
  return res.json();
}

export interface AutoGenerateVariantResponse {
  success: boolean;
  variantId?: number;
  contentPreview?: string;
  error?: string;
}

export async function autoGenerateVariant(
  deploymentId: number,
  urlPath: string,
  sourceUrl: string,
  instructions?: string
): Promise<AutoGenerateVariantResponse> {
  const res = await fetch(`${API_BASE_URL}/api/variants/auto-generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MOCK_JWT}`
    },
    body: JSON.stringify({ deploymentId, urlPath, sourceUrl, instructions }),
  });
  return res.json();
}

export async function getAnalytics(deploymentId: number) {
  const res = await fetch(`${API_BASE_URL}/api/analytics/${deploymentId}`, {
    headers: { 'Authorization': `Bearer ${MOCK_JWT}` }
  });
  return res.json();
}

export async function getSummary(deploymentId: number, period: '24h' | '7d' = '24h') {
  const res = await fetch(`${API_BASE_URL}/api/analytics/${deploymentId}/summary?period=${period}`, {
    headers: { 'Authorization': `Bearer ${MOCK_JWT}` }
  });
  return res.json();
}
