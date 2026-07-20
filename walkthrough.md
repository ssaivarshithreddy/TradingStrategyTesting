# Phase 1, 2, 3, 4, & 5 Walkthrough: Multi-Asset & Multi-Timeframe (5m Supported)

This walkthrough documents the completed setup, implementation, and verification of the database storage, market data ingestion, technical indicators, candlestick pattern detection, trading strategies, signal validator, Ollama AI commentary engine, WhatsApp messaging alerts, Express REST APIs, the historical Backtesting simulation engine, and our multi-asset and multi-timeframe capabilities (supporting timeframes down to 5-minute ticks).

---

## Technical Stack & Architecture

The application is structured into a modular decoupled backend and frontend monorepo:
*   **Backend**: Node.js & Express server with ES Modules, custom configuration validators, Winston logging, and custom exception handlers.
*   **Frontend**: React.js client compiled with Vite, styled with a custom Obsidian Dark & Gold Tailwind theme, and featuring TradingView Lightweight Charts.
*   **Storage**: Supabase PostgreSQL database integration.
*   **AI Reasoning**: Local Llama 3.1 model running via Ollama.
*   **Alert Routing**: WhatsApp Cloud API `/messages` endpoint integration.

```mermaid
flowchart TD
    subgraph Market Data
        Yahoo[Yahoo Finance GC=F Ticker & ^NSEI Ticker] --> Ingest[Data Ingestion Service]
    end

    subgraph Supabase / Local storage
        Ingest --> DB[(Supabase PostgreSQL)]
        DB <--> Auth[Supabase Auth]
    </div>

    subgraph Node.js Backend MVC
        DB --> Calc[Indicator Service]
        Calc --> Patterns[Candlestick Pattern Engine]
        Patterns --> Strat[Strategy Engine: Breakout, Reversion, & Supertrend]
        Strat --> Valid[Signal Validator]
        Valid --> AI[Ollama Llama 3.1 Engine]
        AI --> Notify[WhatsApp Cloud API]
    end

    subgraph React Frontend
        Dash[Vite React Client] <--> API[Express REST API]
        Dash --> Chart[TradingView Interactive Charts]
    end
```

---

## Feature Summaries

### 1. Multi-Timeframe Ingestion
*   Synchronizes and indexes XAU/USD (Gold Futures `GC=F`) and Nifty 50 Index (`^NSEI`) prices for **`5m`**, `30m`, `1h`, `4h`, and `1d` boundaries.
*   Pulls 1-hour candles and groups them onto strict 4-hour UTC blocks to resolve the lack of native `4h` Yahoo API charts.
*   Enforces a 30-day fetch cap on `5m`/`30m` intervals to avoid Yahoo Finance API query constraints.

### 2. Technical Indicators & Reversals
*   Calculates EMA 9, 20-period Bollinger Bands and widths, 14-period ATR volatility, and trend slopes.
*   Features a candlestick pattern engine matching **Doji**, **Hammer**, **Shooting Star**, **Pin Bar**, and **Bullish/Bearish Engulfing** reversal candle setups.
*   Identifies swing points to locate dynamic support and resistance zones.
*   **Supertrend (7, 3)**: Computes trailing bands to establish trend structures.
*   **Daily Pivots**: Aggregates calendar day candle structures backwards to locate R1 Resistance and S1 Support levels.

### 3. Strategy Engines & Risk Validator
*   **Strategy A (Volatility Breakout)**: Enters trades when Bollinger Bands enter a flat squeeze followed by candle body closes outside the envelope and expanding widths.
*   **Strategy B (Mean Reversion)**: Enters trades when price spikes beyond outer Bollinger Bands against trend, forms a Hammer/Engulfing pattern, and heads back to EMA 9.
*   **Strategy C (Supertrend Pivot Breakout)**: Enters trades when price breaks standard pivot support/resistance levels (R1 or S1) aligned with the active Supertrend trend direction.
*   **Validator**: Enforces a strict **1:2 Risk-to-Reward ratio** for entry, Stop Loss, and Take Profit levels based on ATR and swing bounds or the Supertrend trailing stop line.

### 4. Ollama Llama 3.1 & WhatsApp Notifications
*   Passes validated signal payloads to a local Llama 3.1 LLM, returning structured JSON analyst commentary (trade rational, risks, confidence reasoning).
*   Encodes commentary into WhatsApp alerts sent to the configured recipient number. Includes fallback analyst templates if Ollama is offline.

### 5. React Dashboard & Interactive Charts
*   **Dashboard view**: Displays live prices, trend status, dynamic support/resistance points, strategy rules, and manual refresh sync buttons. Features selectors to switch between Gold Futures and Nifty 50 Index feeds, and timeframes (including `5m`).
*   **Interactive Chart view**: Integrates TradingView charts to render candlesticks with overlaid EMA 9, Bollinger Bands, and markers denoting swing levels and pattern detections.
*   **Signal History view**: Tabulates past signals, opening a modal window to read the Llama 3.1 quantitative analyses.
*   **Backtesting view**: Evaluates Strategy A, B, or C historical performance on either Gold or Nifty 50 Index datasets across any of the timeframes (including `5m`).

---

## Verification & Testing Logs

All modules were verified locally and simulated with unit tests:
1.  **Ingestion In-Memory Fallback**: Verified fetching and grouping 236+ candles from Yahoo Finance.
2.  **Strategy B Simulation**: Confirmed a mock flush successfully triggered Strategy B, generating a BUY signal at `$2016` (SL: `$2008.93`, TP: `$2030.14`, R:R: `2.0`, Confidence: `80%`).
3.  **Strategy A Squeeze Simulation**: Confirmed Squeeze contraction and breakout triggered a BUY signal at `$2030` (SL: `$2018.80`, TP: `$2052.39`, R:R: `2.0`, Confidence: `70%`).
4.  **Strategy C (Supertrend Pivot Breakout) Simulation**: Verified that executing `npm run test-backtester` successfully simulated Strategy C on 461 candles from live Gold Futures quotes.
5.  **Nifty 50 Index Ingestion & Simulation**: Confirmed that running Strategy C on 140 hourly candles of Nifty 50 Index (`^NSEI`) successfully simulated 1 trade: BUY at `24031.10`, Exit at `24343.65` (WIN: `+$2000`, Win Rate: `100%`, Max Drawdown: `0.00%`).
6.  **5-Minute (`5m`) Timeframe verification**: Executed backtest on Nifty 50 (`^NSEI`) 5-minute candles over a 30-day window (1500 quotes). Verified Strategy C triggered 10 trades: Win Rate: `40%`, Profit Factor: `1.33`, Max Drawdown: `4.00%`, and final balance: `$102,000.00`, completing successfully without errors.
7.  **AI Commentaries**: Verified Ollama JSON generation and fallback commentary outputs.
8.  **Backtest Runs**: Simulated Strategy B and C over historical hourly candles, resolving trades and logging win rate, drawdowns, and final balance metrics correctly.

---

## How to Run the Platform

### Prerequisites
1.  Ensure you have **Node.js v20.x** installed.
2.  Install and start **Ollama** (https://ollama.com) and pull Llama 3.1:
    ```bash
    ollama pull llama3.1
    ```

### 1. Start the Express Backend Server
1.  Go to the `backend` directory.
2.  Copy `.env.example` to `.env` and fill in your Supabase connection strings, WhatsApp tokens, etc. (Or run with default placeholders for offline mock/dry-run fallbacks).
3.  Install packages and start the server:
    ```bash
    npm install
    npm run dev
    ```
    *The server will boot on `http://localhost:5000`.*

### 2. Start the React Frontend Application
1.  Go to the `frontend` directory.
2.  Install packages and run the Vite dev server:
    ```bash
    npm install
    npm run dev
    ```
    *Open `http://localhost:5173` in your browser.*
