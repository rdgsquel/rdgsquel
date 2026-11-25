import { startBot } from './bot.js';

startBot().catch((err) => {
  console.error('[bot] erro fatal:', err);
  process.exit(1);
});

// Evita que um erro isolado derrube o bot.
process.on('unhandledRejection', (e) => console.error('[bot] erro:', e?.message || e));


// Apertar Enter na janela desliga o bot.
if (process.stdin.isTTY) {
  process.stdin.on('data', () => process.exit(0));
}
