// Pure: parse request metadata. Cloudflare provides cf-ipcountry.
export type RequestMeta = { ip: string | null; country: string | null; userAgent: string | null };

export function metaFromHeaders(h: Headers): RequestMeta {
  const fwd = h.get('x-forwarded-for');
  return {
    ip: fwd ? fwd.split(',')[0].trim() : null,
    country: h.get('cf-ipcountry') ?? h.get('x-vercel-ip-country') ?? null,
    userAgent: h.get('user-agent') ?? null,
  };
}
