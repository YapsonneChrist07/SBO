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
import AdminPromotionsPage from './pages/AdminPromotionsPage/AdminPromotionsPage'
import AdminCategoriesPage from './pages/AdminCategoriesPage/AdminCategoriesPage'
import AdminCustomersPage from './pages/AdminCustomersPage/AdminCustomersPage'
import AdminCustomerDetailPage from './pages/AdminCustomerDetailPage/AdminCustomerDetailPage'
import AdminPartnersPage from './pages/AdminPartnersPage/AdminPartnersPage'
import AdminPurchasesPage from './pages/AdminPurchasesPage/AdminPurchasesPage'
import AdminNewPurchasePage from './pages/AdminNewPurchasePage/AdminNewPurchasePage'
import AdminPurchaseDetailPage from './pages/AdminPurchaseDetailPage/AdminPurchaseDetailPage'
import SupplierProductsPage from './pages/SupplierProductsPage/SupplierProductsPage'
import SupplierProductDetailPage from './pages/SupplierProductDetailPage/SupplierProductDetailPage'
import SupplierOrdersPage from './pages/SupplierOrdersPage/SupplierOrdersPage'
import SupplierOrderDetailPage from './pages/SupplierOrderDetailPage/SupplierOrderDetailPage'
import SupplierReviewsPage from './pages/SupplierReviewsPage/SupplierReviewsPage'
import TransporterDeliveriesPage from './pages/TransporterDeliveriesPage/TransporterDeliveriesPage'
import TransporterDeliveryDetailPage from './pages/TransporterDeliveryDetailPage/TransporterDeliveryDetailPage'
import TransporterPickupsPage from './pages/TransporterPickupsPage/TransporterPickupsPage'
import TransporterPickupDetailPage from './pages/TransporterPickupDetailPage/TransporterPickupDetailPage'
import TransporterTariffsPage from './pages/TransporterTariffsPage/TransporterTariffsPage'
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
              <Route path="/admin/promotions" element={<AdminPromotionsPage />} />
              <Route path="/admin/categories" element={<AdminCategoriesPage />} />
              <Route path="/admin/customers" element={<AdminCustomersPage />} />
              <Route path="/admin/customers/:id" element={<AdminCustomerDetailPage />} />
              <Route path="/admin/partners" element={<AdminPartnersPage />} />
              <Route path="/admin/purchases" element={<AdminPurchasesPage />} />
              <Route path="/admin/purchases/new" element={<AdminNewPurchasePage />} />
              <Route path="/admin/purchases/:id" element={<AdminPurchaseDetailPage />} />
              <Route path="/supplier/products" element={<SupplierProductsPage />} />
              <Route path="/supplier/products/:id" element={<SupplierProductDetailPage />} />
              <Route path="/supplier/orders" element={<SupplierOrdersPage />} />
              <Route path="/supplier/orders/:id" element={<SupplierOrderDetailPage />} />
              <Route path="/supplier/reviews" element={<SupplierReviewsPage />} />
              <Route path="/transporter/deliveries" element={<TransporterDeliveriesPage />} />
              <Route path="/transporter/deliveries/:sellID" element={<TransporterDeliveryDetailPage />} />
              <Route path="/transporter/pickups" element={<TransporterPickupsPage />} />
              <Route path="/transporter/pickups/:id" element={<TransporterPickupDetailPage />} />
              <Route path="/transporter/tariffs" element={<TransporterTariffsPage />} />
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
