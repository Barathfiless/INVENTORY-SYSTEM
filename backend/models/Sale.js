import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    channel: { type: String, enum: ['inventory', 'ecommerce'], default: 'inventory' },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    customerName: { type: String, trim: true },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Sale', saleSchema);
