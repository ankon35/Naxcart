import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Settings, HelpCircle, LogOut, Menu, X, CheckCircle, Tag, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import AdminOverview from '../components/admin/AdminOverview';
import AdminProducts from '../components/admin/AdminProducts';
import AdminSiteConfig from '../components/admin/AdminSiteConfig';
import AdminFAQs from '../components/admin/AdminFAQs';
import AdminCategories from '../components/admin/AdminCategories';
import AdminOrders from '../components/admin/AdminOrders';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.loginSuccess) {
      setShowSuccess(true);
      // Clear state so refresh doesn't show it again
      window.history.replaceState({}, document.title);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  }, [location]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/admin');
          return;
        }

        // Verify admin role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profile?.role === 'admin') {
          setIsAuthenticated(true);
        } else {
          await supabase.auth.signOut();
          navigate('/admin');
        }
      } catch (error) {
        navigate('/admin');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setIsAuthenticated(false);
        navigate('/admin');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      navigate('/admin');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  if (loading) return <div className="min-h-screen bg-dark-bg flex items-center justify-center text-white">Loading...</div>;
  if (!isAuthenticated) return null; // Or redirecting...

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <AdminOverview />;
      case 'orders': return <AdminOrders />;
      case 'products': return <AdminProducts />;
      case 'categories': return <AdminCategories />;
      case 'config': return <AdminSiteConfig />;
      case 'faqs': return <AdminFAQs />;
      default: return <AdminOverview />;
    }
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'config', label: 'Site Config', icon: Settings },
    { id: 'faqs', label: 'FAQs', icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-dark-bg flex">
      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 bg-neon-green text-black px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 font-bold"
          >
            <CheckCircle size={20} />
            Login Successful!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 z-50 bg-card-bg border-b border-white/10 px-4 flex items-center gap-4">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 -ml-2 rounded-lg text-white hover:bg-white/5 transition-colors"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="text-xl font-display font-bold text-white">
          GEN<span className="text-neon-green">Z</span> Admin
        </h1>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed top-16 bottom-0 left-0 z-40 w-64 bg-card-bg border-r border-white/10 transform transition-transform duration-300 ease-in-out
        md:top-0 md:static md:h-screen md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          <div className="hidden md:block p-6 border-b border-white/10">
            <h1 className="text-2xl font-display font-bold text-white">
              GEN<span className="text-neon-green">Z</span> Admin
            </h1>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  activeTab === item.id
                    ? 'bg-neon-blue/10 text-neon-blue font-bold'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto p-4 pt-20 md:p-8 md:pt-8">
        {renderContent()}
      </main>
    </div>
  );
}
