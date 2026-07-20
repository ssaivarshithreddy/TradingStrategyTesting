import express from 'express';
import { getSignalHistory, checkLiveSignals } from '../controllers/signalController.js';

const router = express.Router();

router.get('/history', getSignalHistory);
router.post('/check-live', checkLiveSignals);

export default router;
