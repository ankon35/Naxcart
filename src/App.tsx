import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import CartDrawer from './components/CartDrawer';
import Home from './pages/Home';
import Shop from './pages/Shop';
import Trending from './pages/Trending';
import ProductDetails from './pages/ProductDetails';
import Checkout from './pages/Checkout';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import VirtualTryOn from './pages/VirtualTryOn';
import ScrollToTop from './components/ScrollToTop';
import FloatingContact from './components/FloatingContact';
import Footer from './components/Footer';

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="h-screen overflow-y-auto overflow-x-hidden relative">
      <div className="min-h-full bg-dark-bg text-primary font-sans selection:bg-neon-pink selection:text-white flex flex-col transition-colors duration-300">
        {!isAdminRoute && <Navbar />}
        {!isAdminRoute && <CartDrawer />}
        <div className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/trending" element={<Trending />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/try-on/:id" element={<VirtualTryOn />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Routes>
        </div>
        {!isAdminRoute && <FloatingContact />}
        {!isAdminRoute && <Footer />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <CartProvider>
        <Router>
          <ScrollToTop />
          <AppContent />
        </Router>
      </CartProvider>
    </ThemeProvider>
  );
}
