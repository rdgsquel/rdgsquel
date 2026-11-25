import { startBot } from './bot.js';

startBot().catch((err) => {
  console.error('[bot] erro fatal:', err);
  process.exit(1);
});

// Evita que um erro isolado derrube o bot.
process.on('unhandledRejection', (e) => console.error('[bot] erro:', e?.message || e));

// Salva o número do processo para o "Desligar bot.bat" conseguir encerrar.
import { writeFileSync, rmSync } from 'node:fs';
writeFileSync('bot.pid', String(process.pid));
process.on('exit', () => rmSync('bot.pid', { force: true }));
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => process.exit(0));
