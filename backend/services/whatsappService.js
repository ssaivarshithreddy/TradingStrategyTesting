import config from '../config/config.js';
import logger from '../utils/logger.js';

/**
 * Sends a validated trading signal alert via WhatsApp Cloud API
 * @param {Object} signal - Enriched signal with AI analysis
 * @returns {Promise<boolean>} - true if sent successfully, false otherwise
 */
export async function sendWhatsAppSignal(signal) {
  const token = config.whatsapp.token;
  const phoneNumberId = config.whatsapp.phoneNumberId;
  const recipient = config.whatsapp.recipientNumber;

  // Check if API credentials are set
  if (!token || !phoneNumberId || !recipient) {
    logger.warn('[WHATSAPP WARN] WhatsApp credentials not configured in .env. Skipping message dispatch.');
    return false;
  }

  // Construct message body
  const messageBody = 
`📊 *GOLD (XAU/USD) TRADING SIGNAL* 📊
------------------------------------------
Action: *${signal.direction}*
Trigger Price: *$${signal.entry.toFixed(2)}*
Strategy: *${signal.strategyUsed}*
Pattern: *${signal.pattern}*
Confidence: *${signal.confidence}%*
------------------------------------------
Entry: *$${signal.entry.toFixed(2)}*
Stop Loss: *$${signal.stopLoss.toFixed(2)}*
Take Profit: *$${signal.takeProfit.toFixed(2)}*
Risk-Reward: *${signal.riskReward}*
------------------------------------------
💡 *AI Analyst Summary:*
${signal.ai_analysis.trade_explanation}

⚠️ *Risk & Invalidation:*
${signal.ai_analysis.risk_explanation}
`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient,
    type: 'text',
    text: {
      preview_url: false,
      body: messageBody,
    },
  };

  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

  logger.info(`[WHATSAPP] Dispatching trading alert to recipient: ${recipient}...`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`WhatsApp API HTTP Error ${response.status}: ${JSON.stringify(result)}`);
    }

    logger.info(`[WHATSAPP SUCCESS] Alert successfully delivered. Message ID: ${result.messages?.[0]?.id || 'unknown'}`);
    return true;
  } catch (error) {
    logger.error(`[WHATSAPP ERROR] Failed to send message: ${error.message}`);
    return false;
  }
}
