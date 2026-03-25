import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Product, useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, ArrowLeft, Check, Eye, Sparkles, ChevronLeft, ChevronRight, ShieldCheck, Truck, RotateCcw, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [config, setConfig] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchProductAndConfig = async () => {
      try {
        setLoading(true);
        // Fetch config
        const { data: configData, error: configError } = await supabase
          .from('site_config')
          .select('key, value');
        
        if (!configError && configData) {
          const configMap = configData.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
          }, {} as Record<string, string>);
          setConfig(configMap);
        }

        // Fetch product
        const { data: prodData, error: prodError } = await supabase
          .from('products')
          .select(`
            *,
            categories (name),
            product_images (image_url, display_order),
            product_variants (id, size, stock_quantity)
          `)
          .eq('id', id)
          .single();
        
        if (prodError || !prodData) throw new Error('Product not found');
        
        const formattedProduct = {
          ...prodData,
          category: prodData.categories?.name,
          product_images: prodData.product_images?.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
        } as Product;

        setProduct(formattedProduct);
        
        const sizes = formattedProduct.product_variants?.map(v => v.size) || [];
        if (sizes.length > 0) setSelectedSize(sizes[0]);

        // Fetch related products
        if (prodData.category_id) {
          const { data: relatedData, error: relatedError } = await supabase
            .from('products')
            .select(`
              *,
              categories (name),
              product_images (image_url, display_order),
              product_variants (id, size, stock_quantity)
            `)
            .eq('category_id', prodData.category_id)
            .neq('id', prodData.id)
            .limit(4);
            
          if (!relatedError && relatedData) {
            const formattedRelated = relatedData.map(p => ({
              ...p,
              category: p.categories?.name,
              product_images: p.product_images?.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
            }));
            setRelatedProducts(formattedRelated as Product[]);
          }
        }
      } catch (error) {
        console.error(error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchProductAndConfig();
  }, [id, navigate]);

  if (loading || !product) return <div className="min-h-screen pt-20 flex items-center justify-center">Loading...</div>;

  const images = product.product_images?.map(img => img.image_url) || [];
  const sizes = product.product_variants?.map(v => v.size) || [];
  const totalStock = product.product_variants?.reduce((sum, v) => sum + v.stock_quantity, 0) || 0;
  
  const discount = product.original_price 
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100) 
    : 0;

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft size={20} /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square sm:aspect-[4/5] w-full max-w-sm mx-auto rounded-2xl overflow-hidden bg-card-bg border border-white/5 group">
            <AnimatePresence mode="wait">
              {images.length > 0 ? (
                <motion.img
                  key={selectedImage}
                  src={images[selectedImage]}
                  alt={product.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                  className="absolute w-full h-full object-cover"
                />
              ) : (
                <div className="absolute w-full h-full flex items-center justify-center text-text-secondary bg-dark-bg">No image</div>
              )}
            </AnimatePresence>

            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button 
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 z-10"
                  onClick={() => setSelectedImage((prev) => (prev - 1 + images.length) % images.length)}
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 z-10"
                  onClick={() => setSelectedImage((prev) => (prev + 1) % images.length)}
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails Grid */}
          {images.length > 1 && (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-w-sm mx-auto">
              {images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                    selectedImage === idx 
                      ? 'border-neon-green ring-2 ring-neon-green/20' 
                      : 'border-transparent opacity-40 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-neon-blue text-sm font-bold tracking-wider uppercase">{(product as any).category || 'Uncategorized'}</span>
              {totalStock > 0 ? (
                <span className="text-green-400 text-xs bg-green-400/10 px-2 py-1 rounded-full">In Stock</span>
              ) : (
                <span className="text-red-400 text-xs bg-red-400/10 px-2 py-1 rounded-full">Out of Stock</span>
              )}
            </div>
            <h1 className="text-2xl md:text-5xl font-display font-bold text-white mb-4">{product.name}</h1>
            <div className="flex items-end gap-4">
              <span className="text-2xl md:text-3xl font-mono text-neon-green font-bold">BDT {product.price.toFixed(2)}</span>
              {product.original_price && (
                <span className="text-lg md:text-xl text-gray-500 line-through mb-1">BDT {product.original_price.toFixed(2)}</span>
              )}
              {discount > 0 && (
                <span className="bg-neon-pink text-white px-2 py-1 rounded-md text-sm font-bold mb-1">-{discount}%</span>
              )}
            </div>
          </div>

          <div className="mb-8">
            <p className={`text-gray-300 leading-relaxed text-base md:text-lg ${!isExpanded ? 'line-clamp-3' : ''}`}>
              {product.description}
            </p>
            {product.description && product.description.length > 150 && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-neon-blue text-sm font-bold mt-2 hover:underline transition-all"
              >
                {isExpanded ? 'Read Less' : 'Read More'}
              </button>
            )}
          </div>

          {sizes.length > 0 && !sizes.includes('One Size') && !sizes.includes('Default') && (
            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Select Size</h3>
              <div className="flex flex-wrap gap-3">
                {sizes.map((size: string) => {
                  const variant = product.product_variants?.find(v => v.size === size);
                  const isOutOfStock = !variant || variant.stock_quantity <= 0;
                  return (
                    <button
                      key={size}
                      onClick={() => !isOutOfStock && setSelectedSize(size)}
                      disabled={isOutOfStock}
                      className={`w-12 h-12 rounded-lg flex items-center justify-center font-medium transition-all ${
                        selectedSize === size 
                          ? 'bg-white text-black' 
                          : isOutOfStock
                            ? 'bg-white/5 text-gray-600 cursor-not-allowed line-through'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-row gap-4 mt-auto">
            <button
              onClick={() => addToCart(product, selectedSize)}
              disabled={totalStock === 0}
              className="flex-1 py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              <ShoppingBag size={20} />
              {totalStock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
            
            <button
              onClick={() => {
                // Pass product directly to checkout via state
                const buyNowItem = {
                  ...product,
                  cartId: `${product.id}-${selectedSize || 'default'}-${Date.now()}`,
                  selectedSize,
                  variant_id: product.product_variants?.find(v => v.size === selectedSize)?.id,
                  quantity: 1,
                  images,
                  sizes
                };
                navigate('/checkout', { state: { buyNowItem } });
              }}
              disabled={totalStock === 0}
              className="flex-1 py-4 bg-neon-green text-black font-bold rounded-xl hover:bg-neon-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              Buy Now
            </button>
          </div>
          
          {/* Virtual Try-On Button */}
          {product.try_now_enabled && (
            <button
              onClick={() => navigate(`/try-on/${product.id}`)}
              className="w-full mt-4 py-4 bg-transparent border border-neon-blue text-neon-blue font-bold rounded-xl hover:bg-neon-blue/10 transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles size={20} /> Virtual Try-On (Beta)
            </button>
          )}

          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-white/5">
            <div className="flex flex-col items-center text-center gap-2">
              <ShieldCheck className="text-neon-blue w-6 h-6" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Secure Checkout</span>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <Truck className="text-neon-green w-6 h-6" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fast Delivery</span>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <Award className="text-neon-pink w-6 h-6" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quality Guaranteed</span>
            </div>
          </div>

          {/* WhatsApp Button */}
          {config.contact_whatsapp && (
            <button
              onClick={() => {
                const message = encodeURIComponent(`Hi, I'm interested in ${product.name} (BDT ${product.price.toFixed(2)}). Can you help me?`);
                const baseUrl = config.contact_whatsapp;
                const separator = baseUrl.includes('?') ? '&' : '?';
                window.open(`${baseUrl}${separator}text=${message}`, '_blank');
              }}
              className="w-full mt-4 py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg 
                viewBox="0 0 24 24" 
                width="20" 
                height="20" 
                fill="currentColor"
                className="mr-1"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              Whatsapp
            </button>
          )}


        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-24">
          <h2 className="text-xl md:text-2xl font-display font-bold mb-8">You Might Also Like</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            {relatedProducts.map((related) => {
              const relatedImages = related.product_images?.map(img => img.image_url) || [];
              const relatedDiscount = related.original_price 
                ? Math.round(((related.original_price - related.price) / related.original_price) * 100) 
                : 0;

              return (
                <motion.div
                  key={related.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -10 }}
                  className="group bg-card-bg rounded-2xl overflow-hidden border border-white/5 hover:border-white/20 transition-all duration-300"
                >
                  <div 
                    onClick={() => {
                      navigate(`/product/${related.id}`);
                      const scrollContainer = document.querySelector('.h-screen.overflow-y-auto');
                      if (scrollContainer) {
                        scrollContainer.scrollTo(0, 0);
                      } else {
                        window.scrollTo(0, 0);
                      }
                    }}
                    className="block relative aspect-[4/5] overflow-hidden cursor-pointer"
                  >
                    {relatedImages.length > 0 ? (
                      <img 
                        src={relatedImages[0]} 
                        alt={related.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-dark-bg flex items-center justify-center text-text-secondary">No image</div>
                    )}
                    {relatedDiscount > 0 && (
                      <div className="absolute top-3 left-3 bg-neon-pink text-white text-xs font-bold px-2 py-1 rounded-md">
                        -{relatedDiscount}%
                      </div>
                    )}
                    
                    {/* Quick Add Overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/90 to-transparent">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(related);
                        }}
                        className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                      >
                        <ShoppingBag size={16} /> Add
                      </button>
                    </div>
                  </div>

                  <div className="p-4">
                    <div 
                      onClick={() => {
                        navigate(`/product/${related.id}`);
                        const scrollContainer = document.querySelector('.h-screen.overflow-y-auto');
                        if (scrollContainer) {
                          scrollContainer.scrollTo(0, 0);
                        } else {
                          window.scrollTo(0, 0);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <h3 className="font-display font-bold text-base md:text-lg text-white mb-1 truncate">{related.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-neon-green font-mono font-bold text-sm md:text-base">BDT {related.price.toFixed(2)}</span>
                      {related.original_price && (
                        <span className="text-gray-500 text-xs md:text-sm line-through">BDT {related.original_price.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
