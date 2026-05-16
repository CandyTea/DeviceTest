import { kv } from '@vercel/kv';

const LEADERBOARD_KEY = 'reaction_leaderboard';
const MAX_ENTRIES = 30;

export default async function handler(req) {
  if (req.method === 'GET') {
    const entries = await kv.zrange(LEADERBOARD_KEY, 0, MAX_ENTRIES - 1, { withScores: true, rev: false });
    const list = [];
    for (let i = 0; i < entries.length; i += 2) {
      const [name, ts] = entries[i].split('::');
      list.push({ name, score: Math.round(entries[i + 1]), rank: list.length + 1 });
    }
    return new Response(JSON.stringify(list), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
    });
  }

  if (req.method === 'POST') {
    const body = await req.json();
    const name = String(body.name || 'Anonymous').slice(0, 20).trim();
    const score = Number(body.score);
    if (!name || !(score > 0) || score > 9999) {
      return new Response(JSON.stringify({ error: 'Invalid name or score' }), { status: 400 });
    }
    const member = `${name}::${Date.now()}`;
    await kv.zadd(LEADERBOARD_KEY, { score, member });
    // Prune to keep only top MAX_ENTRIES
    await kv.zremrangebyrank(LEADERBOARD_KEY, 0, -(MAX_ENTRIES + 1));
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response('Method not allowed', { status: 405 });
}
