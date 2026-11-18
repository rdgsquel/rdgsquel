import 'dotenv/config';

const list = (v) => (v || '').split(',').map((s) => s.trim()).filter(Boolean);

export const config = {
  pack: process.env.STICKER_PACK || 'Minhas Figurinhas',
  author: process.env.STICKER_AUTHOR || 'bot',
  groups: list(process.env.ALLOWED_GROUPS),
  groupNames: list(process.env.ALLOWED_GROUP_NAMES),
  users: list(process.env.ALLOWED_USERS),
  allowAll: process.env.ALLOW_ALL === 'true',
  maxSeconds: Math.max(1, Number(process.env.MAX_VIDEO_SECONDS) || 8),
  ytdlp: process.env.YTDLP_PATH || 'yt-dlp',
};
