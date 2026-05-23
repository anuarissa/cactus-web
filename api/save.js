/**
 * POST /api/save — guarda el menú/promos editados (auth con ADMIN_PASSWORD).
 * Commitea content.json (+ fotos nuevas) al repo vía GitHub API → la web los lee al toque.
 *
 * Body JSON: { content: {...}, images?: [{ name, dataB64 }] }
 * Header: x-admin-pass: <ADMIN_PASSWORD>
 */
const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;
const BRANCH = process.env.GITHUB_BRANCH || 'master';
const TOKEN = process.env.GITHUB_TOKEN;
const PASS = process.env.ADMIN_PASSWORD;

const api = (path, opts = {}) =>
  fetch(`https://api.github.com/repos/${OWNER}/${REPO}/${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'cactus-web',
      ...(opts.headers || {}),
    },
  });

async function getSha(path) {
  const r = await api(`contents/${path}?ref=${BRANCH}&t=${Date.now()}`);
  if (r.ok) { const j = await r.json(); return j.sha; }
  return undefined;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!PASS || (req.headers['x-admin-pass'] || '') !== PASS) return res.status(401).json({ error: 'no autorizado' });
  if (!TOKEN || !OWNER || !REPO) return res.status(500).json({ error: 'config incompleta' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'json' }); } }
  const content = body?.content;
  const images = Array.isArray(body?.images) ? body.images : [];
  if (!content || typeof content !== 'object') return res.status(400).json({ error: 'content faltante' });

  try {
    const imgUrls = {};
    for (const im of images) {
      if (!im?.name || !im?.dataB64) continue;
      const safe = im.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const path = `assets/menu/${safe}`;
      const sha = await getSha(path);
      const put = await api(`contents/${path}`, {
        method: 'PUT',
        body: JSON.stringify({ message: `admin: foto ${safe}`, content: im.dataB64, branch: BRANCH, sha }),
      });
      if (put.ok) imgUrls[im.name] = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${path}`;
    }

    content.updatedAt = new Date().toISOString();
    const sha = await getSha('content.json');
    const put = await api('contents/content.json', {
      method: 'PUT',
      body: JSON.stringify({
        message: 'admin: actualizar menú/promos',
        content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
        branch: BRANCH,
        sha,
      }),
    });
    if (!put.ok) throw new Error('commit content ' + put.status + ' ' + (await put.text()).slice(0, 200));
    return res.status(200).json({ ok: true, imgUrls });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
