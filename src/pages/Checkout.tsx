import { useState, FormEvent, useEffect } from 'react';
import { useCart, CartItem } from '../context/CartContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Minus, Plus, Trash2, ArrowLeft, CheckCircle, MapPin, ShieldCheck, Truck, RotateCcw, Lock, Award } from 'lucide-react';
import AddressMap from '../components/AddressMap';
import { supabase } from '../lib/supabase';

export default function Checkout() {
  const { cart, cartTotal, clearCart, updateQuantity, removeFromCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // State for Buy Now item
  const [buyNowItem, setBuyNowItem] = useState<CartItem | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    postalCode: '',
  });

  const [config, setConfig] = useState<Record<string, string>>({});
  const [isDhakaLocation, setIsDhakaLocation] = useState<boolean | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase.from('site_config').select('key, value');
        if (!error && data) {
          const configMap = data.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
          }, {} as Record<string, string>);
          setConfig(configMap);
        }
      } catch (error) {
        console.error('Error fetching config:', error);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (location.state?.buyNowItem) {
      setBuyNowItem(location.state.buyNowItem);
    }
  }, [location.state]);

  // Determine which items to display and calculate total
  const checkoutItems = buyNowItem ? [buyNowItem] : cart;
  const subtotal = buyNowItem 
    ? buyNowItem.price * buyNowItem.quantity 
    : cartTotal;

  // Calculate shipping cost based on postal code and address
  const hasAddress = formData.address.length >= 5;
  const hasPostalCode = formData.postalCode.length >= 4;
  
  // Logic: If postal code starts with '12' (Dhaka City), it's 70, otherwise 130.
  // If no postal code, fallback to map/string detection.
  let isDhaka = false;
  if (hasPostalCode) {
    isDhaka = formData.postalCode.startsWith('12');
  } else {
    const addressLower = formData.address.toLowerCase();
    const isDhakaString = addressLower.includes('dhaka') && 
                          !addressLower.includes('savar') &&
                          !addressLower.includes('gazipur') &&
                          !addressLower.includes('keraniganj') &&
                          !addressLower.includes('narayanganj') &&
                          !addressLower.includes('dhamrai') &&
                          !addressLower.includes('nawabganj');
    isDhaka = isDhakaLocation !== null ? isDhakaLocation : isDhakaString;
  }
  
  const dhakaRate = Number(config.shipping_dhaka) || 70;
  const outsideRate = Number(config.shipping_outside) || 130;
  
  const shippingCost = (!hasAddress && !hasPostalCode) ? 0 : (isDhaka ? dhakaRate : outsideRate);
  const total = subtotal + shippingCost;

  // Handle quantity update for Buy Now item
  const handleUpdateQuantity = (cartId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    if (buyNowItem && buyNowItem.cartId === cartId) {
      setBuyNowItem({ ...buyNowItem, quantity: newQuantity });
    } else {
      updateQuantity(cartId, newQuantity);
    }
  };

  // Handle remove for Buy Now item (redirects to shop/home if empty)
  const handleRemoveItem = (cartId: string) => {
    if (buyNowItem && buyNowItem.cartId === cartId) {
      setBuyNowItem(null);
      navigate('/'); // Or back to product
    } else {
      removeFromCart(cartId);
    }
  };

  if (checkoutItems.length === 0 && !success) {
    return (
      <div className="min-h-screen pt-24 flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
        <button 
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-white text-black rounded-full font-bold"
        >
          Go Shopping
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: userId || null,
          total_amount: total,
          delivery_charge: shippingCost,
          payment_method: 'cod',
          status: 'pending',
          payment_status: 'pending',
          shipping_address: {
            customer_name: formData.name,
            customer_phone: formData.phone,
            address: formData.address,
            postal_code: formData.postalCode
          }
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = checkoutItems.map(item => ({
        order_id: orderData.id,
        product_id: item.id,
        variant_id: item.variant_id || null, // Ensure variant_id is passed if available
        quantity: item.quantity,
        unit_price: item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      setSuccess(true);
      if (!buyNowItem) {
        clearCart();
      }
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen pt-24 flex flex-col items-center justify-center text-center px-4">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6"
        >
          <CheckCircle size={48} className="text-white" />
        </motion.div>
        <h1 className="text-2xl md:text-4xl font-display font-bold mb-4">Order Confirmed!</h1>
        <p className="text-gray-400 mb-8 max-w-md">
          Thank you for your purchase. Your order has been placed successfully.
        </p>
        <button 
          onClick={() => navigate('/')}
          className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft size={20} /> Back
      </button>

      <h1 className="text-2xl md:text-3xl font-display font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          <form id="checkout-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-card-bg p-6 rounded-2xl border border-white/5">
              <h2 className="text-lg md:text-xl font-bold mb-4">Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Full Name</label>
                  <input
                    required
                    type="text"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-neon-green transition-colors"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Phone</label>
                  <input
                    required
                    type="tel"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-neon-green transition-colors"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Postal Code</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. 1209"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-neon-green transition-colors"
                    value={formData.postalCode}
                    onChange={e => setFormData({...formData, postalCode: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="bg-card-bg p-6 rounded-2xl border border-white/5">
              <h2 className="text-lg md:text-xl font-bold mb-4">Shipping Address</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Address</label>
                  <textarea
                    required
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-neon-green transition-colors"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    placeholder="Enter your full address (e.g., House 12, Road 5, Dhanmondi, Dhaka)"
                  />
                </div>
                
                {/* Real-time Map View */}
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2 text-sm text-gray-400">
                    <MapPin size={16} className="text-neon-green" />
                    <span>Map Preview (Click map to pin location)</span>
                  </div>
                  <AddressMap 
                    address={formData.address} 
                    onAddressSelect={(newAddress) => setFormData({...formData, address: newAddress})}
                    onLocationFound={(isDhaka) => setIsDhakaLocation(isDhaka)}
                  />
                </div>
              </div>
            </div>

            <div className="bg-card-bg p-6 rounded-2xl border border-white/5">
              <h2 className="text-lg md:text-xl font-bold mb-4">Payment Method</h2>
              <div className="p-4 rounded-xl border border-neon-green bg-neon-green/10 flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border-4 border-neon-green bg-white"></div>
                <span className="font-medium">Cash on Delivery</span>
              </div>
              <p className="mt-2 text-sm text-gray-400 ml-8">
                Pay with cash upon delivery.
              </p>
            </div>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-card-bg p-6 rounded-2xl border border-white/5 sticky top-24">
            <h2 className="text-lg md:text-xl font-bold mb-4">Order Summary</h2>
            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto pr-2">
              {checkoutItems.map((item) => (
                <div key={item.cartId} className="flex gap-3 bg-white/5 p-3 rounded-lg">
                  <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-800 flex-shrink-0">
                    {item.images && item.images.length > 0 ? (
                      <img src={item.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-dark-bg flex items-center justify-center text-xs text-text-secondary">No image</div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-medium line-clamp-1">{item.name}</h4>
                        {item.selectedSize && item.selectedSize !== 'Default' && <p className="text-xs text-gray-400">Size: {item.selectedSize}</p>}
                      </div>
                      <button 
                        onClick={() => handleRemoveItem(item.cartId)}
                        className="text-gray-500 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center gap-2 bg-black/20 rounded-lg p-1">
                        <button 
                          onClick={() => handleUpdateQuantity(item.cartId, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center bg-white/10 rounded hover:bg-white/20 text-white disabled:opacity-50"
                          disabled={item.quantity <= 1}
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-sm font-mono w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => handleUpdateQuantity(item.cartId, item.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center bg-white/10 rounded hover:bg-white/20 text-white"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <p className="text-sm font-mono font-bold text-neon-green">BDT {(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="space-y-2 border-t border-white/10 pt-4">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>BDT {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Shipping {isDhaka ? '(inside dhaka)' : '(outside dhaka)'}</span>
                <span>{(hasAddress || hasPostalCode) ? `BDT ${shippingCost.toFixed(2)}` : '----'}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-lg pt-2">
                <span>Total</span>
                <span>BDT {total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pay Button (Placed here to be after summary on mobile, but col-span-2 on desktop to align with form) */}
        <div className="lg:col-span-2">
          <button
            type="submit"
            form="checkout-form"
            disabled={loading}
            className="w-full py-4 bg-neon-green text-black font-bold text-lg rounded-xl hover:bg-neon-green/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Place order'}
          </button>

          {/* Trust Badges */}
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center text-center p-3 bg-white/5 rounded-xl border border-white/10">
              <ShieldCheck className="text-neon-green mb-2" size={20} />
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Secure Checkout</span>
            </div>
            <div className="flex flex-col items-center text-center p-3 bg-white/5 rounded-xl border border-white/10">
              <Truck className="text-neon-blue mb-2" size={20} />
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Fast Delivery</span>
            </div>
            <div className="flex flex-col items-center text-center p-3 bg-white/5 rounded-xl border border-white/10">
              <Award className="text-neon-pink mb-2" size={20} />
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Quality Guaranteed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
