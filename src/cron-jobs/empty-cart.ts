import cron from 'node-cron';
import Cart from '../models/cartModel';

const emptyExpiredCarts = async () => {
  try {
    const expirationTime = new Date(Date.now() - 24 * 60 * 60 * 1000); 
    const cartsToEmpty = await Cart.find({
      $or: [
        { createdAt: { $lt: expirationTime } },
        { updatedAt: { $lt: expirationTime } }
      ],
      'products.0': { $exists: true } 
    });

    for (const cart of cartsToEmpty) {
      cart.products = [];
      cart.totalQuantity = 0;
      cart.totalPrice = 0;
      await cart.save();
      console.log(`Emptied cart ${cart._id}`);
    }

    if (cartsToEmpty.length > 0) {
      console.log(`Emptied ${cartsToEmpty.length} expired carts`);
    }
  } catch (error) {
    console.error('Error emptying expired carts:', error);
    // Optional: Add retry logic or alert admins
  }
};

export const emptyCartJob = cron.schedule('0 * * * *', emptyExpiredCarts, {
  scheduled: false 
});

export const runEmptyExpiredCartsNow = emptyExpiredCarts;