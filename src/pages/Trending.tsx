import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Product, useCart } from '../context/CartContext';
import { ArrowRight, Star, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Trending() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch only featured/trending products
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            categories (name),
            product_images (image_url, display_order),
            product_variants (id, size, stock_quantity)
          `)
          .eq('is_featured', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        const formattedProducts = data.map(p => ({
          ...p,
          category: p.categories?.name,
          product_images: p.product_images?.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
        }));
        
        setProducts(formattedProducts as Product[]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-12">
       <div className="max-w-7xl mx-auto px-4 mb-8 flex items-center gap-3">
         <TrendingUp className="text-neon-pink w-6 h-6 md:w-8 md:h-8" />
         <h1 className="text-2xl md:text-4xl font-display font-bold text-text-primary">Trending Now</h1>
       </div>

      {/* Product Grid */}
      <section className="px-4 pb-24 max-w-7xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-card-bg rounded-2xl h-64 sm:h-96 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-8">
            {products.map((product) => {
              const images = product.product_images?.map(img => img.image_url) || [];
              const discount = product.original_price 
                ? Math.round(((product.original_price - product.price) / product.original_price) * 100) 
                : 0;

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -10 }}
                  className="group bg-card-bg rounded-2xl overflow-hidden border border-border-primary hover:border-neon-blue/30 transition-all duration-300"
                >
                  <Link to={`/product/${product.id}`} className="block relative aspect-[4/5] overflow-hidden">
                    {images.length > 0 ? (
                      <img 
                        src={images[0]} 
                        alt={product.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-dark-bg flex items-center justify-center text-text-secondary">No image</div>
                    )}
                    {discount > 0 && (
                      <div className="absolute top-3 left-3 bg-neon-pink text-white text-xs font-bold px-2 py-1 rounded-md">
                        -{discount}%
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-neon-blue text-black text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                      <Star size={10} fill="black" /> Trending
                    </div>
                    
                    {/* Quick Add Overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/90 to-transparent">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          addToCart(product);
                        }}
                        className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                      >
                        Add to Cart <ArrowRight size={16} />
                      </button>
                    </div>
                  </Link>

                  <div className="p-4">
                    <Link to={`/product/${product.id}`}>
                      <h3 className="font-display font-bold text-base md:text-lg text-text-primary mb-1 truncate">{product.name}</h3>
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className="text-neon-green font-mono font-bold text-sm md:text-base">BDT {product.price.toFixed(2)}</span>
                      {product.original_price && (
                        <span className="text-text-secondary text-xs md:text-sm line-through">BDT {product.original_price.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
