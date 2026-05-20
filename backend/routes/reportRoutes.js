import express from 'express';
import { getDashboardStats, getReports } from '../controllers/reportController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(protect, authorize('admin'));
router.get('/dashboard', getDashboardStats);
router.get('/', getReports);

export default router;
