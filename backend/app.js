import express from 'express';
import cors from 'cors';
import dataRoutes from './routes/dataRoutes.js';
import signalRoutes from './routes/signalRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import backtestRoutes from './routes/backtestRoutes.js';
import errorMiddleware from './middleware/errorMiddleware.js';

const app = express();

// Standard middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// REST API Route registrations
app.use('/api/data', dataRoutes);
app.use('/api/signals', signalRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/backtest', backtestRoutes);

// Base health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Centralized error handling middleware (must be registered last)
app.use(errorMiddleware);

export default app;
