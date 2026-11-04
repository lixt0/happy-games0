// 服务端登录守卫：未登录的页面请求一律跳转到 /login.html
const PUBLIC_PATHS = new Set(['/login.html', '/login', '/robots.txt', '/rss.xml', '/sitemap.xml', '/sitemap', '/rss']);
const SESSION_TTL = 1000 * 60 * 60 * 24 * 30; // 30 天

function parseCookie(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  if (path.startsWith('/api/')) return next();
  if (PUBLIC_PATHS.has(path)) return next();

  // 只对页面请求（HTML）做守卫，静态资源放行
  const accept = request.headers.get('accept') || '';
  if (!accept.includes('text/html')) return next();

  const cookie = parseCookie(request.headers.get('cookie'));
  const token = cookie.hg_token;
  if (token) {
    const s = await env.DB.prepare(
      'SELECT username, expires_at FROM sessions WHERE token = ?'
    ).bind(token).first();
    if (s && s.expires_at > Date.now()) {
      if (path === '/adminPages' || path === '/adminPages/' || path === '/adminPages/index.html') {
        if (s.username !== 'zhoujun') {
          return new Response('Forbidden', { status: 403, headers: { 'Content-Type': 'text/plain; charset=UTF-8' } });
        }
      }
      return next();
    }
  }
  return Response.redirect(new URL('/login.html', url).toString(), 302);
}
