import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import webp from 'node-webpmux';

const run = promisify(execFile);
const LIMIT_STATIC = 100 * 1024; // limite do WhatsApp p/ figurinha estática
const LIMIT_ANIM = 500 * 1024; // limite p/ animada

/** EXIF com nome do pacote/autor no formato que o WhatsApp lê. */
export function buildExif(pack, author) {
  const json = Buffer.from(JSON.stringify({
    'sticker-pack-id': 'whatsapp-sticker-bot',
    'sticker-pack-name': pack,
    'sticker-pack-publisher': author,
    emojis: ['✨'],
  }));
  const head = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
    0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
  head.writeUInt32LE(json.length, 14);
  return Buffer.concat([head, json]);
}

// Encaixa em 512x512 mantendo proporção, com bordas transparentes.
const filter = (fps) => [
  fps && `fps=${fps}`,
  'scale=512:512:force_original_aspect_ratio=decrease',
  'format=rgba',
  'pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0',
].filter(Boolean).join(',');

/**
 * Converte imagem/vídeo/GIF em figurinha WebP.
 * @param {Buffer} input
 * @param {{animated: boolean, ext?: string, pack?: string, author?: string, maxSeconds?: number}} o
 */
export async function toSticker(input, o) {
  const { animated, ext = animated ? 'mp4' : 'png', pack = 'Figurinhas', author = 'bot', maxSeconds = 8 } = o;
  const dir = await mkdtemp(join(tmpdir(), 'stk-'));
  const inPath = join(dir, `in.${ext}`);
  const outPath = join(dir, 'out.webp');
  try {
    await writeFile(inPath, input);
    let out;
    if (!animated) {
      for (const q of [80, 55, 35]) {
        await run('ffmpeg', ['-y', '-i', inPath, '-vf', filter(), '-frames:v', '1',
          '-c:v', 'libwebp', '-lossless', '0', '-compression_level', '6', '-q:v', String(q), outPath]);
        out = await readFile(outPath);
        if (out.length <= LIMIT_STATIC) break;
      }
    } else {
      const passes = [[15, 60, maxSeconds], [12, 40, Math.min(maxSeconds, 6)], [10, 25, Math.min(maxSeconds, 5)]];
      for (const [fps, q, t] of passes) {
        await run('ffmpeg', ['-y', '-t', String(t), '-i', inPath, '-vf', filter(fps), '-an',
          '-c:v', 'libwebp', '-loop', '0', '-q:v', String(q), '-fps_mode', 'passthrough', outPath]);
        out = await readFile(outPath);
        if (out.length <= LIMIT_ANIM) break;
      }
    }
    const img = new webp.Image();
    await img.load(out);
    img.exif = buildExif(pack, author);
    return await img.save(null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
