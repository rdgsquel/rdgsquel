import makeWASocket, {
  DisconnectReason, downloadMediaMessage, fetchLatestBaileysVersion, useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { config } from './config.js';
import { fetchFromUrl, findUrl } from './links.js';
import { toSticker } from './sticker.js';

const logger = pino({ level: 'warn' });
const groupNames = new Map();

function unwrap(m) {
  while (m) {
    const inner = m.ephemeralMessage?.message || m.viewOnceMessage?.message
      || m.viewOnceMessageV2?.message || m.documentWithCaptionMessage?.message;
    if (!inner) break;
    m = inner;
  }
  return m;
}

const textOf = (c) => (c.conversation || c.extendedTextMessage?.text || c.imageMessage?.caption
  || c.videoMessage?.caption || c.documentMessage?.caption || '').trim();

async function groupName(sock, jid) {
  if (!groupNames.has(jid)) {
    try { groupNames.set(jid, (await sock.groupMetadata(jid)).subject || ''); } catch { return ''; }
  }
  return groupNames.get(jid);
}

async function allowed(sock, jid) {
  if (config.allowAll) return true;
  if (jid.endsWith('@g.us')) {
    return config.groups.includes(jid)
      || (config.groupNames.length > 0 && config.groupNames.includes(await groupName(sock, jid)));
  }
  return config.users.includes(jid);
}

/** Identifica o que converter: mídia enviada ou link. */
function detect(c, text) {
  if (c.imageMessage) return { kind: 'media', animated: false, ext: 'jpg' };
  if (c.videoMessage) return { kind: 'media', animated: true, ext: 'mp4' };
  const mime = c.documentMessage?.mimetype || '';
  if (mime.startsWith('image/')) {
    const gif = mime === 'image/gif';
    return { kind: 'media', animated: gif, ext: gif ? 'gif' : 'png' };
  }
  if (mime.startsWith('video/')) return { kind: 'media', animated: true, ext: 'mp4' };
  const url = findUrl(text);
  return url ? { kind: 'url', url } : null;
}

const react = (sock, jid, key, text) => sock.sendMessage(jid, { react: { text, key } }).catch(() => {});

async function handle(sock, msg) {
  const jid = msg.key?.remoteJid;
  if (!jid || jid === 'status@broadcast') return;
  const c = unwrap(msg.message);
  if (!c || c.stickerMessage || c.reactionMessage) return;
  const text = textOf(c);

  if (text === '!id') {
    const name = jid.endsWith('@g.us') ? await groupName(sock, jid) : 'privado';
    await sock.sendMessage(jid, { text: `JID de "${name}":\n${jid}` }, { quoted: msg });
    return;
  }
  if (!(await allowed(sock, jid))) return;

  const input = detect(c, text);
  if (!input) return;

  await react(sock, jid, msg.key, '⏳');
  try {
    const items = input.kind === 'url'
      ? await fetchFromUrl(input.url, { ytdlp: config.ytdlp })
      : [{ ...input, buffer: await downloadMediaMessage(msg, 'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage }) }];
    for (const it of items) {
      const sticker = await toSticker(it.buffer, {
        animated: it.animated, ext: it.ext, pack: config.pack, author: config.author, maxSeconds: config.maxSeconds,
      });
      await sock.sendMessage(jid, { sticker }, { quoted: msg });
    }
    await react(sock, jid, msg.key, '✅');
  } catch (err) {
    console.error('[bot] falha:', err);
    await react(sock, jid, msg.key, '❌');
    await sock.sendMessage(jid, { text: `Não consegui fazer a figurinha: ${err.message}` }, { quoted: msg });
  }
}

export async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({ version, logger, auth: state });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\nEscaneie no WhatsApp > Aparelhos conectados > Conectar aparelho:');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') console.log('[bot] conectado ✅');
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.log('[bot] deslogado. Apague a pasta auth_info e rode de novo.');
      } else {
        setTimeout(() => startBot().catch(console.error), 3000);
      }
    }
  });
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const m of messages) await handle(sock, m);
  });
}
