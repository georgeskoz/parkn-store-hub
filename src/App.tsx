import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import HostnameGuard from "@/components/HostnameGuard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import StorageListings from "./pages/StorageListings";
import ListingDetail from "./pages/ListingDetail";
import ProfileSettings from "./pages/ProfileSettings";
import ParkingSearch from "./pages/ParkingSearch";
import RedirectToListing from "./pages/RedirectToListing";
import FindASpot from "./pages/FindASpot";
import BookingConfirmation from "./pages/BookingConfirmation";
import ListYourSpace from "./pages/ListYourSpace";
import EditListing from "./pages/EditListing";
import BookingSuccess from "./pages/BookingSuccess";
import Messages from "./pages/Messages";
import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./components/admin/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminListings from "./pages/admin/AdminListings";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminSurge from "./pages/admin/AdminSurge";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <HostnameGuard />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/storage" element={<StorageListings />} />
            <Route path="/storage/:id" element={<RedirectToListing />} />
            <Route path="/find" element={<FindASpot />} />
            <Route path="/listing/:id" element={<ListingDetail />} />
            <Route path="/parking" element={<ParkingSearch />} />
            <Route path="/parking/:id" element={<RedirectToListing />} />
            <Route path="/booking/confirm" element={<BookingConfirmation />} />
            <Route path="/booking/success" element={<BookingSuccess />} />
            <Route path="/list" element={<ProtectedRoute><ListYourSpace /></ProtectedRoute>} />
            <Route path="/listing/:id/edit" element={<ProtectedRoute><EditListing /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminOverview />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="listings" element={<AdminListings />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="surge" element={<AdminSurge />} />
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
