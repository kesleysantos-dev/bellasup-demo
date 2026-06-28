import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { Sparkles, LayoutDashboard, Calendar, Scissors, Clock, User, LogOut, Menu, DollarSign, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import SubscriptionBanner from './SubscriptionBanner';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { label: 'Agendamentos', icon: Calendar, path: '/admin/agendamentos' },
  { label: 'Serviços', icon: Scissors, path: '/admin/servicos' },
  { label: 'Financeiro', icon: DollarSign, path: '/admin/financeiro' },
  { label: 'Horários', icon: Clock, path: '/admin/horarios' },
  { label: 'Taxa de Reserva', icon: Wallet, path: '/admin/politicas' },
  { label: 'Perfil', icon: User, path: '/admin/perfil' },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

const AdminLayout = () => {
  const { user, loading, profileId, profile, signOut } = useAuth();
  const { isSuperAdmin, loading: roleLoading } = useSuperAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [trialChecked, setTrialChecked] = useState(false);

  useEffect(() => {
    // Super admin bypasses subscription gate
    if (roleLoading || isSuperAdmin || !profileId || profile?.is_affiliate) return;
    supabase
      .from('profiles')
      .select('plano_ativo, created_at, expires_at, is_active')
      .eq('id', profileId)
      .single()
      .then(({ data }: any) => {
        if (data) {
          const now = new Date();
          const expiresAt = data.expires_at ? new Date(data.expires_at) : null;
          const isPaid = !!data.plano_ativo;
          const isInactive = data.is_active === false;

          const isExpired = expiresAt
            ? now > expiresAt
            : !isPaid && (now.getTime() - new Date(data.created_at).getTime()) / (1000 * 60 * 60) > 24;

          if (isInactive || isExpired) {
            navigate('/assinatura', { replace: true });
            return;
          }
        }
        setTrialChecked(true);
      });
  }, [roleLoading, isSuperAdmin, profileId, profile?.is_affiliate, navigate]);

  useEffect(() => {
    if (loading || roleLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    const isAffiliate = profile?.is_affiliate === true || user?.user_metadata?.is_affiliate === true;
    // Super admin can freely access /admin even if also marked as affiliate
    if (!isSuperAdmin && isAffiliate) {
      navigate('/afiliado', { replace: true });
    }
  }, [loading, roleLoading, user, profile, isSuperAdmin, navigate]);

  if (loading || roleLoading || (user && profile === undefined) || (!trialChecked && !profile?.is_affiliate && !isSuperAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Sparkles className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }

  if (!user || (!profileId && !profile?.is_affiliate)) return null;

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  const greeting = getGreeting();
  const profileName = profile?.nome || '';
  const avatarUrl = profile?.avatar_url ? `${profile.avatar_url}?t=${new Date().getTime()}` : null;

  const NavContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex flex-col h-full bg-card">
      <div className="flex items-center gap-2 px-5 py-6 border-b border-sidebar-border">
        <Sparkles className="h-6 w-6 text-primary" />
        <span className="text-xl font-display font-bold text-gradient-rose">BellasUp</span>
      </div>
      <nav className="flex-1 py-5 space-y-2 px-4">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => { navigate(item.path); onNavigate?.(); }}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3.5 rounded-lg text-sm font-medium transition-all',
              isActive(item.path)
                ? 'gradient-rose text-primary-foreground shadow-sm'
                : 'text-foreground hover:bg-secondary'
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={signOut}>
          <LogOut className="h-4 w-4" />Sair
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background overflow-x-hidden max-w-full">
      <aside className="hidden md:flex w-60 shrink-0 border-r border-border bg-card flex-col sticky top-0 h-screen">
        <NavContent />
      </aside>

      <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
        <header className="md:hidden flex items-center justify-between h-16 px-4 border-b border-border bg-card sticky top-0 z-[100]">
          <div className="flex items-center gap-3">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-card z-[200] border-r-2 border-primary/40 shadow-[4px_0_24px_-4px_hsl(350_35%_58%/0.3)]">
                <NavContent onNavigate={() => setSheetOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2.5">
              <Avatar className="h-9 w-9 border-2 border-primary/30 shadow-sm">
                <AvatarImage src={avatarUrl || ''} alt={profileName} className="object-cover" />
                <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                  {profileName?.charAt(0)?.toUpperCase() || 'M'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col leading-tight">
                <span className="text-xs text-muted-foreground">{greeting},</span>
                <span className="text-sm font-bold text-foreground truncate max-w-[120px] sm:max-w-[180px]">{profileName}</span>
              </div>
            </div>
          </div>
        </header>

        <header className="hidden md:flex items-center justify-between h-16 px-6 border-b border-border bg-card/80 sticky top-0 z-50">
          <div>
            <span className="text-sm text-muted-foreground">{greeting},</span>
            <h2 className="text-lg font-display font-bold text-foreground leading-tight">{profileName}</h2>
          </div>
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 border-2 border-primary/30 shadow-sm">
              <AvatarImage src={avatarUrl || ''} alt={profileName} className="object-cover" />
              <AvatarFallback className="text-sm bg-secondary text-secondary-foreground">
                {profileName?.charAt(0)?.toUpperCase() || 'M'}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-x-hidden max-w-full space-y-4">
          <SubscriptionBanner profileId={profileId} />
          <Outlet context={{ profileId }} />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;