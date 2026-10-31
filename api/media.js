import crypto from 'node:crypto';
import { authed, redis } from './_lib.js';

const OK = /^data:(image\/(?:webp|jpeg|png|gif|avif));base64,([A-Za-z0-9+/=]+)$/;

export default async function handler(req, res) {
  const db = redis();
  if (req.method === 'GET') {
    const id = String(req.query.id || '');
    if (!/^[a-f0-9]{24}$/.test(id) || !db) return res.status(404).end();
    const m = await db.get('fargo:media:' + id);
    if (!m || !m.data) return res.status(404).end();
    res.setHeader('Content-Type', m.type);
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
    return res.status(200).send(Buffer.from(m.data, 'base64'));
  }
  if (req.method === 'POST') {
    if (!authed(req)) return res.status(401).json({ error: 'Your session ended. Sign in again.' });
    if (!db) return res.status(500).json({ error: 'Storage is not connected. Add Upstash for Redis in Vercel, then redeploy.' });
    const m = OK.exec((req.body && req.body.data) || '');
    if (!m) return res.status(400).json({ error: 'That file is not a supported image. Use JPG, PNG, WebP or GIF.' });
    if (m[2].length > 4000000) return res.status(413).json({ error: 'That image is too large even after compressing. Try a smaller one.' });
    const id = crypto.createHash('sha256').update(m[2]).digest('hex').slice(0, 24);
    await db.set('fargo:media:' + id, { type: m[1], data: m[2] });
    return res.status(200).json({ url: '/api/media?id=' + id });
  }
  return res.status(405).json({ error: 'Use GET or POST.' });
}
