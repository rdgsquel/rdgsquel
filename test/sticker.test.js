import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildExif, toSticker } from '../src/sticker.js';
import { findUrl } from '../src/links.js';

test('exif contém nome do pacote', () => {
  assert.match(buildExif('Pack', 'Eu').toString(), /"sticker-pack-name":"Pack"/);
});

test('findUrl acha o link', () => {
  assert.equal(findUrl('olha https://x.com/a/status/1?s=08 aqui'), 'https://x.com/a/status/1?s=08');
  assert.equal(findUrl('sem link'), null);
});

const dir = mkdtempSync(join(tmpdir(), 't-'));
const gen = (args, file) => { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args, join(dir, file)]); return readFileSync(join(dir, file)); };

test('imagem vira webp 512x512 < 100KB', async () => {
  const out = await toSticker(gen(['-f', 'lavfi', '-i', 'testsrc=size=800x400', '-frames:v', '1'], 'a.png'), { animated: false, ext: 'png' });
  assert.equal(out.subarray(0, 4).toString(), 'RIFF');
  assert.ok(out.length <= 100 * 1024);
});

test('vídeo vira webp animado < 500KB', async () => {
  const out = await toSticker(gen(['-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=30', '-t', '3', '-pix_fmt', 'yuv420p'], 'v.mp4'), { animated: true, ext: 'mp4' });
  assert.ok(out.includes(Buffer.from('ANIM')));
  assert.ok(out.length <= 500 * 1024);
});
