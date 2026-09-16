import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { WishlistProvider } from './context/WishlistContext'
import Navbar from './components/Navbar/Navbar'
import HomePage from './pages/HomePage/HomePage'
import ProductsPage from './pages/ProductsPage/ProductsPage'
import StoresPage from './pages/StoresPage/StoresPage'
import DealsPage from './pages/DealsPage/DealsPage'
import AboutPage from './pages/AboutPage/AboutPage'
import ProductPage from './pages/ProductPage/ProductPage'
import CartPage from './pages/CartPage/CartPage'
import CheckoutPage from './pages/CheckoutPage/CheckoutPage'
import OrderConfirmationPage from './pages/OrderConfirmationPage/OrderConfirmationPage'
import AccountPage from './pages/AccountPage/AccountPage'
import AdminPage from './pages/AdminPage/AdminPage'
import AdminOrdersPage from './pages/AdminOrdersPage/AdminOrdersPage'
import AdminOrderDetailPage from './pages/AdminOrderDetailPage/AdminOrderDetailPage'
import AdminProductsPage from './pages/AdminProductsPage/AdminProductsPage'
import AdminInventoryPage from './pages/AdminInventoryPage/AdminInventoryPage'
import WishlistPage from './pages/WishlistPage/WishlistPage'
import LoginPage from './pages/LoginPage/LoginPage'
import RegisterPage from './pages/RegisterPage/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage/ResetPasswordPage'
import Footer from './components/Footer/Footer'
import './App.css'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
        <WishlistProvider>
          <div className="app">
            <ScrollToTop />
            <Navbar />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/stores" element={<StoresPage />} />
              <Route path="/deals" element={<DealsPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/order/:id" element={<OrderConfirmationPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/orders" element={<AdminOrdersPage />} />
              <Route path="/admin/orders/:id" element={<AdminOrderDetailPage />} />
              <Route path="/admin/products" element={<AdminProductsPage />} />
              <Route path="/admin/inventory" element={<AdminInventoryPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Routes>
            <Footer />
          </div>
        </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </Router>
  )
}
