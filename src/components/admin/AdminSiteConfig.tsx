import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function AdminSiteConfig() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase.from('site_config').select('*');
        if (error) throw error;
        
        const configObj: Record<string, string> = {};
        if (data) {
          data.forEach((c: any) => {
            configObj[c.key] = c.value;
          });
        }
        setConfig(configObj);
      } catch (error) {
        console.error('Error fetching config:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleChange = (key: string, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upsert all config values
      const updates = Object.entries(config).map(([key, value]) => ({
        key,
        value
      }));
      
      const { error } = await supabase
        .from('site_config')
        .upsert(updates);
        
      if (error) throw error;
      alert('Configuration saved successfully!');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Site Configuration</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-neon-green text-black px-4 py-2 rounded-lg font-bold hover:bg-neon-green/90 disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Hero Section */}
      <section className="bg-card-bg p-6 rounded-2xl border border-white/5 space-y-4">
        <h3 className="text-xl font-bold text-neon-blue mb-4">Hero Section</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Hero Title</label>
          <input
            type="text"
            value={config.hero_title || ''}
            onChange={(e) => handleChange('hero_title', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-neon-blue"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Hero Subtitle</label>
          <textarea
            value={config.hero_subtitle || ''}
            onChange={(e) => handleChange('hero_subtitle', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-neon-blue h-24"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Hero Image URL</label>
          <div className="flex gap-4">
            <input
              type="text"
              value={config.hero_image || ''}
              onChange={(e) => handleChange('hero_image', e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-neon-blue"
            />
            <label className="bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl cursor-pointer transition-colors">
              Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  try {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Math.random()}.${fileExt}`;
                    const filePath = `hero/${fileName}`;
                    
                    const { error: uploadError } = await supabase.storage
                      .from('public')
                      .upload(filePath, file);
                      
                    if (uploadError) throw uploadError;
                    
                    const { data: { publicUrl } } = supabase.storage
                      .from('public')
                      .getPublicUrl(filePath);
                      
                    handleChange('hero_image', publicUrl);
                  } catch (error) {
                    console.error('Upload failed', error);
                    alert('Image upload failed. Make sure you have created a storage bucket named "public".');
                  }
                }}
              />
            </label>
          </div>
          {config.hero_image && (
            <img src={config.hero_image} alt="Hero Preview" className="mt-4 w-full h-48 object-cover rounded-xl border border-white/10" />
          )}
        </div>
      </section>

      {/* Footer Section */}
      <section className="bg-card-bg p-6 rounded-2xl border border-white/5 space-y-4">
        <h3 className="text-xl font-bold text-neon-pink mb-4">Footer Information</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">About Text</label>
          <textarea
            value={config.footer_about || ''}
            onChange={(e) => handleChange('footer_about', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-neon-pink h-24"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
            <input
              type="email"
              value={config.footer_email || ''}
              onChange={(e) => handleChange('footer_email', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-neon-pink"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Phone Number</label>
            <input
              type="text"
              value={config.footer_phone || ''}
              onChange={(e) => handleChange('footer_phone', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-neon-pink"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Address</label>
          <input
            type="text"
            value={config.footer_address || ''}
            onChange={(e) => handleChange('footer_address', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-neon-pink"
          />
        </div>
      </section>

      {/* Contact Floating Button */}
      <section className="bg-card-bg p-6 rounded-2xl border border-white/5 space-y-4">
        <h3 className="text-xl font-bold text-neon-green mb-4">Floating Contact Button</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">WhatsApp Link</label>
          <input
            type="text"
            value={config.contact_whatsapp || ''}
            onChange={(e) => handleChange('contact_whatsapp', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-neon-green"
            placeholder="https://wa.me/..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Phone Link</label>
          <input
            type="text"
            value={config.contact_phone || ''}
            onChange={(e) => handleChange('contact_phone', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-neon-green"
            placeholder="tel:+1..."
          />
        </div>
      </section>

      {/* Announcement Bar */}
      <section className="bg-card-bg p-6 rounded-2xl border border-white/5 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-neon-pink">Announcement Bar</h3>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={config.announcement_enabled === '1'}
              onChange={(e) => handleChange('announcement_enabled', e.target.checked ? '1' : '0')}
            />
            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-pink"></div>
            <span className="ml-3 text-sm font-medium text-gray-400">
              {config.announcement_enabled === '1' ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Announcement Text</label>
          <input
            type="text"
            value={config.announcement_text || ''}
            onChange={(e) => handleChange('announcement_text', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-neon-pink"
            placeholder="🚀 FREE SHIPPING ON ORDERS OVER BDT 5000!"
          />
        </div>
      </section>

      {/* Shipping Rates */}
      <section className="bg-card-bg p-6 rounded-2xl border border-white/5 space-y-4">
        <h3 className="text-xl font-bold text-neon-blue mb-4">Shipping Rates (BDT)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Inside Dhaka</label>
            <input
              type="number"
              value={config.shipping_dhaka || ''}
              onChange={(e) => handleChange('shipping_dhaka', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-neon-blue"
              placeholder="70"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Outside Dhaka</label>
            <input
              type="number"
              value={config.shipping_outside || ''}
              onChange={(e) => handleChange('shipping_outside', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-neon-blue"
              placeholder="130"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
