import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
        
      if (error) throw error;
      if (data) setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    try {
      const slug = newCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      
      const { error } = await supabase
        .from('categories')
        .insert([{ name: newCategory, slug }]);

      if (error) throw error;

      setSuccess('Category added successfully');
      setNewCategory('');
      fetchCategories();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.message || 'Failed to add category');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSuccess('Category deleted successfully');
      fetchCategories();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.message || 'Failed to delete category');
      setTimeout(() => setError(''), 3000);
    }
  };

  if (loading) return <div className="text-text-primary">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-text-primary">Categories</h2>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/50 text-green-500 p-4 rounded-xl flex items-center gap-2">
          <AlertCircle size={20} />
          {success}
        </div>
      )}

      <div className="bg-card-bg border border-primary rounded-2xl p-6 shadow-xl">
        <form onSubmit={handleAddCategory} className="flex gap-4 mb-8">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="New Category Name"
            className="flex-1 bg-bg-primary/50 border border-primary rounded-xl px-4 py-2 text-text-primary focus:outline-none focus:border-neon-blue"
          />
          <button
            type="submit"
            className="bg-neon-blue text-black font-bold px-6 py-2 rounded-xl hover:bg-neon-blue/90 transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(0,243,255,0.3)]"
          >
            <Plus size={20} />
            Add
          </button>
        </form>

        <div className="space-y-2">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between bg-bg-primary/30 p-4 rounded-xl border border-primary/50 hover:border-primary transition-colors"
            >
              <span className="text-text-primary font-medium">{category.name}</span>
              <button
                onClick={() => handleDeleteCategory(category.id)}
                className="text-red-400 hover:text-red-300 p-2 hover:bg-red-400/10 rounded-lg transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
          
          {categories.length === 0 && (
            <div className="text-center text-text-secondary py-8">
              No categories found. Add one above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
