import express from 'express';
import { getCandles } from '../controllers/dataController.js';

const router = express.Router();

router.get('/candles', getCandles);

export default router;
