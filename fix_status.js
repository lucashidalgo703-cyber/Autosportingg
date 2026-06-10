import mongoose from 'mongoose';
import connectDB from './src/config/db.js';
import Sale from './src/models/Sale.js';

(async () => {
    try {
      await connectDB();
      const result = await Sale.updateMany(
        { deliveryStatus: 'entregado', status: { $ne: 'entregada' }, status: { $ne: 'cancelada' } },
        { $set: { status: 'entregada' } }
      );
      console.log('Fixed sales:', result);
    } catch (e) {
      console.error(e);
    } finally {
      mongoose.disconnect();
    }
})();
