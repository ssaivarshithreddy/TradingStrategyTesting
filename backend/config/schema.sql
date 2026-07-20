-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Candles Table (Historical & Live Data)
CREATE TABLE IF NOT EXISTS candles (
    id BIGSERIAL PRIMARY KEY,
    timeframe VARCHAR(10) NOT NULL, -- '30m', '1h', '4h', '1d'
    timestamp TIMESTAMPTZ NOT NULL,
    open NUMERIC(12, 4) NOT NULL,
    high NUMERIC(12, 4) NOT NULL,
    low NUMERIC(12, 4) NOT NULL,
    close NUMERIC(12, 4) NOT NULL,
    volume NUMERIC(16, 4) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_candle_timeframe_timestamp UNIQUE (timeframe, timestamp)
);

-- Index for fast queries by timeframe and timestamp (most recent first)
CREATE INDEX IF NOT EXISTS idx_candles_timeframe_timestamp ON candles(timeframe, timestamp DESC);

-- 2. Signals Table
CREATE TABLE IF NOT EXISTS signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL,
    direction VARCHAR(10) NOT NULL, -- 'BUY', 'SELL', 'NO_TRADE'
    entry_price NUMERIC(12, 4),
    stop_loss NUMERIC(12, 4),
    take_profit NUMERIC(12, 4),
    risk_reward NUMERIC(6, 2),
    confidence NUMERIC(5, 2),
    strategy_used VARCHAR(50),
    detected_pattern VARCHAR(50),
    indicators_state JSONB,
    ai_analysis JSONB, -- { explanation, risk, reasoning, confidence_reason }
    is_sent_whatsapp BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for looking up signals chronologically
CREATE INDEX IF NOT EXISTS idx_signals_timestamp ON signals(timestamp DESC);

-- 3. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Populate default settings
INSERT INTO system_settings (key, value) VALUES
('platform_config', '{"active_strategies": ["BB_BREAKOUT", "MEAN_REVERSION"], "notifications_enabled": true}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
