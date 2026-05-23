/**
 * Feed de Instagram para la web (Vercel serverless).
 * Llama a la Graph API con las env vars IG_USER_ID + IG_TOKEN (token de system user
 * de Meta, sin vencimiento). Si faltan, devuelve [] y la web usa el fallback.
 *
 * Setear en Vercel:  IG_USER_ID, IG_TOKEN
 */
export default async function handler(req, res) {
  const id = process.env.IG_USER_ID;
  const token = process.env.IG_TOKEN;
  if (!id || !token) return res.status(200).json({ data: [] });
  try {
    const fields = 'media_url,thumbnail_url,permalink,media_type,caption,timestamp';
    const url = `https://graph.facebook.com/v21.0/${id}/media?fields=${fields}&limit=9&access_token=${token}`;
    const r = await fetch(url);
    const j = await r.json();
    const data = (j.data || [])
      .map((m) => ({
        media_url: m.media_type === 'VIDEO' ? m.thumbnail_url : m.media_url,
        permalink: m.permalink,
      }))
      .filter((m) => m.media_url)
      .slice(0, 6);
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    return res.status(200).json({ data });
  } catch (e) {
    return res.status(200).json({ data: [], error: String(e) });
  }
}
