import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price: number | null;
  category_id: string | null;
  is_featured: boolean;
  try_now_enabled: boolean;
  product_images?: { image_url: string; display_order: number }[];
  product_variants?: { id: string; size: string; stock_quantity: number }[];
}

export interface CartItem extends Product {
  cartId: string;
  selectedSize?: string;
  variant_id?: string;
  quantity: number;
  images: string[];
  sizes: string[];
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, selectedSize?: string, openDrawer?: boolean) => void;
  removeFromCart: (cartId: string) => void;
  updateQuantity: (cartId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load cart from local storage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('naxcart_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse cart', e);
      }
    }
  }, []);

  // Save cart to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem('naxcart_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Product, selectedSize?: string, openDrawer: boolean = true) => {
    const images = product.product_images?.map(img => img.image_url) || [];
    const sizes = product.product_variants?.map(v => v.size) || [];
    const variant = product.product_variants?.find(v => v.size === selectedSize);
    
    setCart(prev => {
      const existingItem = prev.find(item => item.id === product.id && item.selectedSize === selectedSize);
      if (existingItem) {
        return prev.map(item => 
          item.cartId === existingItem.cartId 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { 
        ...product, 
        cartId: `${product.id}-${selectedSize || 'default'}-${Date.now()}`,
        selectedSize, 
        variant_id: variant?.id,
        quantity: 1,
        images,
        sizes
      }];
    });
    if (openDrawer) {
      setIsCartOpen(true);
    }
  };

  const removeFromCart = (cartId: string) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };

  const updateQuantity = (cartId: string, quantity: number) => {
    if (quantity < 1) return;
    setCart(prev => prev.map(item => 
      item.cartId === cartId ? { ...item, quantity } : item
    ));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider value={{ 
      cart, addToCart, removeFromCart, updateQuantity, clearCart, 
      cartTotal, cartCount, isCartOpen, setIsCartOpen 
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
