import { authed, redis, KEY, HIST } from './_lib.js';
import defaults, { validate } from '../src/content.default.js';

const NO_DB = 'Storage is not connected. In Vercel, open this project, go to Storage, add Upstash for Redis and connect it, then redeploy.';

export default async function handler(req, res) {
  const db = redis();

  if (req.method === 'GET') {
    if ('history' in req.query) {
      res.setHeader('Cache-Control', 'no-store');
      if (!authed(req)) return res.status(401).json({ error: 'Sign in again.' });
      const history = db ? await db.lrange(HIST, 0, 9) : [];
      return res.status(200).json({ history });
    }
    res.setHeader('Cache-Control', 'fresh' in req.query ? 'no-store' : 's-maxage=30, stale-while-revalidate=300');
    let stored = null;
    try { stored = db ? await db.get(KEY) : null; } catch (e) { stored = null; }
    return res.status(200).json(stored || defaults);
  }

  if (req.method === 'PUT') {
    if (!authed(req)) return res.status(401).json({ error: 'Your session ended. Sign in again.' });
    if (!db) return res.status(500).json({ error: NO_DB });
    const body = req.body;
    const err = validate(body);
    if (err) return res.status(400).json({ error: err });
    const prev = await db.get(KEY);
    if (prev) { await db.lpush(HIST, { savedAt: Date.now(), content: prev }); await db.ltrim(HIST, 0, 9); }
    await db.set(KEY, body);
    return res.status(200).json({ ok: true, savedAt: Date.now() });
  }

  return res.status(405).json({ error: 'Use GET or PUT.' });
}
