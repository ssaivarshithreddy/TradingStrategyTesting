import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import config from './config.js';
import logger from '../utils/logger.js';

// Initialize Supabase Client
const supabase = createClient(config.supabase.url, config.supabase.key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    transport: ws,
  },
});

// Test/Verify the connection client is created
try {
  if (supabase) {
    logger.info('Supabase client initialized successfully.');
  }
} catch (error) {
  logger.error('Failed to initialize Supabase client:', error);
}

export default supabase;
