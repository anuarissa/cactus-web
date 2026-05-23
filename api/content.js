/**
 * GET /api/content — devuelve content.json del repo (menú + promos), siempre fresco.
 * Lee vía GitHub API (server-side) para evitar CORS/cache. Fallback {} si falla.
 */
const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;
const BRANCH = process.env.GITHUB_BRANCH || 'master';
const TOKEN = process.env.GITHUB_TOKEN;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method' });
  try {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/content.json?ref=${BRANCH}&t=${Date.now()}`;
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github.raw', 'User-Agent': 'cactus-web' },
    });
    if (!r.ok) throw new Error('github ' + r.status);
    const data = await r.json();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(data);
  } catch (e) {
    return res.status(200).json({ error: String(e) });
  }
}
