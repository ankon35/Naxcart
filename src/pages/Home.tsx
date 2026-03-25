import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, ShieldCheck, Zap, Truck, Headphones, Award } from 'lucide-react';
import { Product } from '../context/CartContext';
import FAQ from '../components/FAQ';
import { supabase } from '../lib/supabase';

export default function Home() {
  const navigate = useNavigate();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch config
        const { data: configData, error: configError } = await supabase
          .from('site_config')
          .select('key, value');
        
        if (configError) throw configError;
        
        const configMap = (configData || []).reduce((acc, curr) => {
          acc[curr.key] = curr.value;
          return acc;
        }, {} as Record<string, string>);
        
        setConfig(configMap);

        // Fetch products
        const { data: prodData, error: prodError } = await supabase
          .from('products')
          .select(`
            *,
            categories (name),
            product_images (image_url, display_order),
            product_variants (id, size, stock_quantity)
          `)
          .order('created_at', { ascending: false });

        if (prodError) throw prodError;

        const formattedProducts = (prodData || []).map(p => ({
          ...p,
          category: p.categories?.name,
          product_images: p.product_images?.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
        }));

        setProducts(formattedProducts as Product[]);
        
        // Extract categories
        const cats = Array.from(new Set(formattedProducts.map(p => p.category).filter(Boolean)));
        setCategories(['All', ...cats]);
      } catch (error) {
        console.error('Error fetching home data:', error);
      }
    };
    fetchData();
  }, []);

  const filteredProducts = activeCategory === 'All' 
    ? products 
    : products.filter(p => (p as any).category === activeCategory);

  // Limit to 8 products for the home page view
  const displayProducts = filteredProducts.slice(0, 8);

  return (
    <div className="min-h-screen pt-20">
      {/* Announcement Bar */}
      {config.announcement_enabled === '1' && (
        <div className="px-4 mb-8 -mt-2">
          <div className="max-w-fit mx-auto bg-white/5 border border-white/10 text-white py-2 px-8 rounded-full text-[11px] font-bold tracking-[0.1em] uppercase backdrop-blur-md flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.02)]">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-green shadow-[0_0_8px_rgba(204,255,0,0.8)] animate-pulse" />
            <span className="opacity-90">{config.announcement_text}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-neon-green shadow-[0_0_8px_rgba(204,255,0,0.8)] animate-pulse" />
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden rounded-3xl mx-4 mt-4">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-dark-bg z-10" />
          {config.hero_image && (
            <img 
              src={config.hero_image} 
              alt="Hero" 
              className="w-full h-full object-cover opacity-50"
            />
          )}
        </div>
        
        <div className="relative z-20 text-center px-4 max-w-4xl mx-auto">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl md:text-7xl font-display font-bold mb-6 leading-tight"
          >
            {config.hero_title}
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto"
          >
            {config.hero_subtitle}
          </motion.p>
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <button 
              onClick={() => navigate('/shop')}
              className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-white/90 transition-colors"
            >
              Shop Now
            </button>
            <button 
              onClick={() => navigate('/trending')}
              className="px-8 py-4 bg-transparent border border-white text-white font-bold rounded-full hover:bg-white/10 transition-colors"
            >
              View Trending
            </button>
          </motion.div>
        </div>
      </section>

      {/* Trending Now Section */}
      <section className="py-20 px-4 max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center gap-6 mb-12 text-center">
          <div className="flex items-center gap-3">
            <TrendingUp className="text-neon-pink w-6 h-6 md:w-8 md:h-8" />
            <h2 className="text-2xl md:text-4xl font-display font-bold">Trending Now</h2>
          </div>
          
          {/* Category Tabs */}
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2 rounded-full whitespace-nowrap font-bold text-sm transition-all ${
                  activeCategory === cat 
                    ? 'bg-neon-green text-black shadow-[0_0_15px_rgba(204,255,0,0.4)]' 
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <motion.div 
          layout
          className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6"
        >
          {displayProducts.map((product) => {
            const images = product.product_images?.map(img => img.image_url) || [];
            return (
              <Link key={product.id} to={`/product/${product.id}`} className="group block">
                <div className="aspect-[4/5] rounded-xl overflow-hidden mb-3 border border-white/10 bg-card-bg relative">
                  {images.length > 0 ? (
                    <img 
                      src={images[0]} 
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-dark-bg flex items-center justify-center text-text-secondary">No image</div>
                  )}
                  {product.is_featured && (
                    <div className="absolute top-2 right-2 bg-neon-blue text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                      HOT
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-white text-sm sm:text-base truncate group-hover:text-neon-blue transition-colors">{product.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-neon-green font-mono text-sm sm:text-base">BDT {product.price.toFixed(2)}</span>
                  {product.original_price && (
                    <span className="text-gray-500 text-xs line-through">BDT {product.original_price.toFixed(2)}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </motion.div>
        
        <div className="mt-12 text-center">
           <Link 
             to="/shop"
             className="inline-flex items-center gap-2 text-white border-b border-neon-green pb-1 hover:text-neon-green transition-colors"
           >
             View All Products <ArrowRight size={16} />
           </Link>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 px-4 bg-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-neon-blue to-transparent opacity-20" />
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-4xl font-display font-bold text-white mb-4">WHY CHOOSE <span className="text-neon-blue">NAXCART</span>?</h2>
            <p className="text-gray-400 text-sm md:text-base max-w-2xl mx-auto">We don't just sell products; we deliver the future. Experience the next generation of e-commerce.</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            {[
              { icon: <Zap className="text-neon-green" />, title: 'FAST DELIVERY', desc: 'Get your futuristic gear in record time with our lightning-fast shipping.' },
              { icon: <ShieldCheck className="text-neon-blue" />, title: 'SECURE CHECKOUT', desc: 'Shop with total peace of mind. We use bank-level encryption for all transactions.' },
              { icon: <Award className="text-neon-pink" />, title: 'QUALITY GUARANTEED', desc: 'Every product is hand-picked and tested to meet our high standards of excellence.' },
              { icon: <Headphones className="text-neon-green" />, title: '24/7 SUPPORT', desc: 'Our team of cyber-experts is always here to help you with any questions.' }
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-card-bg/50 p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/5 hover:border-white/20 transition-all text-center group"
              >
                <div className="w-10 h-10 sm:w-16 sm:h-16 bg-white/5 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 mx-auto group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-sm sm:text-xl font-bold text-white mb-2 sm:mb-3">{feature.title}</h3>
                <p className="text-gray-400 text-[10px] sm:text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQ />
    </div>
  );
}
