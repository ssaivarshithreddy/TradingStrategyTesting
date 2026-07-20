import config from '../config/config.js';
import logger from '../utils/logger.js';

/**
 * Generates technical analysis commentary using local Ollama instance running Llama 3.1
 * @param {Object} signal - complete validated signal
 * @returns {Promise<Object>} - enriched signal with ai_analysis: { trade_explanation, risk_explanation, confidence_reasoning, professional_reasoning }
 */
export async function enrichSignalWithAI(signal) {
  const fallbackAnalysis = {
    trade_explanation: `Technical trigger initiated by ${signal.strategyUsed} at ${signal.entry}. Bollinger Bands indicators and trend structures are aligned.`,
    risk_explanation: `Stop loss placed at ${signal.stopLoss} below local structures. Volatility (ATR: ${signal.indicators?.atr || 'N/A'}) indicates moderate risk. Invalidation occurs on SL breach.`,
    confidence_reasoning: `Confidence rated at ${signal.confidence}% based on standard Strategy parameters and ATR alignment.`,
    professional_reasoning: `Market structure shows standard technical behavior. Dynamic support is at ${signal.indicators?.support || 'N/A'} and resistance at ${signal.indicators?.resistance || 'N/A'}.`,
  };

  const ind = signal.indicators || {};
  
  // Construct the prompt
  const prompt = `You are a Senior Quantitative Trading Analyst specializing in Gold (XAU/USD).
Analyze the following trading setup:
- Asset: XAU/USD (Gold)
- Strategy: ${signal.strategyUsed}
- Direction: ${signal.direction}
- Entry Price: ${signal.entry}
- Stop Loss: ${signal.stopLoss}
- Take Profit: ${signal.takeProfit}
- Risk-Reward: ${signal.riskReward}
- Calculated Confidence: ${signal.confidence}%
- Candlestick Reversal Pattern: ${signal.pattern}
- Technical Indicators Snapshot:
  - EMA 9: ${ind.ema9 || 'N/A'}
  - Bollinger Bands: Middle: ${ind.bbMiddle || 'N/A'}, Upper: ${ind.bbUpper || 'N/A'}, Lower: ${ind.bbLower || 'N/A'}, Width: ${ind.bbWidth || 'N/A'}
  - ATR (14): ${ind.atr || 'N/A'}
  - Trend Direction: ${ind.trend || 'N/A'}
  - Dynamic Support Zone: ${ind.support || 'N/A'}
  - Dynamic Resistance Zone: ${ind.resistance || 'N/A'}

Provide a professional, institutional-grade analysis of this trade.
You MUST respond with a JSON object in this exact format, with no markdown code blocks or wrapper tags:
{
  "trade_explanation": "Detailed explanation of why this trade was triggered based on the strategy and technical indicators.",
  "risk_explanation": "Specific risk analysis including critical support/resistance levels, volatility conditions (ATR), and what would invalidate the setup.",
  "confidence_reasoning": "Reasoning for the assigned confidence score based on indicator alignment and strategy type.",
  "professional_reasoning": "A brief institutional comment on the gold market structure under these indicators."
}`;

  logger.info(`[AI] Requesting analysis from Ollama (Model: ${config.ollama.model}) at ${config.ollama.host}...`);

  try {
    const response = await fetch(`${config.ollama.host}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.ollama.model,
        prompt: prompt,
        format: 'json',
        stream: false,
        options: {
          temperature: 0.3, // Low temperature for consistent trading logic
          num_predict: 500, // Limit response token size
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP Error: ${response.status}`);
    }

    const result = await response.json();
    const cleanResponseText = result.response.trim();

    try {
      const parsedAnalysis = JSON.parse(cleanResponseText);
      
      // Ensure all keys are present
      const finalAnalysis = {
        trade_explanation: parsedAnalysis.trade_explanation || fallbackAnalysis.trade_explanation,
        risk_explanation: parsedAnalysis.risk_explanation || fallbackAnalysis.risk_explanation,
        confidence_reasoning: parsedAnalysis.confidence_reasoning || fallbackAnalysis.confidence_reasoning,
        professional_reasoning: parsedAnalysis.professional_reasoning || fallbackAnalysis.professional_reasoning,
      };

      logger.info('[AI SUCCESS] Successfully generated analyst commentary.');
      return {
        ...signal,
        ai_analysis: finalAnalysis
      };
    } catch (parseError) {
      logger.error(`[AI ERROR] Failed to parse Ollama JSON response: ${cleanResponseText}. Error: ${parseError.message}`);
      return {
        ...signal,
        ai_analysis: fallbackAnalysis
      };
    }
  } catch (error) {
    logger.warn(`[AI WARN] Ollama connection failed: ${error.message}. Falling back to default analyst templates.`);
    return {
      ...signal,
      ai_analysis: fallbackAnalysis
    };
  }
}
