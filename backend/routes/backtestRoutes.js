import express from 'express';
import { runBacktestSimulation } from '../controllers/backtestController.js';

const router = express.Router();

router.post('/run', runBacktestSimulation);

export default router;
