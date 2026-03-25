import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash, X, Save, Image } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  cost_price?: number;
  category_id: string;
  categories?: { name: string };
  product_images: { image_url: string }[];
  product_variants: { size: string, stock_quantity: number }[];
  is_featured: boolean;
  try_now_enabled: boolean;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    original_price: '',
    cost_price: '',
    category_id: '',
    images: '', // Comma separated URLs
    sizes: '', // Comma separated sizes
    stock: '', // Total stock or default stock
    is_featured: false,
    try_now_enabled: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase
          .from('products')
          .select(`
            *,
            categories (name),
            product_images (image_url),
            product_variants (size, stock_quantity)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('id, name').order('name')
      ]);

      if (productsRes.error) throw productsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setProducts(productsRes.data as any);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price?.toString() || '',
      original_price: product.original_price ? product.original_price.toString() : '',
      cost_price: product.cost_price ? product.cost_price.toString() : '',
      category_id: product.category_id || '',
      images: (product.product_images || []).map(img => img.image_url).join(', '),
      sizes: (product.product_variants || []).map(v => v.size).join(', '),
      stock: (product.product_variants || []).reduce((acc, v) => acc + (v.stock_quantity || 0), 0).toString(),
      is_featured: !!product.is_featured,
      try_now_enabled: !!product.try_now_enabled
    });
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      original_price: '',
      cost_price: '',
      category_id: categories.length > 0 ? categories[0].id : '',
      images: '',
      sizes: '',
      stock: '',
      is_featured: false,
      try_now_enabled: false
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category_id) {
      alert('Please select a category');
      return;
    }

    const productPayload = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      original_price: formData.original_price ? parseFloat(formData.original_price) : null,
      cost_price: formData.cost_price ? parseFloat(formData.cost_price) : 0,
      category_id: formData.category_id,
      is_featured: formData.is_featured,
      try_now_enabled: formData.try_now_enabled,
      updated_at: new Date().toISOString()
    };

    try {
      let productId = editingProduct?.id;

      if (editingProduct) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update(productPayload)
          .eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        // Insert new product
        const { data, error } = await supabase
          .from('products')
          .insert(productPayload)
          .select()
          .single();
        if (error) throw error;
        productId = data.id;
      }

      if (!productId) throw new Error('Product ID not found');

      // Handle Images
      const imageUrls = formData.images.split(',').map(s => s.trim()).filter(Boolean);
      
      // Delete existing images
      if (editingProduct) {
        await supabase.from('product_images').delete().eq('product_id', productId);
      }
      
      // Insert new images
      if (imageUrls.length > 0) {
        const imagePayloads = imageUrls.map((url, index) => ({
          product_id: productId,
          image_url: url,
          display_order: index
        }));
        await supabase.from('product_images').insert(imagePayloads);
      }

      // Handle Variants (Sizes & Stock)
      const sizes = formData.sizes.split(',').map(s => s.trim()).filter(Boolean);
      const totalStock = parseInt(formData.stock) || 0;
      
      // Delete existing variants
      if (editingProduct) {
        await supabase.from('product_variants').delete().eq('product_id', productId);
      }

      // Insert new variants
      if (sizes.length > 0) {
        const stockPerSize = Math.floor(totalStock / sizes.length);
        const variantPayloads = sizes.map(size => ({
          product_id: productId,
          size: size,
          stock_quantity: stockPerSize
        }));
        await supabase.from('product_variants').insert(variantPayloads);
      } else {
        // If no sizes, create a default variant to hold stock
        await supabase.from('product_variants').insert({
          product_id: productId,
          size: 'Default',
          stock_quantity: totalStock
        });
      }

      await fetchData();
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error saving product:', error);
      alert(`Error saving product: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  if (loading) return <div className="text-text-primary">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-text-primary">Manage Products</h2>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-neon-green text-black px-4 py-2 rounded-lg font-bold hover:bg-neon-green/90 shadow-[0_0_15px_rgba(204,255,0,0.3)]"
        >
          <Plus size={18} /> Add Product
        </button>
      </div>

      <div className="overflow-x-auto bg-card-bg border border-primary rounded-2xl shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-primary text-text-secondary text-sm bg-bg-primary/50">
              <th className="py-3 px-4">Image</th>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Price</th>
              <th className="py-3 px-4">Stock</th>
              <th className="py-3 px-4">Featured</th>
              <th className="py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const images = product.product_images || [];
              const totalStock = (product.product_variants || []).reduce((acc, v) => acc + (v.stock_quantity || 0), 0);
              return (
                <tr key={product.id} className="border-b border-primary/50 hover:bg-bg-primary/30 transition-colors">
                  <td className="py-3 px-4">
                    {images.length > 0 ? (
                      <img src={images[0].image_url} alt={product.name} className="w-12 h-12 rounded-lg object-cover bg-bg-primary" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-bg-primary flex items-center justify-center text-text-secondary">
                        <Image size={20} />
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-medium text-text-primary">{product.name}</td>
                  <td className="py-3 px-4 text-text-secondary">{product.categories?.name || 'Uncategorized'}</td>
                  <td className="py-3 px-4 text-neon-green font-mono">BDT {product.price?.toFixed(2)}</td>
                  <td className="py-3 px-4 text-text-secondary font-mono text-xs">
                    <div>Total: {totalStock}</div>
                    <div className="text-gray-500">Cost: BDT {product.cost_price?.toFixed(2) || '0.00'}</div>
                  </td>
                  <td className="py-3 px-4">
                    {product.is_featured && <span className="bg-neon-blue/20 text-neon-blue px-2 py-1 rounded text-xs font-bold">Featured</span>}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(product)} className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-primary/50 rounded-lg">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg">
                        <Trash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card-bg w-full max-w-2xl rounded-2xl border border-primary shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-primary flex justify-between items-center bg-bg-primary">
              <h3 className="text-xl font-bold text-text-primary">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-text-primary">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-bg-primary/50 border border-primary rounded-xl p-3 text-text-primary focus:outline-none focus:border-neon-blue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Category</label>
                  <select
                    required
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full bg-bg-primary/50 border border-primary rounded-xl p-3 text-text-primary focus:outline-none focus:border-neon-blue appearance-none"
                  >
                    <option value="" disabled>Select a category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-bg-primary/50 border border-primary rounded-xl p-3 text-text-primary focus:outline-none focus:border-neon-blue h-24"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Price (BDT)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full bg-bg-primary/50 border border-primary rounded-xl p-3 text-text-primary focus:outline-none focus:border-neon-green"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Original Price (Optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.original_price}
                    onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                    className="w-full bg-bg-primary/50 border border-primary rounded-xl p-3 text-text-primary focus:outline-none focus:border-neon-pink"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Total Stock</label>
                  <input
                    type="number"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full bg-bg-primary/50 border border-primary rounded-xl p-3 text-text-primary focus:outline-none focus:border-neon-blue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Cost Price (Buying Price)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    className="w-full bg-bg-primary/50 border border-primary rounded-xl p-3 text-text-primary focus:outline-none focus:border-neon-pink"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Image URLs (comma separated)</label>
                <div className="space-y-4">
                  <textarea
                    value={formData.images}
                    onChange={(e) => setFormData({ ...formData, images: e.target.value })}
                    className="w-full bg-bg-primary/50 border border-primary rounded-xl p-3 text-text-primary focus:outline-none focus:border-neon-blue h-20 font-mono text-sm"
                    placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                  />
                  
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 bg-bg-primary/50 hover:bg-bg-primary border border-primary text-text-primary px-4 py-2 rounded-xl cursor-pointer transition-colors">
                      <Image size={18} />
                      Upload Images
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (!files || files.length === 0) return;
                          
                          const newUrls: string[] = [];
                          
                          for (let i = 0; i < files.length; i++) {
                            const file = files[i];
                            try {
                              const fileExt = file.name.split('.').pop();
                              const fileName = `${Math.random()}.${fileExt}`;
                              const filePath = `products/${fileName}`;
                              
                              const { error: uploadError } = await supabase.storage
                                .from('public')
                                .upload(filePath, file);
                                
                              if (uploadError) throw uploadError;
                              
                              const { data: { publicUrl } } = supabase.storage
                                .from('public')
                                .getPublicUrl(filePath);
                                
                              newUrls.push(publicUrl);
                            } catch (error) {
                              console.error('Upload failed', error);
                              alert('Image upload failed. Make sure you have created a storage bucket named "public".');
                            }
                          }
                          
                          if (newUrls.length > 0) {
                            const currentImages = formData.images ? formData.images.split(',').map(s => s.trim()).filter(Boolean) : [];
                            setFormData({
                              ...formData,
                              images: [...currentImages, ...newUrls].join(', ')
                            });
                          }
                        }}
                      />
                    </label>
                    <span className="text-xs text-text-secondary">Supported: JPG, PNG, WEBP</span>
                  </div>

                  {/* Image Previews */}
                  {formData.images && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.images.split(',').map(s => s.trim()).filter(Boolean).map((url, idx) => (
                        <div key={idx} className="relative group w-20 h-20">
                          <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover rounded-lg border border-primary" />
                          <button
                            type="button"
                            onClick={() => {
                              const currentImages = formData.images.split(',').map(s => s.trim()).filter(Boolean);
                              const newImages = currentImages.filter((_, i) => i !== idx);
                              setFormData({ ...formData, images: newImages.join(', ') });
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Sizes (comma separated)</label>
                <input
                  type="text"
                  value={formData.sizes}
                  onChange={(e) => setFormData({ ...formData, sizes: e.target.value })}
                  className="w-full bg-bg-primary/50 border border-primary rounded-xl p-3 text-text-primary focus:outline-none focus:border-neon-blue"
                  placeholder="S, M, L, XL"
                />
              </div>

              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="w-5 h-5 rounded bg-bg-primary/50 border-primary text-neon-green focus:ring-neon-green"
                  />
                  <span className="text-text-primary font-medium">Featured (Trending)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.try_now_enabled}
                    onChange={(e) => setFormData({ ...formData, try_now_enabled: e.target.checked })}
                    className="w-5 h-5 rounded bg-bg-primary/50 border-primary text-neon-blue focus:ring-neon-blue"
                  />
                  <span className="text-text-primary font-medium">Enable Virtual Try-On</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-primary mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-primary/50 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-neon-green text-black font-bold hover:bg-neon-green/90 transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(204,255,0,0.3)]"
                >
                  <Save size={18} /> Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
