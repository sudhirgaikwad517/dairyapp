import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

import Orders from './pages/Orders';
import DispatchSheet from './pages/DispatchSheet';
import DeliveryZones from './pages/DeliveryZones';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import AddEditCustomer from './pages/AddEditCustomer';
import AddEditProduct from './pages/AddEditProduct';
import ViewProduct from './pages/ViewProduct';
import AddEditCategory from './pages/AddEditCategory';
import ProductSubCategories from './pages/ProductSubCategories';
import AddEditSubCategory from './pages/AddEditSubCategory';
import Leads from './pages/Leads';
import Subscriptions from './pages/Subscriptions';
import AppBanners from './pages/AppBanners';
import AddEditBanner from './pages/AddEditBanner';
import ViewBanner from './pages/ViewBanner';
import CutOffTime from './pages/CutOffTime';
import StaffTypes from './pages/StaffTypes';
import AddEditStaffType from './pages/AddEditStaffType';
import OfficeStaff from './pages/OfficeStaff';
import AddEditOfficeStaff from './pages/AddEditOfficeStaff';
import ViewOfficeStaff from './pages/ViewOfficeStaff';
import DeliveryModes from './pages/DeliveryModes';
import AddEditDeliveryMode from './pages/AddEditDeliveryMode';
import DeliveryCharges from './pages/DeliveryCharges';
import AddEditDeliveryCharge from './pages/AddEditDeliveryCharge';
import EmailTermsConditions from './pages/EmailTermsConditions';
import CancelReasons from './pages/CancelReasons';
import AddEditCancelReason from './pages/AddEditCancelReason';
import Hubs from './pages/Hubs';
import AddEditHub from './pages/AddEditHub';
import DeliveryAreas from './pages/DeliveryAreas';
import AddEditDeliveryArea from './pages/AddEditDeliveryArea';
import SubAreas from './pages/SubAreas';
import AddEditSubArea from './pages/AddEditSubArea';
import Apartments from './pages/Apartments';
import AddEditApartment from './pages/AddEditApartment';
import DeliveryRoutes from './pages/DeliveryRoutes';
import AddEditDeliveryRoute from './pages/AddEditDeliveryRoute';
import DeliveryBoys from './pages/DeliveryBoys';
import AddEditDeliveryBoy from './pages/AddEditDeliveryBoy';
import ViewDeliveryBoy from './pages/ViewDeliveryBoy';
import CustomerSequencing from './pages/CustomerSequencing';
import RouteWiseCustomers from './pages/RouteWiseCustomers';
import MarkDailyDelivery from './pages/MarkDailyDelivery';
import MarkCustomerLocation from './pages/MarkCustomerLocation';
import DeliveryRouteMap from './pages/DeliveryRouteMap';

// Simple auth guard
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('admin_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter basename="/admin">
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="dispatch" element={<DispatchSheet />} />
          <Route path="zones" element={<DeliveryZones />} />
          <Route path="products" element={<Products />} />
          <Route path="products/new" element={<AddEditProduct />} />
          <Route path="products/:id/view" element={<ViewProduct />} />
          <Route path="products/:id" element={<AddEditProduct />} />
          <Route path="categories" element={<Categories />} />
          <Route path="categories/new" element={<AddEditCategory />} />
          <Route path="categories/:id" element={<AddEditCategory />} />
          <Route path="product-sub-categories" element={<ProductSubCategories />} />
          <Route path="product-sub-categories/new" element={<AddEditSubCategory />} />
          <Route path="product-sub-categories/:id" element={<AddEditSubCategory />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/new" element={<AddEditCustomer />} />
          <Route path="customers/:id" element={<AddEditCustomer />} />
          <Route path="leads" element={<Leads />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="banners" element={<AppBanners />} />
          <Route path="banners/new" element={<AddEditBanner />} />
          <Route path="banners/:id/view" element={<ViewBanner />} />
          <Route path="banners/:id" element={<AddEditBanner />} />
          <Route path="cutoff-time" element={<CutOffTime />} />
          <Route path="staff-types" element={<StaffTypes />} />
          <Route path="staff-types/new" element={<AddEditStaffType />} />
          <Route path="staff-types/:id" element={<AddEditStaffType />} />
          <Route path="office-staff" element={<OfficeStaff />} />
          <Route path="office-staff/new" element={<AddEditOfficeStaff />} />
          <Route path="office-staff/:id/view" element={<ViewOfficeStaff />} />
          <Route path="office-staff/:id" element={<AddEditOfficeStaff />} />
          <Route path="delivery-modes" element={<DeliveryModes />} />
          <Route path="delivery-modes/new" element={<AddEditDeliveryMode />} />
          <Route path="delivery-modes/:id" element={<AddEditDeliveryMode />} />
          <Route path="delivery-charges" element={<DeliveryCharges />} />
          <Route path="delivery-charges/new" element={<AddEditDeliveryCharge />} />
          <Route path="delivery-charges/:id" element={<AddEditDeliveryCharge />} />
          <Route path="email-terms" element={<EmailTermsConditions />} />
          <Route path="cancel-reasons" element={<CancelReasons />} />
          <Route path="cancel-reasons/new" element={<AddEditCancelReason />} />
          <Route path="cancel-reasons/:id" element={<AddEditCancelReason />} />

          {/* Logistics */}
          <Route path="logistics/hubs" element={<Hubs />} />
          <Route path="logistics/hubs/new" element={<AddEditHub />} />
          <Route path="logistics/hubs/:id" element={<AddEditHub />} />
          <Route path="logistics/delivery-areas" element={<DeliveryAreas />} />
          <Route path="logistics/delivery-areas/new" element={<AddEditDeliveryArea />} />
          <Route path="logistics/delivery-areas/:id" element={<AddEditDeliveryArea />} />
          <Route path="logistics/sub-areas" element={<SubAreas />} />
          <Route path="logistics/sub-areas/new" element={<AddEditSubArea />} />
          <Route path="logistics/sub-areas/:id" element={<AddEditSubArea />} />
          <Route path="logistics/apartments" element={<Apartments />} />
          <Route path="logistics/apartments/new" element={<AddEditApartment />} />
          <Route path="logistics/apartments/:id" element={<AddEditApartment />} />
          <Route path="logistics/routes" element={<DeliveryRoutes />} />
          <Route path="logistics/routes/new" element={<AddEditDeliveryRoute />} />
          <Route path="logistics/routes/:id" element={<AddEditDeliveryRoute />} />
          <Route path="logistics/delivery-boys" element={<DeliveryBoys />} />
          <Route path="logistics/delivery-boys/new" element={<AddEditDeliveryBoy />} />
          <Route path="logistics/delivery-boys/:id/view" element={<ViewDeliveryBoy />} />
          <Route path="logistics/delivery-boys/:id" element={<AddEditDeliveryBoy />} />
          <Route path="logistics/customer-sequencing" element={<CustomerSequencing />} />
          <Route path="logistics/route-wise-customers" element={<RouteWiseCustomers />} />
          <Route path="logistics/mark-daily-delivery" element={<MarkDailyDelivery />} />
          <Route path="logistics/mark-location" element={<MarkCustomerLocation />} />
          <Route path="logistics/route-map" element={<DeliveryRouteMap />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
