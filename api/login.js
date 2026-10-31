import { authed, cookie, safeEqual, sign } from './_lib.js';

const wait = ms => new Promise(r => setTimeout(r, ms));

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return res.status(200).json({ authed: authed(req), configured: !!process.env.ADMIN_PASSWORD });
  if (req.method === 'DELETE') { res.setHeader('Set-Cookie', cookie('', 0)); return res.status(204).end(); }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST to sign in.' });

  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return res.status(500).json({ error: 'ADMIN_PASSWORD is not set. Add it in Vercel under Settings, Environment Variables, then redeploy.' });

  const given = (req.body && req.body.password) || '';
  if (!safeEqual(given, pw)) { await wait(700); return res.status(401).json({ error: 'That password is wrong.' }); }

  const exp = Date.now() + 1000 * 60 * 60 * 12;
  res.setHeader('Set-Cookie', cookie(sign(exp), 43200));
  return res.status(200).json({ ok: true });
}
