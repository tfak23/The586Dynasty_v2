// Google Sheets API client using service account JWT auth

interface TokenCache {
  token: string;
  expiry: number;
}

let tokenCache: TokenCache | null = null;

function base64UrlEncode(data: string): string {
  return btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createJwt(email: string, key: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const unsigned = `${headerB64}.${payloadB64}`;

  // Import private key
  const pemContent = key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '');
  const binaryDer = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsigned)
  );

  const sigB64 = base64UrlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  );

  return `${unsigned}.${sigB64}`;
}

async function getAccessToken(): Promise<string> {
  // Check cache
  if (tokenCache && Date.now() < tokenCache.expiry) {
    return tokenCache.token;
  }

  const email = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')!;
  const privateKeyB64 = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')!;
  const privateKey = atob(privateKeyB64);

  const jwt = await createJwt(email, privateKey);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) {
    throw new Error(`Google auth failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  tokenCache = {
    token: data.access_token,
    expiry: Date.now() + (data.expires_in - 60) * 1000,
  };

  return data.access_token;
}

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

export async function readSheet(
  spreadsheetId: string,
  range: string
): Promise<string[][]> {
  const token = await getAccessToken();
  const res = await fetch(
    `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    throw new Error(`Sheets read failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.values || [];
}

export async function writeSheet(
  spreadsheetId: string,
  range: string,
  values: (string | number)[][]
): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(
    `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  );

  if (!res.ok) {
    throw new Error(`Sheets write failed: ${res.status} ${await res.text()}`);
  }
}

export async function batchUpdate(
  spreadsheetId: string,
  data: { range: string; values: (string | number)[][] }[]
): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(
    `${SHEETS_API}/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Sheets batch update failed: ${res.status} ${await res.text()}`);
  }
}

export async function clearRange(
  spreadsheetId: string,
  range: string
): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(
    `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Sheets clear failed: ${res.status} ${await res.text()}`);
  }
}

export async function findInColumn(
  spreadsheetId: string,
  range: string,
  searchValue: string
): Promise<number | null> {
  const rows = await readSheet(spreadsheetId, range);
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0]?.toLowerCase().trim() === searchValue.toLowerCase().trim()) {
      return i;
    }
  }
  return null;
}

export async function appendRow(
  spreadsheetId: string,
  range: string,
  values: (string | number)[]
): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(
    `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [values] }),
    }
  );

  if (!res.ok) {
    throw new Error(`Sheets append failed: ${res.status} ${await res.text()}`);
  }
}
