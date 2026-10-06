import { Navigate, Route, Routes } from "react-router-dom";

import { AboutPage } from "@/pages/AboutPage";
import { AccountPage } from "@/pages/AccountPage";
import { BlogPage } from "@/pages/BlogPage";
import { BlogPostPage } from "@/pages/BlogPostPage";
import { CategoryPage } from "@/pages/CategoryPage";
import { ComboSaversPage } from "@/pages/ComboSaversPage";
import { ContactPage } from "@/pages/ContactPage";
import { FaqsPage } from "@/pages/FaqsPage";
import { HelpPage } from "@/pages/HelpPage";
import { HomePageRoute } from "@/pages/HomePageRoute";
import { LoginPage } from "@/pages/LoginPage";
import { PrivacyPolicyPage } from "@/pages/PrivacyPolicyPage";
import { ProductDetailPage } from "@/pages/ProductDetailPage";
import { ProductsPage } from "@/pages/ProductsPage";
import { RefundPolicyPage } from "@/pages/RefundPolicyPage";
import { ShippingPolicyPage } from "@/pages/ShippingPolicyPage";
import { SubscriptionPage } from "@/pages/SubscriptionPage";
import { TermsPage } from "@/pages/TermsPage";
import { TrackOrderPage } from "@/pages/TrackOrderPage";
import { TrialPacksPage } from "@/pages/TrialPacksPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePageRoute />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/products/:id" element={<ProductDetailPage />} />
      <Route path="/category/:id" element={<CategoryPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/subscription" element={<SubscriptionPage />} />
      <Route path="/trial-packs" element={<TrialPacksPage />} />
      <Route path="/combo-savers" element={<ComboSaversPage />} />
      <Route path="/faqs" element={<FaqsPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/blog/:slug" element={<BlogPostPage />} />
      <Route path="/track-order" element={<TrackOrderPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/app" element={<Navigate to="/account" replace />} />
      <Route path="/help" element={<HelpPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/refund-policy" element={<RefundPolicyPage />} />
      <Route path="/shipping-policy" element={<ShippingPolicyPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
