import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import supabase from '../config/db.js';
import config from '../config/config.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_SETTINGS_PATH = path.join(__dirname, '..', 'config', 'settings.json');

const DEFAULT_SETTINGS = {
  active_strategies: ['BB_BREAKOUT', 'MEAN_REVERSION', 'SUPERTREND_PIVOT', 'CPR_WIDTH'],
  notifications_enabled: true,
  risk_reward_min: 2.0,
  risk_percentage: 1.0,
  trading_timeframes: ['5m', '30m', '1h', '4h', '1d'],
};

function readLocalSettings() {
  try {
    if (fs.existsSync(LOCAL_SETTINGS_PATH)) {
      const content = fs.readFileSync(LOCAL_SETTINGS_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    logger.error(`Error reading settings.json: ${error.message}`);
  }
  return DEFAULT_SETTINGS;
}

function writeLocalSettings(settings) {
  try {
    const configDir = path.dirname(LOCAL_SETTINGS_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch (error) {
    logger.error(`Error writing settings.json: ${error.message}`);
    return false;
  }
}

export async function getSettings(req, res, next) {
  try {
    const isDefaultDb = config.supabase.url.includes('your-project-id');
    
    if (isDefaultDb) {
      const localSettings = readLocalSettings();
      return res.status(200).json({
        source: 'local-file',
        settings: localSettings,
      });
    }

    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'platform_config')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found, populate default settings
        const { error: insertError } = await supabase
          .from('system_settings')
          .insert([{ key: 'platform_config', value: DEFAULT_SETTINGS }]);
        if (insertError) throw insertError;
        return res.status(200).json({
          source: 'database-initialized',
          settings: DEFAULT_SETTINGS,
        });
      }
      throw error;
    }

    return res.status(200).json({
      source: 'database',
      settings: data.value,
    });
  } catch (error) {
    logger.error(`Error in getSettings: ${error.message}`);
    next(error);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const newSettings = req.body;

    // Basic validation
    if (!newSettings || typeof newSettings !== 'object') {
      return res.status(400).json({ error: 'Invalid settings payload.' });
    }

    const isDefaultDb = config.supabase.url.includes('your-project-id');

    if (isDefaultDb) {
      const current = readLocalSettings();
      const updated = { ...current, ...newSettings };
      writeLocalSettings(updated);
      return res.status(200).json({
        message: 'Settings updated successfully on local file.',
        settings: updated,
      });
    }

    const { data, error } = await supabase
      .from('system_settings')
      .upsert({ key: 'platform_config', value: newSettings, updated_at: new Date().toISOString() })
      .select();

    if (error) throw error;

    return res.status(200).json({
      message: 'Settings updated successfully in database.',
      settings: newSettings,
    });
  } catch (error) {
    logger.error(`Error in updateSettings: ${error.message}`);
    next(error);
  }
}
