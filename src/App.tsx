import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import StorageListings from "./pages/StorageListings";
import StorageDetail from "./pages/StorageDetail";
import ProfileSettings from "./pages/ProfileSettings";
import ParkingSearch from "./pages/ParkingSearch";
import ParkingDetail from "./pages/ParkingDetail";
import BookingConfirmation from "./pages/BookingConfirmation";
import ListYourSpace from "./pages/ListYourSpace";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/storage" element={<StorageListings />} />
            <Route path="/storage/:id" element={<StorageDetail />} />
            <Route path="/parking" element={<ParkingSearch />} />
            <Route path="/parking/:id" element={<ParkingDetail />} />
            <Route path="/booking/confirm" element={<BookingConfirmation />} />
            <Route path="/list" element={<ProtectedRoute><ListYourSpace /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
