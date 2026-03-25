import { useCart } from '../context/CartContext';
import { X, Plus, Minus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

export default function CartDrawer() {
  const { isCartOpen, setIsCartOpen, cart, removeFromCart, updateQuantity, cartTotal } = useCart();
  const location = useLocation();

  // Close drawer when route changes
  useEffect(() => {
    setIsCartOpen(false);
  }, [location.pathname, setIsCartOpen]);

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-card-bg border-l border-primary shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-primary">
              <h2 className="text-xl font-display font-bold text-text-primary">Your Cart</h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-gray-500">
                    <X size={32} />
                  </div>
                  <p className="text-text-secondary">Your cart is empty.</p>
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="text-neon-green hover:underline"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.cartId} className="flex gap-4 bg-bg-primary/50 p-4 rounded-xl border border-primary">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-bg-primary flex-shrink-0">
                      <img 
                        src={item.images[0]} 
                        alt={item.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium text-text-primary line-clamp-1">{item.name}</h3>
                          <button 
                            onClick={() => removeFromCart(item.cartId)}
                            className="text-text-secondary hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        {item.selectedSize && item.selectedSize !== 'Default' && (
                          <p className="text-sm text-text-secondary mt-1">Size: {item.selectedSize}</p>
                        )}
                        <p className="text-neon-green font-mono mt-1">BDT {item.price.toFixed(2)}</p>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-2">
                        <button 
                          onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                          className="w-6 h-6 rounded-full bg-bg-primary/20 flex items-center justify-center hover:bg-bg-primary/40 transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm font-mono w-4 text-center text-text-primary">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                          className="w-6 h-6 rounded-full bg-bg-primary/20 flex items-center justify-center hover:bg-bg-primary/40 transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t border-primary bg-bg-primary">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-text-secondary">Subtotal</span>
                  <span className="text-xl font-display font-bold text-text-primary">BDT {cartTotal.toFixed(2)}</span>
                </div>
                <Link
                  to="/checkout"
                  onClick={() => setIsCartOpen(false)}
                  className="block w-full py-4 bg-neon-green text-black font-bold text-center rounded-xl hover:bg-neon-green/90 transition-colors"
                >
                  Proceed to Checkout
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
