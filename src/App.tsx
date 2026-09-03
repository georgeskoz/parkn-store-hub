import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import HostnameGuard from "@/components/HostnameGuard";
import MaintenanceBanner from "@/components/MaintenanceBanner";
import BroadcastBanner from "@/components/notifications/BroadcastBanner";
import ScrollToTop from "@/components/ScrollToTop";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import StorageListings from "./pages/StorageListings";
import ListingDetail from "./pages/ListingDetail";
import ProfileSettings from "./pages/ProfileSettings";
import ParkingSearch from "./pages/ParkingSearch";
import RedirectToListing from "./pages/RedirectToListing";
import FindASpot from "./pages/FindASpot";
import BookingConfirmation from "./pages/BookingConfirmation";
import BookingIntake from "./pages/BookingIntake";
import ListYourSpace from "./pages/ListYourSpace";
import EditListing from "./pages/EditListing";
import BookingSuccess from "./pages/BookingSuccess";
import BookingReceiptPage from "./pages/BookingReceiptPage";
import Messages from "./pages/Messages";
import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./components/admin/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminListings from "./pages/admin/AdminListings";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminSurge from "./pages/admin/AdminSurge";
import AdminContentPages from "./pages/admin/AdminContentPages";
import About from "./pages/About";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";
import Support from "./pages/Support";
import OAuthConsent from "./pages/OAuthConsent";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />

          <HostnameGuard />
          <MaintenanceBanner />
          <BroadcastBanner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            <Route path="/storage" element={<StorageListings />} />
            <Route path="/storage/:id" element={<RedirectToListing />} />
            <Route path="/find" element={<FindASpot />} />
            <Route path="/listing/:id" element={<ListingDetail />} />
            <Route path="/parking" element={<ParkingSearch />} />
            <Route path="/parking/:id" element={<RedirectToListing />} />
            <Route path="/booking/intake" element={<BookingIntake />} />
            <Route path="/booking/confirm" element={<BookingConfirmation />} />
            <Route path="/booking/success" element={<BookingSuccess />} />
            <Route path="/booking/receipt/:bookingId" element={<ProtectedRoute><BookingReceiptPage /></ProtectedRoute>} />
            <Route path="/list" element={<ProtectedRoute><ListYourSpace /></ProtectedRoute>} />
            <Route path="/listing/:id/edit" element={<ProtectedRoute><EditListing /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/support" element={<Support />} />
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminOverview />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="listings" element={<AdminListings />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="surge" element={<AdminSurge />} />
              <Route path="content-pages" element={<AdminContentPages />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
