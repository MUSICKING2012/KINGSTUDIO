const BASE_URL = 'https://openexchangerates.org/api';

export interface OxrLatestResponse {
  base: string; // 항상 'USD'
  rates: Record<string, number>;
  timestamp: number;
}

export async function fetchLatestRates(): Promise<OxrLatestResponse> {
  const appId = process.env.OPENEXCHANGERATES_APP_ID;
  if (!appId) throw new Error('OPENEXCHANGERATES_APP_ID missing');

  const res = await fetch(`${BASE_URL}/latest.json?app_id=${appId}&base=USD`);
  if (!res.ok) throw new Error(`OXR fetch failed: ${res.status}`);

  return res.json() as Promise<OxrLatestResponse>;
}
