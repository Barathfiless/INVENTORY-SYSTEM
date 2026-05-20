import express from 'express';
import { getPurchases, createPurchase, deletePurchase } from '../controllers/purchaseController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(protect, authorize('admin'));
router.route('/').get(getPurchases).post(createPurchase);
router.route('/:id').delete(deletePurchase);

export default router;
