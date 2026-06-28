import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { ScopedAuthProvider } from "@/contexts/ScopedAuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Booking from "./pages/Booking";
import NotFound from "./pages/NotFound";
import AdminLayout from "./components/admin/AdminLayout";
import DashboardPage from "./pages/admin/DashboardPage";
import AgendamentosPage from "./pages/admin/AgendamentosPage";
import AppointmentDetailPage from "./pages/admin/AppointmentDetailPage";
import ServicosPage from "./pages/admin/ServicosPage";
import HorariosPage from "./pages/admin/HorariosPage";
import FinanceiroPage from "./pages/admin/FinanceiroPage";
import PerfilPage from "./pages/admin/PerfilPage";
import PoliticasPage from "./pages/admin/PoliticasPage";
import SuperAdmin from "./pages/SuperAdmin";
import SuperAdminLogin from "./pages/SuperAdminLogin";
import SuperAdminGuard from "./components/guards/SuperAdminGuard";
import AccessDenied from "./pages/AccessDenied";
import PlanBlocked from "./pages/PlanBlocked";
import Assinatura from "./pages/Assinatura";
import AffiliateDashboard from "./pages/AffiliateDashboard";
import AffiliateLogin from "./pages/AffiliateLogin";
import AffiliateRegister from "./pages/AffiliateRegister";
import InstallBanner from "./components/pwa/InstallBanner";
import useServiceWorkerUpdate from "./hooks/useServiceWorkerUpdate";

const queryClient = new QueryClient();

const AppInner = () => {
  useServiceWorkerUpdate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");

    if (ref) {
      const affiliateData = {
        id: ref,
        expiry: new Date().getTime() + 30 * 24 * 60 * 60 * 1000
      };
      localStorage.setItem("bellasup_affiliate", JSON.stringify(affiliateData));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return null;
};

const AuthRedirector = () => {
  const { user, profile, loading } = useAuth();
  const { isSuperAdmin, loading: roleLoading } = useSuperAdmin();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || roleLoading || !user) return;

    if (location.pathname === '/afiliado/cadastro') return;

    // These route trees have their own isolated ScopedAuthProvider — never interfere
    const isAffiliatePath = location.pathname.startsWith('/afiliado');
    const isSuperAdminPath = location.pathname.startsWith('/super-admin');
    if (isAffiliatePath || isSuperAdminPath) return;

    const isAdminPath = location.pathname.startsWith('/admin') || location.pathname === '/dashboard';
    const isUserAffiliate = profile?.is_affiliate === true || user.user_metadata?.is_affiliate === true;

    // Super admin tem passe livre — nunca é forçado para /afiliado
    if (!isSuperAdmin && isUserAffiliate && (isAdminPath || location.pathname === '/')) {
      navigate('/afiliado', { replace: true });
    }
  }, [loading, roleLoading, user, profile, isSuperAdmin, location.pathname, navigate]);

  return null;
};

const ScopedAuthLayout = () => (
  <ScopedAuthProvider>
    <Outlet />
  </ScopedAuthProvider>
);

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppInner />
        <BrowserRouter>
          <AuthProvider>
            <AuthRedirector />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="agendamentos" element={<AgendamentosPage />} />
                <Route path="agendamentos/:id" element={<AppointmentDetailPage />} />
                <Route path="servicos" element={<ServicosPage />} />
                <Route path="financeiro" element={<FinanceiroPage />} />
                <Route path="horarios" element={<HorariosPage />} />
                <Route path="politicas" element={<PoliticasPage />} />
                <Route path="perfil" element={<PerfilPage />} />
              </Route>
              <Route path="/agendar/:slug" element={<Booking />} />
              <Route path="/acesso-negado" element={<AccessDenied />} />
              <Route path="/plano-bloqueado" element={<PlanBlocked />} />
              <Route path="/assinatura" element={<Assinatura />} />
              <Route path="/renovacao" element={<Assinatura />} />

              {/* Scoped-auth routes — isolated sessionStorage per tab */}
              <Route element={<ScopedAuthLayout />}>
                <Route path="/afiliado" element={<AffiliateDashboard />} />
                <Route path="/afiliado/login" element={<AffiliateLogin />} />
                <Route path="/afiliado/cadastro" element={<AffiliateRegister />} />
                <Route path="/super-admin/login" element={<SuperAdminLogin />} />
                <Route path="/super-admin" element={<SuperAdminGuard><SuperAdmin /></SuperAdminGuard>} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
            <InstallBanner />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;