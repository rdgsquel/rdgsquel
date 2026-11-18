# Bot de Figurinhas para WhatsApp

Mande **imagem, vídeo, GIF ou link** (X/Twitter, Instagram, TikTok, YouTube…) e o bot devolve a figurinha pronta.

## Requisitos
- Node.js 20+
- `ffmpeg` com libwebp
- `yt-dlp` (só para links que não sejam do X): `pip install yt-dlp`

## Como usar
```bash
npm install
cp .env.example .env     # ajuste o nome do grupo/pacote
npm start
```
1. Escaneie o QR: WhatsApp > **Aparelhos conectados** > Conectar aparelho.
2. Crie um grupo só com você chamado **Stickers** (ou o nome que pôs em `ALLOWED_GROUP_NAMES`).
3. Mande mídia ou link no grupo → ⏳ → figurinha → ✅.

`!id` em qualquer conversa mostra o JID dela (para usar em `ALLOWED_GROUPS`/`ALLOWED_USERS`).

## Observações
- Usa a biblioteca não oficial Baileys: use um número secundário se puder (risco de bloqueio).
- A sessão fica em `auth_info/` — não compartilhe. Para deslogar, apague a pasta.
- Para ficar 24h no ar, rode num VPS/PC ligado (ex.: `pm2 start src/index.js`).
