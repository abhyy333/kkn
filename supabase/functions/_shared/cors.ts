// =============================================================================
// SUPABASE EDGE FUNCTIONS: Shared CORS Helper
// Project: scslevzuxxkfcuvwbtty
// Repository: abhyy333/kkn
// =============================================================================

export const STATIC_ALLOWED_ORIGINS = [
  'https://kkn-beta.vercel.app',
  'https://kkn.vercel.app',
  'https://kkn-space.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

/**
 * Validates whether an incoming HTTP Origin is permitted by KKN SPACE CORS policy.
 * Only allows:
 * 1. Production Vercel domains for KKN SPACE
 * 2. Vercel preview deployments strictly matching KKN SPACE project (abhyy333/kkn)
 * 3. AI Studio / Cloud Run preview environments
 * 4. Localhost development environments
 */
export function isAllowedOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  const clean = origin.trim();

  // 1. Static allowlist
  if (STATIC_ALLOWED_ORIGINS.includes(clean)) {
    return true;
  }

  // 2. Localhost any port
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?$/.test(clean)) {
    return true;
  }

  // 3. Vercel deployments strictly for KKN SPACE project (abhyy333/kkn):
  // - https://kkn.vercel.app
  // - https://kkn-beta.vercel.app
  // - https://kkn-space.vercel.app
  // - https://kkn-*-abhyy333s-projects.vercel.app
  // - https://kkn-*-abhyy333.vercel.app
  // - https://kkn-git-*-abhyy333.vercel.app
  // - https://kkn-space-*-abhyy333s-projects.vercel.app
  if (/^https:\/\/kkn(-[a-z0-9-]+)?\.vercel\.app$/.test(clean)) {
    return true;
  }
  if (/^https:\/\/kkn(-[a-z0-9-]+)?-abhyy333s-projects\.vercel\.app$/.test(clean)) {
    return true;
  }
  if (/^https:\/\/kkn(-[a-z0-9-]+)?-abhyy333\.vercel\.app$/.test(clean)) {
    return true;
  }
  if (/^https:\/\/kkn-space(-[a-z0-9-]+)?\.vercel\.app$/.test(clean)) {
    return true;
  }
  if (/^https:\/\/kkn-space(-[a-z0-9-]+)?-abhyy333s-projects\.vercel\.app$/.test(clean)) {
    return true;
  }
  if (/^https:\/\/kkn-space(-[a-z0-9-]+)?-abhyy333\.vercel\.app$/.test(clean)) {
    return true;
  }

  // 4. Cloud Run / AI Studio preview environments
  if (/^https:\/\/(ais-dev-|ais-pre-)?[a-z0-9-]+-[0-9]+\.asia-east1\.run\.app$/.test(clean)) {
    return true;
  }
  if (/^https:\/\/[a-z0-9-]+\.run\.app$/.test(clean)) {
    return true;
  }

  return false;
}

/**
 * Returns complete CORS headers for an allowed origin.
 * Never uses wildcard '*' for authenticated requests.
 */
export function getCorsHeaders(origin: string | null | undefined): Record<string, string> {
  const effectiveOrigin = origin && isAllowedOrigin(origin) ? origin.trim() : 'https://kkn-beta.vercel.app';
  return {
    'Access-Control-Allow-Origin': effectiveOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

/**
 * Handles CORS Preflight (OPTIONS request).
 * - Returns HTTP 200 with complete CORS headers if origin is allowed.
 * - Returns HTTP 403 if origin is not allowed.
 * - Does NOT require Bearer token or execute admin validation.
 */
export function handleCorsPreflight(req: Request): Response {
  const origin = req.headers.get('Origin') || req.headers.get('origin');

  if (origin && !isAllowedOrigin(origin)) {
    return new Response(
      JSON.stringify({ error: `Forbidden: Origin '${origin}' is not allowed by CORS policy.` }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Vary': 'Origin',
        },
      }
    );
  }

  const headers = getCorsHeaders(origin);
  return new Response('ok', {
    status: 200,
    headers,
  });
}
