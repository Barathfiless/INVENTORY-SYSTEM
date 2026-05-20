import express from 'express';
import { getSales, createSale } from '../controllers/saleController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(protect, authorize('admin'));
router.route('/').get(getSales).post(createSale);

export default router;
