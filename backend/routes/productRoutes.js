import express from 'express';
import {
  getProducts,
  getAllProductsAdmin,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getStockSummary,
} from '../controllers/productController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/categories', getCategories);
router.get('/admin/all', protect, authorize('admin'), getAllProductsAdmin);
router.get('/admin/stock', protect, authorize('admin'), getStockSummary);
router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', protect, authorize('admin'), createProduct);
router.put('/:id', protect, authorize('admin'), updateProduct);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

export default router;
