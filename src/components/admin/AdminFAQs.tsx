import { useState, useEffect } from 'react';
import { Plus, Trash, Edit, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  display_order: number;
}

export default function AdminFAQs() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ question: '', answer: '' });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    try {
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .order('display_order', { ascending: true });
        
      if (error) throw error;
      if (data) setFaqs(data);
    } catch (error) {
      console.error('Error fetching FAQs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (faq: FAQ) => {
    setEditingId(faq.id);
    setEditForm({ question: faq.question, answer: faq.answer });
    setIsAdding(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setEditForm({ question: '', answer: '' });
  };

  const handleSave = async (id?: string) => {
    try {
      if (id) {
        const { error } = await supabase
          .from('faqs')
          .update(editForm)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('faqs')
          .insert([{ ...editForm, display_order: faqs.length }]);
        if (error) throw error;
      }
      
      await fetchFaqs();
      handleCancel();
    } catch (error) {
      console.error('Error saving FAQ:', error);
      alert('Failed to save FAQ');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this FAQ?')) return;
    
    try {
      const { error } = await supabase
        .from('faqs')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchFaqs();
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      alert('Failed to delete FAQ');
    }
  };

  if (loading) return <div className="text-text-primary">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-text-primary">Manage FAQs</h2>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
            setEditForm({ question: '', answer: '' });
          }}
          className="flex items-center gap-2 bg-neon-blue text-black px-4 py-2 rounded-lg font-bold hover:bg-neon-blue/90 shadow-[0_0_15px_rgba(0,243,255,0.3)]"
        >
          <Plus size={18} /> Add FAQ
        </button>
      </div>

      <div className="grid gap-4">
        {isAdding && (
          <div className="bg-card-bg p-6 rounded-2xl border border-neon-blue/50 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-neon-blue">New FAQ</h3>
            <input
              type="text"
              placeholder="Question"
              value={editForm.question}
              onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
              className="w-full bg-bg-primary/50 border border-primary rounded-xl p-3 text-text-primary focus:outline-none focus:border-neon-blue"
            />
            <textarea
              placeholder="Answer"
              value={editForm.answer}
              onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
              className="w-full bg-bg-primary/50 border border-primary rounded-xl p-3 text-text-primary focus:outline-none focus:border-neon-blue h-24"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={handleCancel} className="px-4 py-2 text-text-secondary hover:text-text-primary">Cancel</button>
              <button onClick={() => handleSave()} className="bg-neon-blue text-black px-4 py-2 rounded-lg font-bold shadow-[0_0_15px_rgba(0,243,255,0.3)]">Save</button>
            </div>
          </div>
        )}

        {faqs.map((faq) => (
          <div key={faq.id} className="bg-card-bg p-6 rounded-2xl border border-primary/50 group hover:border-primary transition-colors shadow-lg">
            {editingId === faq.id ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={editForm.question}
                  onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                  className="w-full bg-bg-primary/50 border border-primary rounded-xl p-3 text-text-primary focus:outline-none focus:border-neon-blue"
                />
                <textarea
                  value={editForm.answer}
                  onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
                  className="w-full bg-bg-primary/50 border border-primary rounded-xl p-3 text-text-primary focus:outline-none focus:border-neon-blue h-24"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={handleCancel} className="px-4 py-2 text-text-secondary hover:text-text-primary">Cancel</button>
                  <button onClick={() => handleSave(faq.id)} className="bg-neon-green text-black px-4 py-2 rounded-lg font-bold shadow-[0_0_15px_rgba(204,255,0,0.3)]">Save</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-lg font-bold text-text-primary mb-2">{faq.question}</h3>
                  <p className="text-text-secondary">{faq.answer}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(faq)} className="p-2 text-neon-blue hover:bg-bg-primary/50 rounded-lg">
                    <Edit size={18} />
                  </button>
                  <button onClick={() => handleDelete(faq.id)} className="p-2 text-red-500 hover:bg-bg-primary/50 rounded-lg">
                    <Trash size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
