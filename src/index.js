import { startBot } from './bot.js';

startBot().catch((err) => {
  console.error('[bot] erro fatal:', err);
  process.exit(1);
});
