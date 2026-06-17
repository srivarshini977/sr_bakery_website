import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import FloatingCartAnim from './components/FloatingCartAnim';
import ScrollToTop from './components/ScrollToTop';

// Pages
import Home from './pages/Home';
import About from './pages/About';
import Menu from './pages/Menu';
import Offers from './pages/Offers';
import Gallery from './pages/Gallery';
import Contact from './pages/Contact';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import OrderTracking from './pages/OrderTracking';
import NotFound from './pages/NotFound';
import UserDashboard from './pages/UserDashboard';
import UserOrders from './pages/UserOrders';
import AdminImageUpload from './pages/AdminImageUpload';
import AdminDashboard from './pages/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard';

// Route Guards
const CustomerProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="h-screen bg-bakery-black flex items-center justify-center"><div className="w-12 h-12 border-4 border-bakery-red border-t-transparent rounded-full animate-spin"></div></div>;
  return user ? children : <Navigate to="/login" />;
};

const AdminProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="h-screen bg-bakery-black flex items-center justify-center"><div className="w-12 h-12 border-4 border-bakery-red border-t-transparent rounded-full animate-spin"></div></div>;
  return user && user.role === 'admin' ? children : <Navigate to="/" />;
};

const StaffProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="h-screen bg-bakery-black flex items-center justify-center"><div className="w-12 h-12 border-4 border-bakery-red border-t-transparent rounded-full animate-spin"></div></div>;
  return user && (user.role === 'staff' || user.role === 'admin') ? children : <Navigate to="/" />;
};

const AppContent = () => {
  const location = useLocation();
  const isAdminPanel = location.pathname.startsWith('/admin');

  return (
    <div className="flex min-h-screen flex-col bg-bakery-black text-white">
      <ScrollToTop />
      {!isAdminPanel && <Navbar />}
      {!isAdminPanel && <FloatingCartAnim />}

      <main className={`flex-grow ${isAdminPanel ? 'min-h-screen overflow-hidden' : 'pt-24'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/track" element={<OrderTracking />} />
          <Route path="/orders/:orderId" element={<OrderTracking />} />

          {/* Protected Routes */}
          <Route path="/checkout" element={
            <CustomerProtectedRoute>
              <Checkout />
            </CustomerProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <CustomerProtectedRoute>
              <UserDashboard />
            </CustomerProtectedRoute>
          } />
          <Route path="/dashboard/orders" element={
            <CustomerProtectedRoute>
              <UserOrders />
            </CustomerProtectedRoute>
          } />
          <Route path="/admin/images" element={
            <AdminProtectedRoute>
              <AdminImageUpload />
            </AdminProtectedRoute>
          } />
          <Route path="/admin" element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          } />
          <Route path="/staff" element={
            <StaffProtectedRoute>
              <StaffDashboard />
            </StaffProtectedRoute>
          } />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {!isAdminPanel && <Footer />}
      {!isAdminPanel && <WhatsAppButton />}
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
