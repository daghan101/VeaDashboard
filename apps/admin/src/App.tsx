import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import trTR from 'antd/locale/tr_TR';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OrdersPage from './pages/orders/OrdersPage';
import OrderDetailPage from './pages/orders/OrderDetailPage';
import CreateOrderPage from './pages/orders/CreateOrderPage';
import ProductsPage from './pages/products/ProductsPage';
import InventoryPage from './pages/inventory/InventoryPage';
import CustomersPage from './pages/customers/CustomersPage';
import CustomerDetailPage from './pages/customers/CustomerDetailPage';
import VendorsPage from './pages/vendors/VendorsPage';
import AccountsPage from './pages/finance/AccountsPage';
import TransactionsPage from './pages/finance/TransactionsPage';
import ShipmentsPage from './pages/shipments/ShipmentsPage';
import ShipmentDetailPage from './pages/shipments/ShipmentDetailPage';

export default function App() {
    return (
        <ConfigProvider
            locale={trTR}
            theme={{
                token: {
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    colorPrimary: '#6366f1',
                    borderRadius: 8,
                },
            }}
        >
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route
                            element={
                                <PrivateRoute>
                                    <AppLayout />
                                </PrivateRoute>
                            }
                        >
                            <Route path="/" element={<DashboardPage />} />
                            {/* Siparişler */}
                            <Route path="/orders" element={<OrdersPage />} />
                            <Route path="/orders/new" element={<CreateOrderPage />} />
                            <Route path="/orders/:id" element={<OrderDetailPage />} />
                            {/* Ürünler */}
                            <Route path="/products" element={<ProductsPage />} />
                            {/* Stok */}
                            <Route path="/inventory" element={<InventoryPage />} />
                            {/* Müşteriler */}
                            <Route path="/customers" element={<CustomersPage />} />
                            <Route path="/customers/:id" element={<CustomerDetailPage />} />
                            {/* Tedarikçiler */}
                            <Route path="/vendors" element={<VendorsPage />} />
                            {/* Finans */}
                            <Route path="/accounts" element={<AccountsPage />} />
                            <Route path="/transactions" element={<TransactionsPage />} />
                            {/* Sevkiyat */}
                            <Route path="/shipments" element={<ShipmentsPage />} />
                            <Route path="/shipments/:id" element={<ShipmentDetailPage />} />
                        </Route>
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </ConfigProvider>
    );
}
