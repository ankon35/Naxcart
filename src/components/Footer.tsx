import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, MessageCircle, Mail, Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Footer() {
  const [config, setConfig] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data: configData, error } = await supabase
          .from('site_config')
          .select('key, value');
        
        if (error) throw error;
        
        const configMap = (configData || []).reduce((acc, curr) => {
          acc[curr.key] = curr.value;
          return acc;
        }, {} as Record<string, string>);
        
        setConfig(configMap);
      } catch (error) {
        console.error('Error fetching footer config:', error);
      }
    };
    fetchConfig();
  }, []);

  return (
    <footer className="py-8 px-4 border-t border-primary text-center bg-bg-primary">
      <div className="flex flex-col items-center justify-center gap-4 mb-4">
        <img src="/logo.png" alt="Naxcart" className="h-12 w-auto" referrerPolicy="no-referrer" />
        
        {config.footer_about && (
          <p className="text-text-secondary text-sm max-w-md mx-auto mb-2">
            {config.footer_about}
          </p>
        )}
        
        <div className="flex flex-col items-center gap-2 text-text-secondary text-sm">
          {config.footer_phone && (
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-neon-green" />
              <a href={`tel:${config.footer_phone}`} className="hover:text-text-primary transition-colors">
                {config.footer_phone}
              </a>
            </div>
          )}
          {config.footer_email && (
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-neon-green" />
              <a href={`mailto:${config.footer_email}`} className="hover:text-text-primary transition-colors">
                {config.footer_email}
              </a>
            </div>
          )}
          {config.footer_address && (
            <div className="text-text-secondary opacity-70 text-xs mt-1">
              {config.footer_address}
            </div>
          )}
        </div>

        <div className="flex items-center gap-6 mt-2">
          <a 
            href="https://www.facebook.com/profile.php?id=61583580908423" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full bg-card-bg flex items-center justify-center text-text-secondary hover:bg-neon-blue hover:text-black transition-all duration-300 hover:-translate-y-1"
            aria-label="Facebook"
          >
            <Facebook size={20} />
          </a>
          <a 
            href="https://instagram.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full bg-card-bg flex items-center justify-center text-text-secondary hover:bg-neon-pink hover:text-white transition-all duration-300 hover:-translate-y-1"
            aria-label="Instagram"
          >
            <Instagram size={20} />
          </a>
          {config.contact_whatsapp && (
            <a 
              href={config.contact_whatsapp} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-card-bg flex items-center justify-center text-text-secondary hover:bg-[#25D366] hover:text-white transition-all duration-300 hover:-translate-y-1"
              aria-label="WhatsApp"
            >
              <MessageCircle size={20} />
            </a>
          )}
        </div>
      </div>

      <div className="text-text-secondary text-sm border-t border-primary pt-4">
        © 2026 naxcart.shop. All rights reserved.
      </div>
    </footer>
  );
}
