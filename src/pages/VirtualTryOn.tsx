import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Upload, Sparkles, Loader2 } from 'lucide-react';
import { Product } from '../context/CartContext';
import { GoogleGenAI } from "@google/genai";
import { supabase } from '../lib/supabase';

export default function VirtualTryOn() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  });

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            categories (name),
            product_images (image_url, display_order),
            product_variants (id, size, stock_quantity)
          `)
          .eq('id', id)
          .single();
          
        if (error || !data) throw new Error('Product not found');
        
        const formattedProduct = {
          ...data,
          category: data.categories?.name,
          product_images: data.product_images?.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
        } as Product;
        
        setProduct(formattedProduct);
      } catch (error) {
        console.error(error);
        navigate('/shop');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, navigate]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateClick = () => {
    if (!userImage) return;
    setShowModal(true);
  };

  const [phoneError, setPhoneError] = useState('');

  const validatePhone = (phone: string) => {
    // Validates Bangladeshi phone numbers:
    // +8801xxxxxxxxx (14 digits)
    // 8801xxxxxxxxx (13 digits)
    // 01xxxxxxxxx (11 digits)
    const regex = /^(?:\+88|88)?(01[3-9]\d{8})$/;
    return regex.test(phone);
  };

  const optimizeImage = async (base64Str: string, maxWidth = 1024): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width *= maxWidth / height;
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = base64Str;
    });
  };

  const handleConfirmGenerate = async () => {
    if (!product || !userImage || !formData.name || !formData.phone) return;

    if (!validatePhone(formData.phone)) {
      setPhoneError('Please enter a valid Bangladeshi phone number (e.g., 017xxxxxxxx)');
      return;
    }
    
    setShowModal(false);
    setGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      
      const productImages = product.product_images?.map(img => img.image_url) || [];
      // Always use the 2nd image if available, otherwise fallback to the 1st
      let productImageData = productImages.length > 1 ? productImages[1] : productImages[0];
      let productMimeType = 'image/jpeg';

      // Handle product image (URL or Base64)
      if (productImageData && productImageData.startsWith('http')) {
        try {
          const response = await fetch(productImageData);
          const blob = await response.blob();
          productMimeType = blob.type;
          const reader = new FileReader();
          productImageData = await new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.error('Failed to fetch product image:', e);
          throw new Error('Could not load product image for processing.');
        }
      }

      if (!productImageData) {
          throw new Error('No product image available.');
      }

      // Optimize images before sending to AI
      const optimizedProductImage = await optimizeImage(productImageData);
      const optimizedUserImage = await optimizeImage(userImage);

      const productImageBase64 = optimizedProductImage.split(',')[1];
      const userImageBase64 = optimizedUserImage.split(',')[1];
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: productImageBase64
              }
            },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: userImageBase64
              }
            },
            {
              text: `TASK: Virtual Try-On.
              Input 1: Product image ("${product.name}").
              Input 2: User image.
              
              Generate a photorealistic image of the user from Input 2 wearing the clothing item from Input 1. 
              Maintain the user's face, pose, and background exactly. 
              The clothing must fit naturally and match the lighting.`
            }
          ]
        }
      });

      console.log('AI Response:', response);

      // Extract image from response
      let generatedImage = null;
      let responseText = '';

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            generatedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          } else if (part.text) {
            responseText += part.text;
          }
        }
      }
      
      if (generatedImage) {
        setResultImage(generatedImage);
      } else {
        console.error('No image in response. Text response:', responseText);
        const errorMessage = responseText || 'The AI was unable to generate a try-on image for this specific combination. This can happen due to safety filters or image complexity.';
        alert(errorMessage);
      }

    } catch (error) {
      console.error('Generation failed:', error);
      alert('Failed to generate try-on image. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-green"></div>
      </div>
    );
  }

  if (!product) return null;

  const productImages = product.product_images?.map(img => img.image_url) || [];

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 relative">
      <div className="max-w-6xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={20} /> Back to Product
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column: Product & User Input */}
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">Virtual Try-On</h1>
              <p className="text-gray-400 text-sm md:text-base">See how this item looks on you with our AI technology.</p>
            </div>

            {/* Product Preview */}
            <div className="bg-card-bg p-4 rounded-2xl border border-white/10 flex gap-4 items-center">
              {productImages.length > 0 ? (
                <img 
                  src={productImages.length > 1 ? productImages[1] : productImages[0]} 
                  alt={product.name} 
                  className="w-24 h-24 object-cover rounded-lg"
                />
              ) : (
                <div className="w-24 h-24 bg-dark-bg rounded-lg flex items-center justify-center text-text-secondary text-xs">No image</div>
              )}
              <div>
                <h3 className="font-bold text-base md:text-lg">{product.name}</h3>
                <p className="text-neon-green font-mono text-sm md:text-base">BDT {product.price.toFixed(2)}</p>
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Upload Your Photo</label>
              <div className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:border-neon-blue/50 transition-colors relative group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                {userImage ? (
                  <div className="relative h-64 w-full">
                    <img 
                      src={userImage} 
                      alt="Uploaded" 
                      className="w-full h-full object-contain rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                      <span className="text-white font-bold">Click to change</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-neon-blue">
                      <Upload size={32} />
                    </div>
                    <div>
                      <p className="font-medium text-lg">Click to upload image</p>
                      <p className="text-sm text-gray-500 mt-1">JPG, PNG up to 5MB</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleGenerateClick}
              disabled={!userImage || generating}
              className="w-full py-4 bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 size={20} className="animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Sparkles size={20} /> Generate Try-On
                </>
              )}
            </button>
          </div>

          {/* Right Column: Result */}
          <div className="bg-white/5 rounded-3xl border border-white/10 p-8 flex flex-col items-center justify-center min-h-[500px]">
            {resultImage ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full h-full"
              >
                <img 
                  src={resultImage} 
                  alt="Virtual Try-On Result" 
                  className="w-full h-full object-contain rounded-xl shadow-2xl"
                />
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-sm font-bold text-neon-green border border-neon-green/30">
                  AI Generated
                </div>
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = resultImage;
                    link.download = `try-on-${product.name}.png`;
                    link.click();
                  }}
                  className="mt-6 w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Download Image
                </button>
              </motion.div>
            ) : (
              <div className="text-center text-gray-500 max-w-sm">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-600">
                  <Sparkles size={40} />
                </div>
                <h3 className="text-xl font-bold text-gray-300 mb-2">Ready to Transform?</h3>
                <p>Upload your photo and fill in your details to see the magic happen.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-dark-bg border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-xl md:text-2xl font-bold mb-4">Almost There!</h2>
            <p className="text-gray-400 text-sm md:text-base mb-6">Please provide your details to start the generation process.</p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Your Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-neon-blue transition-colors"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({...formData, phone: e.target.value});
                    setPhoneError('');
                  }}
                  className={`w-full bg-white/5 border rounded-lg px-4 py-3 focus:outline-none transition-colors ${
                    phoneError ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-neon-blue'
                  }`}
                  placeholder="Enter your phone number (e.g. 017...)"
                />
                {phoneError && (
                  <p className="text-red-500 text-xs mt-1">{phoneError}</p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmGenerate}
                disabled={!formData.name || !formData.phone}
                className="flex-1 py-3 bg-neon-blue text-black font-bold rounded-xl hover:bg-neon-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Generation
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
