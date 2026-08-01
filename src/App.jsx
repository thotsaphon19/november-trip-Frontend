import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/authContext";
import { ThemeProvider } from "./lib/themeContext";
import { UndoProvider } from "./lib/undoContext";
import RequireAuth from "./components/RequireAuth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import HotelSuppliers from "./pages/HotelSuppliers";
import HotelDetailPage from "./pages/HotelDetailPage";
import TourSuppliers from "./pages/TourSuppliers";
import TourSupplierDetailPage from "./pages/TourSupplierDetailPage";
import Products from "./pages/Products";
import ProductDetailPage from "./pages/ProductDetailPage";
import Quotations from "./pages/Quotations";
import QuotationDetailPage from "./pages/QuotationDetailPage";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <UndoProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <RequireAuth>
                  <Layout />
                </RequireAuth>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/quotations" element={<Quotations />} />
              <Route path="/quotations/:id" element={<QuotationDetailPage />} />
              <Route path="/suppliers/hotels" element={<HotelSuppliers />} />
              <Route path="/suppliers/hotels/:id" element={<HotelDetailPage />} />
              <Route path="/suppliers/tours" element={<TourSuppliers />} />
              <Route path="/suppliers/tours/:id" element={<TourSupplierDetailPage />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
          </UndoProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
