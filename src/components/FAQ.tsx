import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const { data, error } = await supabase
          .from('faqs')
          .select('*')
          .order('display_order', { ascending: true });
          
        if (error) throw error;
        setFaqs(data || []);
      } catch (error) {
        console.error('Error fetching FAQs:', error);
      }
    };
    fetchFaqs();
  }, []);

  return (
    <section id="faq" className="py-32 px-4 max-w-4xl mx-auto scroll-mt-24">
      <div className="text-center mb-20">
        <span className="text-neon-blue text-[10px] font-bold tracking-[0.4em] uppercase mb-4 block">Support Center</span>
        <h2 className="text-3xl md:text-6xl font-display font-bold uppercase tracking-tighter">
          Got <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-pink">Questions?</span>
        </h2>
      </div>
      
      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div 
            key={faq.id} 
            className={`group rounded-2xl overflow-hidden border transition-all duration-500 ${
              openIndex === index 
                ? 'bg-white/5 border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.02)]' 
                : 'bg-transparent border-white/5 hover:border-white/10'
            }`}
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full flex items-center justify-between p-6 md:p-8 text-left focus:outline-none"
            >
              <span className={`font-bold text-lg md:text-2xl tracking-tight transition-all duration-500 ${openIndex === index ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`}>
                {faq.question}
              </span>
              <div className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-500 ${openIndex === index ? 'border-neon-blue bg-neon-blue text-black rotate-180' : 'border-white/10 text-gray-500'}`}>
                <ChevronDown size={20} />
              </div>
            </button>
            <AnimatePresence>
              {openIndex === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.04, 0.62, 0.23, 0.98] }}
                >
                  <div className="px-8 pb-8 text-gray-400 text-lg leading-relaxed max-w-2xl">
                    {faq.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
}
