import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import LoginRoute from './components/LoginRoute';
import GuestRoute from './components/GuestRoute';
import AdminLayout from './components/AdminLayout';

import Home from './pages/shop/Home';
import ProductDetail from './pages/shop/ProductDetail';
import Cart from './pages/shop/Cart';
import Checkout from './pages/shop/Checkout';
import Orders from './pages/shop/Orders';
import Register from './pages/auth/Register';

import Dashboard from './pages/admin/Dashboard';
import Purchases from './pages/admin/Purchases';
import Sales from './pages/admin/Sales';
import Stock from './pages/admin/Stock';
import Reports from './pages/admin/Reports';
import Products from './pages/admin/Products';
import AdminOrders from './pages/admin/AdminOrders';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginRoute />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route
              path="/register"
              element={
                <GuestRoute>
                  <Register />
                </GuestRoute>
              }
            />
            <Route
              path="/shop"
              element={
                <ProtectedRoute roles={['customer']}>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/product/:id"
              element={
                <ProtectedRoute roles={['customer']}>
                  <ProductDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cart"
              element={
                <ProtectedRoute roles={['customer']}>
                  <Cart />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute roles={['customer']}>
                  <Checkout />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/:id?"
              element={
                <ProtectedRoute roles={['customer']}>
                  <Orders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="purchases" element={<Purchases />} />
              <Route path="sales" element={<Sales />} />
              <Route path="stock" element={<Stock />} />
              <Route path="reports" element={<Reports />} />
              <Route path="products" element={<Products />} />
              <Route path="orders" element={<AdminOrders />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
