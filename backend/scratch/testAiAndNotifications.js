import logger from '../utils/logger.js';
import { enrichSignalWithAI } from '../services/aiService.js';
import { sendWhatsAppSignal } from '../services/whatsappService.js';

async function runAiAndNotificationTest() {
  logger.info('================================================');
  logger.info('STARTING AI ENGINE & WHATSAPP NOTIFICATION TEST');
  logger.info('================================================');

  // 1. Setup a Mock Validated Signal (simulated BUY signal from Strategy B)
  const mockSignal = {
    direction: 'BUY',
    entry: 2016.00,
    stopLoss: 2008.93,
    takeProfit: 2030.14,
    riskReward: 2.00,
    confidence: 80,
    strategyUsed: 'Strategy B (Mean Reversion)',
    pattern: 'Hammer',
    timestamp: new Date().toISOString(),
    indicators: {
      ema9: 2021.20,
      bbMiddle: 2015.05,
      bbUpper: 2031.07,
      bbLower: 1999.03,
      bbWidth: 0.0159,
      atr: 4.71,
      trend: 'UP',
      support: 2002.50,
      resistance: 2045.00,
    }
  };

  logger.info('Created Mock Signal:');
  logger.info(JSON.stringify(mockSignal, null, 2));

  // 2. Query Ollama / Llama 3.1
  logger.info('\n--- Triggering Ollama AI Analysis ---');
  const enrichedSignal = await enrichSignalWithAI(mockSignal);

  logger.info('Enriched Signal with AI Analysis:');
  logger.info(JSON.stringify(enrichedSignal.ai_analysis, null, 2));

  // 3. Dispatch to WhatsApp
  logger.info('\n--- Triggering WhatsApp Cloud Notification ---');
  const wasSent = await sendWhatsAppSignal(enrichedSignal);

  if (wasSent) {
    logger.info('[SUCCESS] WhatsApp message sent successfully.');
  } else {
    logger.warn('[SKIPPED/FAILED] WhatsApp message dispatch did not complete.');
  }

  logger.info('================================================');
  logger.info('AI ENGINE & WHATSAPP VERIFICATION COMPLETE');
  logger.info('================================================');
}

runAiAndNotificationTest().catch(err => {
  logger.error(`Error during AI/Notification test: ${err.stack}`);
  process.exit(1);
});
