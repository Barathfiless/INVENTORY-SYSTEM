import express from 'express';
import { getPurchases, createPurchase } from '../controllers/purchaseController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(protect, authorize('admin'));
router.route('/').get(getPurchases).post(createPurchase);

export default router;
