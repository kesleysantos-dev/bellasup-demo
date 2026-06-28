import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseScoped } from '@/integrations/supabase/scopedClient';
import { useScopedAuth } from '@/contexts/ScopedAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LinkIcon, Users, DollarSign, ShieldAlert, CheckCircle2, Copy, BellRing, Sparkles, TrendingUp, X, LogOut, Search, Database } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReferralProfile {
  id: string;
  nome: string;
  plano_ativo: boolean;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

interface NotificationRow {
  id: string;
  referred_user_id: string;
  is_read: boolean;
  created_at: string;
}

const AffiliateDashboard = () => {
  const { user, profile, loading, profileId, isSuperAdmin, signOut } = useScopedAuth();
  const navigate = useNavigate();

  const [referrals, setReferrals] = useState<ReferralProfile[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'trial' | 'premium' | 'expired'>('all');

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/afiliado/login');
      return;
    }

    const isAffiliate = profile?.is_affiliate === true || user?.user_metadata?.is_affiliate === true;

    if (!isAffiliate && !isSuperAdmin) {
      navigate('/afiliado/login');
      return;
    }

    if (profile?.nome && profileId) {
      loadData();
    } else {
      setLoadingData(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, profile, isSuperAdmin, profileId]);

  const loadData = async () => {
    setLoadingData(true);

    // 1. Fetch Referrals
    const { data: refData } = await (supabaseScoped.from('profiles' as any) as any)
      .select('id, nome, plano_ativo, is_active, created_at, expires_at')
      .eq('referred_by', profile.nome)
      .order('created_at', { ascending: false });

    const fetchedReferrals = (refData || []) as ReferralProfile[];
    setReferrals(fetchedReferrals);

    // 2. Fetch Notifications
    const { data: notifData } = await (supabaseScoped.from('affiliate_notifications' as any) as any)
      .select('*')
      .eq('affiliate_id', profileId)
      .order('created_at', { ascending: false });

    // 3. Sync Logic: Check for new premium users that don't have notifications yet
    const existingNotifs = (notifData || []) as NotificationRow[];
    setNotifications(existingNotifs);

    const existingSet = new Set(existingNotifs.map(n => n.referred_user_id));
    const newPremiums = fetchedReferrals.filter(r => r.plano_ativo && !existingSet.has(r.id));

    if (newPremiums.length > 0) {
      const toInsert = newPremiums.map(p => ({
        affiliate_id: profileId,
        referred_user_id: p.id,
        is_read: false
      }));

      await (supabaseScoped.from('affiliate_notifications' as any) as any).insert(toInsert);

      // Fire visual toasts right away
      newPremiums.forEach(p => {
        toast.success(`🤑 Conversão de ${p.nome}!`, {
          description: "O usuário se tornou Premium."
        });
      });

      // Refetch notifications to get DB IDs
      const { data: updatedNotifs } = await (supabaseScoped.from('affiliate_notifications' as any) as any)
        .select('*')
        .eq('affiliate_id', profileId)
        .order('created_at', { ascending: false });

      setNotifications(updatedNotifs || []);
    }

    setLoadingData(false);
  };

  const markAsRead = async (notifId: string) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
    await (supabaseScoped.from('affiliate_notifications' as any) as any)
      .update({ is_read: true })
      .eq('id', notifId);
  };

  const copyInviteLink = async () => {
    const link = `${window.location.origin}/auth?ref=${encodeURIComponent(profile?.nome || '')}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link de convite copiado!');
    } catch (e) {
      toast.error('Falha ao copiar. Selecione o link acima.');
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Sparkles className="h-10 w-10 text-orange-500 animate-pulse" />
      </div>
    );
  }

  // Calculate Metrics
  const totalReferrals = referrals.length;
  const premiumCount = referrals.filter(r => r.plano_ativo).length;
  const activeTrialsCount = referrals.filter(r => {
    if (r.plano_ativo) return false;
    const now = new Date();
    const expiresAt = r.expires_at ? new Date(r.expires_at) : null;
    const isTrialExpired = expiresAt
      ? isBefore(expiresAt, now)
      : (now.getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60) > 24;
    return !isTrialExpired;
  }).length;

  const unreadNotifications = notifications.filter(n => !n.is_read);

  const filteredReferrals = referrals.filter(r => {
    if (searchQuery && !r.nome.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    const now = new Date();
    const expiresAt = r.expires_at ? new Date(r.expires_at) : null;
    const isTrialExpired = expiresAt
      ? isBefore(expiresAt, now)
      : (now.getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60) > 24;

    const isPremium = r.plano_ativo;
    const isTrialActive = !isPremium && !isTrialExpired;
    const isExpired = !isPremium && isTrialExpired;

    if (statusFilter === 'premium' && !isPremium) return false;
    if (statusFilter === 'trial' && !isTrialActive) return false;
    if (statusFilter === 'expired' && !isExpired) return false;

    return true;
  });

  const getStatusConfig = (r: ReferralProfile) => {
    const now = new Date();
    const expiresAt = r.expires_at ? new Date(r.expires_at) : null;
    const isTrialExpired = expiresAt
      ? isBefore(expiresAt, now)
      : (now.getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60) > 24;

    if (r.plano_ativo) {
      return { label: 'Assinante Premium', classes: 'border-blue-500/30 bg-blue-500/10 text-blue-400 shadow-[0_0_10px_rgba(37,99,235,0.2)]', icon: CheckCircle2 };
    } else if (!isTrialExpired) {
      return { label: 'Trial Ativo', classes: 'border-orange-500/30 bg-orange-500/10 text-orange-400', icon: ShieldAlert };
    } else {
      return { label: 'Trial Vencido', classes: 'border-slate-700 bg-slate-800/50 text-slate-500', icon: X };
    }
  };

  return (
    <div className="min-h-screen bg-black text-slate-200 font-sans selection:bg-blue-500/30 relative overflow-x-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-100px] right-[-100px] w-96 h-96 bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-100px] left-[-100px] w-96 h-96 bg-orange-600/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-20 px-4 sm:px-6 box-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-600/20 to-orange-500/20 rounded-xl border border-white/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                {new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite'}, <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-orange-400">{profile?.nome?.split(' ')[0] || 'Parceiro'}</span> 👋
              </h1>
              <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-1">
                Resumo Operacional • Painel VIP
              </p>
            </div>
          </div>
          <Button variant="ghost" className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors" onClick={async () => {
            await signOut();
            navigate('/afiliado/login');
          }}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 sm:py-10 px-4 sm:px-6 space-y-8 relative z-10 w-full box-border">
        {/* Link Section */}
        <section className="bg-gradient-to-r from-slate-900 to-black p-[1px] rounded-2xl shadow-2xl">
          <div className="bg-[#0a0a0c] rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
            <div className="space-y-2 flex-1 w-full relative z-10">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-blue-500" /> Seu Motor de Aquisição
              </h2>
              <p className="text-sm text-slate-400">Compartilhe este link para garantir suas comissões em todas as indicações.</p>
              <div className="flex items-center gap-2 mt-4 max-w-full">
                <Input
                  readOnly
                  value={`${window.location.origin}/auth?ref=${profile?.nome}`}
                  className="bg-black/50 border-slate-800 text-slate-300 font-mono text-sm xl:max-w-xl h-12"
                />
                <Button onClick={copyInviteLink} className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] h-12 px-6">
                  <Copy className="h-4 w-4 mr-2" /> Copiar URL
                </Button>
              </div>
            </div>

            {/* Unread Notifications Alert Container */}
            {unreadNotifications.length > 0 && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 w-full md:w-80 shrink-0 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent pointer-events-none" />
                <div className="flex justify-between items-start mb-2 relative z-10">
                  <span className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-widest">
                    <BellRing className="h-3 w-3 animate-bounce" /> Novas Vendas!
                  </span>
                  <Badge variant="secondary" className="bg-orange-500 text-black border-0">{unreadNotifications.length}</Badge>
                </div>
                <div className="space-y-3 max-h-32 overflow-y-auto pr-2 custom-scrollbar relative z-10">
                  {unreadNotifications.map(notif => {
                    const referencedUser = referrals.find(r => r.id === notif.referred_user_id);
                    return (
                      <div key={notif.id} className="text-sm text-slate-300 bg-black/40 p-2.5 rounded-lg border border-white/5 flex items-start justify-between gap-3 shadow-inner">
                        <span className="leading-tight">
                          <strong className="text-white">{referencedUser?.nome || 'Usuário'}</strong> ativou o Premium.
                        </span>
                        <button onClick={() => markAsRead(notif.id)} className="text-slate-500 hover:text-white shrink-0 mt-0.5 transition-colors">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Metrics Section */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="bg-[#0a0a0c] border border-slate-800 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-sm overflow-hidden group hover:border-slate-700 transition-all">
            <CardContent className="p-6 relative">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Users className="h-24 w-24" />
              </div>
              <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Volume Total</p>
              <div className="mt-4 flex items-baseline gap-3">
                <h3 className="text-4xl font-black text-white">{totalReferrals}</h3>
                <span className="text-sm font-semibold text-slate-500">leads</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0a0a0c] border border-slate-800 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-sm overflow-hidden group hover:border-slate-700 transition-all">
            <CardContent className="p-6 relative">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <ShieldAlert className="h-24 w-24" />
              </div>
              <p className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Trials em Andamento
              </p>
              <div className="mt-4 flex items-baseline gap-3">
                <h3 className="text-4xl font-black text-white">{activeTrialsCount}</h3>
                <span className="text-sm font-semibold text-slate-500">aquecendo</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#0a0a0c] to-[#050b14] border border-blue-900/30 shadow-[0_0_30px_rgba(37,99,235,0.1)] backdrop-blur-sm overflow-hidden group">
            <CardContent className="p-6 relative z-10">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity text-blue-500">
                <DollarSign className="h-24 w-24" />
              </div>
              <p className="text-sm font-medium text-blue-400 uppercase tracking-wider">Carteira de Clientes</p>
              <div className="mt-4 flex items-baseline gap-3">
                <h3 className="text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{premiumCount}</h3>
                <span className="text-sm font-semibold text-slate-400">ativos</span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Database Readout Table */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <h3 className="text-lg font-bold text-white tracking-wide w-full sm:w-auto">Base de Cadastros ({filteredReferrals.length})</h3>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Buscar indicado..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 bg-[#0a0a0c] border-slate-800 text-slate-300 focus:border-blue-500/50 h-10 w-full rounded-xl transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                />
              </div>
              <div className="flex bg-[#0a0a0c] p-1 rounded-xl border border-slate-800 shadow-[0_0_15px_rgba(0,0,0,0.5)] w-full sm:w-auto overflow-x-auto custom-scrollbar">
                <Button
                  variant="ghost"
                  className={cn("h-8 rounded-lg text-xs font-semibold px-3 whitespace-nowrap transition-all", statusFilter === 'all' ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-white hover:bg-white/5")}
                  onClick={() => setStatusFilter('all')}
                >
                  Todos
                </Button>
                <Button
                  variant="ghost"
                  className={cn("h-8 rounded-lg text-xs font-semibold px-3 whitespace-nowrap transition-all", statusFilter === 'trial' ? "bg-orange-500/20 text-orange-400 shadow-sm" : "text-slate-400 hover:text-orange-400 hover:bg-orange-500/10")}
                  onClick={() => setStatusFilter('trial')}
                >
                  Trial
                </Button>
                <Button
                  variant="ghost"
                  className={cn("h-8 rounded-lg text-xs font-semibold px-3 whitespace-nowrap transition-all", statusFilter === 'premium' ? "bg-blue-500/20 text-blue-400 shadow-sm" : "text-slate-400 hover:text-blue-400 hover:bg-blue-500/10")}
                  onClick={() => setStatusFilter('premium')}
                >
                  Premium
                </Button>
                <Button
                  variant="ghost"
                  className={cn("h-8 rounded-lg text-xs font-semibold px-3 whitespace-nowrap transition-all", statusFilter === 'expired' ? "bg-slate-800 text-slate-300 shadow-sm" : "text-slate-400 hover:text-slate-300 hover:bg-white/5")}
                  onClick={() => setStatusFilter('expired')}
                >
                  Expirados
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0a0a0c]/80 backdrop-blur-md overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.8)]">

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto w-full">
              <Table className="min-w-[600px] w-full">
                <TableHeader className="bg-slate-900/50">
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400 font-medium">Conta do Usuário</TableHead>
                    <TableHead className="text-slate-400 font-medium whitespace-nowrap">Status da Licença</TableHead>
                    <TableHead className="text-slate-400 font-medium whitespace-nowrap">Expiração</TableHead>
                    <TableHead className="text-slate-400 font-medium text-right whitespace-nowrap">Data de Adesão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReferrals.map(r => {
                    const statusConfig = getStatusConfig(r);
                    const StatusIcon = statusConfig.icon;

                    return (
                      <TableRow key={r.id} className="border-slate-800/50 hover:bg-white/[0.02] transition-colors">
                        <TableCell className="font-medium text-slate-200">
                          {r.nome}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("px-2.5 py-1 gap-1.5 font-semibold tracking-wide", statusConfig.classes)}>
                            <StatusIcon className="h-3.5 w-3.5" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-400 font-mono text-sm">
                          {r.expires_at ? format(new Date(r.expires_at), "dd/MM/yyyy", { locale: ptBR }) : '--'}
                        </TableCell>
                        <TableCell className="text-right text-slate-500 font-mono text-sm">
                          {format(new Date(r.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {filteredReferrals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-40 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <Database className="h-8 w-8 text-slate-800" />
                          <p>Nenhum indicado atende aos filtros atuais.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden flex flex-col divide-y divide-slate-800/50">
              {filteredReferrals.map(r => {
                const statusConfig = getStatusConfig(r);
                const StatusIcon = statusConfig.icon;

                return (
                  <div key={r.id} className="p-4 space-y-3 hover:bg-white/[0.02] transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-bold text-slate-200 text-sm truncate">{r.nome}</span>
                      <Badge variant="outline" className={cn("px-2 py-0.5 gap-1.5 text-[10px] sm:text-xs font-semibold shrink-0", statusConfig.classes)}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm pt-2">
                      <div className="flex flex-col">
                        <span className="text-slate-600 text-[10px] uppercase tracking-wider font-bold mb-0.5">Adesão</span>
                        <span className="text-slate-400 font-mono text-xs">{format(new Date(r.created_at), "dd/MM/yy", { locale: ptBR })}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-slate-600 text-[10px] uppercase tracking-wider font-bold mb-0.5">Expiração</span>
                        <span className="text-slate-400 font-mono text-xs">{r.expires_at ? format(new Date(r.expires_at), "dd/MM/yy", { locale: ptBR }) : '--'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredReferrals.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500 px-4 text-center">
                  <Database className="h-8 w-8 text-slate-800" />
                  <p className="text-sm">Nenhum indicado atende aos filtros atuais.</p>
                </div>
              )}
            </div>

          </div>
        </section>
      </main>

      <style>{`
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #000000;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(30, 41, 59, 1);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(51, 65, 85, 1);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(249, 115, 22, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(249, 115, 22, 0.4);
        }
      `}</style>
    </div>
  );
};

export default AffiliateDashboard;
