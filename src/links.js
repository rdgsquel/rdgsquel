import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const X_RE = /https?:\/\/(?:www\.|mobile\.)?(?:x|twitter|fxtwitter|vxtwitter|fixupx)\.com\/(\w+)\/status\/(\d+)/i;
const URL_RE = /https?:\/\/[^\s]+/i;

/** Retorna o primeiro link da mensagem, ou null. */
export function findUrl(text) {
  return text?.match(URL_RE)?.[0] || null;
}

async function download(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ao baixar mídia`);
  return Buffer.from(await res.arrayBuffer());
}

/** X/Twitter via API pública do fxtwitter (fotos, vídeos e GIFs). */
async function fromX(user, id) {
  const res = await fetch(`https://api.fxtwitter.com/${user}/status/${id}`);
  if (!res.ok) return [];
  const media = (await res.json())?.tweet?.media?.all || [];
  const out = [];
  for (const m of media) {
    if (!m.url) continue;
    if (m.type === 'photo') out.push({ animated: false, ext: 'jpg', buffer: await download(m.url) });
    else if (m.type === 'video' || m.type === 'gif') out.push({ animated: true, ext: 'mp4', buffer: await download(m.url) });
  }
  return out;
}

/** Qualquer site suportado pelo yt-dlp (Instagram, TikTok, YouTube, X...). */
async function fromYtDlp(url, ytdlp) {
  const dir = await mkdtemp(join(tmpdir(), 'ytdlp-'));
  try {
    await run(ytdlp, ['--no-playlist', '--max-filesize', '50M', '-f', 'best[ext=mp4]/best',
      '-o', join(dir, 'media.%(ext)s'), url], { timeout: 120_000 });
    const file = (await readdir(dir))[0];
    if (!file) throw new Error('nada baixado');
    const ext = file.split('.').pop().toLowerCase();
    const animated = !['jpg', 'jpeg', 'png', 'webp'].includes(ext);
    return [{ animated, ext, buffer: await readFile(join(dir, file)) }];
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Baixa as mídias de um link. */
export async function fetchFromUrl(url, { ytdlp = 'yt-dlp' } = {}) {
  const x = url.match(X_RE);
  if (x) {
    try {
      const items = await fromX(x[1], x[2]);
      if (items.length) return items;
    } catch { /* cai para o yt-dlp */ }
  }
  return fromYtDlp(url, ytdlp);
}
