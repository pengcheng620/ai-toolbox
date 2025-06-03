"use server"

async function fetchOAuthToken(): Promise<string> {
  const urlencoded = new URLSearchParams();
  urlencoded.append("client_id", process.env.MS_OAUTH_CLIENT_ID || '');
  urlencoded.append("client_secret", process.env.MS_OAUTH_CLIENT_SECRET || '');
  urlencoded.append("grant_type", process.env.MS_OAUTH_GRANT_TYPE || '');
  urlencoded.append("scope", process.env.MS_OAUTH_SCOPE || '');

  const response = await fetch(process.env.MS_OAUTH_URL || '', {
    method: "POST",
    body: urlencoded,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OAuth token fetch failed: ${errorData.error_description || 'Unknown error'}`);
  }

  const data = await response.json();
  console.log("============================", new Date().toLocaleString() , "================================")
  console.log("response::::::", data)
  return data.access_token;
}

let cachedToken: string | null = null;
let tokenExpiryTime: number | null = null;

export async function getToken() {
  const currentTime = Date.now();

  if (cachedToken && tokenExpiryTime && currentTime < tokenExpiryTime) {
    return cachedToken;
  }

  // 获取新的 token
  cachedToken = await fetchOAuthToken();
  tokenExpiryTime = currentTime + 3600 * 1000; // 1 小时有效期

  return cachedToken;
}
