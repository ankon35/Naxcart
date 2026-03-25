import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link, useSearchParams } from 'react-router-dom';
import { Product, useCart } from '../context/CartContext';
import { ArrowRight, Star, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

type SortOption = 'newest' | 'price-low' | 'price-high' | 'popular';

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart } = useCart();

  const currentCategory = searchParams.get('category') || 'All';
  const isFeatured = searchParams.get('featured') === 'true';
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [isSortOpen, setIsSortOpen] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch categories
        const { data: catData, error: catError } = await supabase
          .from('categories')
          .select('id, name')
          .order('name');
        
        if (catError) throw catError;
        setCategories(catData || []);

        // Fetch products
        let query = supabase
          .from('products')
          .select(`
            *,
            categories (name),
            product_images (image_url, display_order),
            product_variants (id, size, stock_quantity)
          `);

        if (currentCategory !== 'All') {
          const category = catData?.find(c => c.name === currentCategory);
          if (category) {
            query = query.eq('category_id', category.id);
          }
        }

        if (isFeatured) {
          query = query.eq('is_featured', true);
        }

        const { data: prodData, error: prodError } = await query;
        if (prodError) throw prodError;

        // Sort images so primary is first
        const formattedProducts = (prodData || []).map(p => ({
          ...p,
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
  }, [currentCategory, isFeatured]);

  const sortedProducts = [...products].sort((a, b) => {
    switch (sortBy) {
      case 'price-low': return a.price - b.price;
      case 'price-high': return b.price - a.price;
      case 'popular': return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
      default: return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(); // Newest
    }
  });

  const handleCategoryClick = (cat: string) => {
    if (cat === 'All') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', cat);
    }
    searchParams.delete('featured');
    setSearchParams(searchParams);
  };

  return (
    <div className="min-h-screen pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 mb-8">
          <h1 className="text-2xl md:text-4xl font-display font-bold mb-4 text-text-primary">Shop</h1>
        </div>

      {/* Categories Filter & Sort */}
      <section className="mb-12 px-4 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleCategoryClick('All')}
              className={`px-5 py-2 rounded-full whitespace-nowrap font-medium transition-all text-sm ${
                currentCategory === 'All' 
                  ? 'bg-neon-green text-black shadow-[0_0_15px_rgba(204,255,0,0.4)]' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.name)}
                className={`px-5 py-2 rounded-full whitespace-nowrap font-medium transition-all text-sm ${
                  currentCategory === cat.name 
                    ? 'bg-neon-green text-black shadow-[0_0_15px_rgba(204,255,0,0.4)]' 
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="relative">
            <button 
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors"
            >
              <SlidersHorizontal size={16} />
              Sort by: {sortBy === 'newest' ? 'Newest' : sortBy === 'price-low' ? 'Price: Low to High' : sortBy === 'price-high' ? 'Price: High to Low' : 'Popularity'}
              <ChevronDown size={14} className={`transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSortOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-card-bg border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                {[
                  { value: 'newest', label: 'Newest' },
                  { value: 'popular', label: 'Popularity' },
                  { value: 'price-low', label: 'Price: Low to High' },
                  { value: 'price-high', label: 'Price: High to Low' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortBy(option.value as SortOption);
                      setIsSortOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition-colors ${sortBy === option.value ? 'text-neon-green' : 'text-gray-400'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

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
            {sortedProducts.map((product) => {
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
                    {product.is_featured && (
                      <div className="absolute top-3 right-3 bg-neon-blue text-black text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                        <Star size={10} fill="black" /> Trending
                      </div>
                    )}
                    
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
