import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseScoped } from '@/integrations/supabase/scopedClient';
import { useScopedAuth } from '@/contexts/ScopedAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Users, DollarSign, Shield, LogOut, UserX, UserCheck, ArrowLeft, Plus, Trash2, KeyRound, Copy, Mail, Settings, CheckCircle, XCircle, Search, Megaphone, Link as LinkIcon, TrendingUp, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, isBefore, isAfter, differenceInDays } from 'date-fns';

interface ProfileRow {
  id: string;
  nome: string;
  slug: string;
  telefone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  plano_ativo: boolean;
  user_id: string;
  created_at: string;
  expires_at: string | null;
  referred_by: string | null;
  is_affiliate: boolean;
}

type UserFilter = 'todos' | 'ativos' | 'vencidos' | 'proximos' | 'testes_ativos' | 'testes_vencidos';

const SuperAdmin = () => {
  const { user, signOut } = useScopedAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [emailMap, setEmailMap] = useState<Record<string, string>>({});
  const [metrics, setMetrics] = useState({ totalPros: 0, totalRevenue: 0 });
  const [loadingData, setLoadingData] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ nome: '', email: '', password: '' });
  const [creating, setCreating] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<ProfileRow | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProfileRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [planConfirmOpen, setPlanConfirmOpen] = useState(false);
  const [planTarget, setPlanTarget] = useState<ProfileRow | null>(null);
  const [togglingPlan, setTogglingPlan] = useState(false);

  const [expiryOpen, setExpiryOpen] = useState(false);
  const [expiryTarget, setExpiryTarget] = useState<ProfileRow | null>(null);
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  const [updatingExpiry, setUpdatingExpiry] = useState(false);

  const [settingsWhatsapp, setSettingsWhatsapp] = useState('');
  const [settingsValor, setSettingsValor] = useState('');
  const [settingsChavePix, setSettingsChavePix] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [activeFilter, setActiveFilter] = useState<UserFilter>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [affiliateSearch, setAffiliateSearch] = useState('');
  const [selectedAffiliate, setSelectedAffiliate] = useState<string | null>(null);

  const now = new Date();

  const affiliates = Array.from(new Set([
    ...profiles.filter(p => p.is_affiliate).map(p => p.nome),
    ...profiles.map(p => p.referred_by).filter(Boolean)
  ])) as string[];

  const filteredAffiliates = affiliates.filter(aff =>
    aff.toLowerCase().includes(affiliateSearch.toLowerCase())
  );

  const filteredProfiles = profiles.filter(p => {
    const matchesSearch = searchTerm && (
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.referred_by && p.referred_by.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const matchesAffiliate = selectedAffiliate ? p.referred_by === selectedAffiliate : true;

    if (searchTerm && !matchesSearch) return false;
    if (!matchesAffiliate) return false;

    if (activeFilter === 'todos') return true;
    const expiresAt = p.expires_at ? new Date(p.expires_at) : null;
    const isTrialExpired = expiresAt
      ? isBefore(expiresAt, now)
      : (now.getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60) > 24;

    switch (activeFilter) {
      case 'ativos':
        return !p.is_affiliate && p.plano_ativo && expiresAt && isAfter(expiresAt, now);
      case 'vencidos':
        return !p.is_affiliate && p.plano_ativo && expiresAt && isBefore(expiresAt, now);
      case 'proximos':
        return !p.is_affiliate && p.plano_ativo && expiresAt && isAfter(expiresAt, now) && differenceInDays(expiresAt, now) <= 5;
      case 'testes_ativos':
        return !p.is_affiliate && !p.plano_ativo && !isTrialExpired;
      case 'testes_vencidos':
        return !p.is_affiliate && !p.plano_ativo && isTrialExpired;
      default:
        return true;
    }
  });

  useEffect(() => {
    fetchData();
    fetchSettings();
  }, []);

  const fetchData = async () => {
    const [profilesRes, emailsRes] = await Promise.all([
      supabaseScoped
        .from('profiles')
        .select('id, nome, slug, telefone, avatar_url, is_active, user_id, created_at, plano_ativo, expires_at, referred_by, is_affiliate')
        .order('created_at', { ascending: false }),
      supabaseScoped.functions.invoke('manage-user', {
        body: { action: 'list_users' },
      }),
    ]);

    if (profilesRes.data) {
      const dataRows = profilesRes.data as unknown as ProfileRow[];
      setProfiles(dataRows);
      setMetrics(prev => ({ ...prev, totalPros: dataRows.length }));
    }

    if (emailsRes.data?.emails) {
      setEmailMap(emailsRes.data.emails);
    }

    const { data: settings } = await supabaseScoped.from('system_settings' as any).select('valor_plano').limit(1).single();
    const valorPlano = (settings as any)?.valor_plano || 49.9;
    const activeSubs = (profilesRes.data || []).filter((p: any) => p.plano_ativo === true).length;
    setMetrics(prev => ({ ...prev, totalRevenue: activeSubs * valorPlano }));
    setLoadingData(false);
  };

  const fetchSettings = async () => {
    const { data } = await supabaseScoped.from('system_settings' as any).select('*').limit(1).single();
    if (data) {
      setSettingsWhatsapp((data as any).whatsapp_suporte || '');
      setSettingsValor(String((data as any).valor_plano || '49.90'));
      setSettingsChavePix((data as any).chave_pix_suporte || '');
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    const { error } = await (supabaseScoped.from('system_settings' as any) as any).update({
      whatsapp_suporte: settingsWhatsapp,
      valor_plano: parseFloat(settingsValor) || 49.9,
      chave_pix_suporte: settingsChavePix,
    }).not('id', 'is', null);
    setSavingSettings(false);
    if (error) toast.error('Erro ao salvar configurações');
    else toast.success('Configurações salvas!');
  };

  const handleActivatePlan = async (profile: ProfileRow) => {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabaseScoped.from('profiles').update({ plano_ativo: true, expires_at: expiresAt } as any).eq('id', profile.id);
    if (error) {
      toast.error('Erro ao ativar plano mensal');
      return;
    }
    setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, plano_ativo: true, expires_at: expiresAt } : p));
    toast.success(`Plano mensal de ${profile.nome} ativado com sucesso!`);
  };

  const handleDeactivatePlanClick = (profile: ProfileRow) => {
    setPlanTarget(profile);
    setPlanConfirmOpen(true);
  };

  const confirmDeactivatePlan = async () => {
    if (!planTarget) return;
    setTogglingPlan(true);
    const { error } = await supabaseScoped.from('profiles').update({ plano_ativo: false } as any).eq('id', planTarget.id);
    setTogglingPlan(false);
    if (error) {
      toast.error('Erro ao desativar plano');
      setPlanConfirmOpen(false);
      return;
    }
    setProfiles(prev => prev.map(p => p.id === planTarget.id ? { ...p, plano_ativo: false } : p));
    toast.success(`Plano de ${planTarget.nome} desativado com sucesso!`);
    setPlanConfirmOpen(false);
  };

  const openExpiryEdit = (profile: ProfileRow) => {
    setExpiryTarget(profile);
    setExpiryDate(profile.expires_at ? new Date(profile.expires_at) : undefined);
    setExpiryOpen(true);
  };

  const handleUpdateExpiry = async () => {
    if (!expiryTarget || !expiryDate) return;
    setUpdatingExpiry(true);
    const { error } = await supabaseScoped.from('profiles').update({ expires_at: expiryDate.toISOString() } as any).eq('id', expiryTarget.id);
    setUpdatingExpiry(false);
    if (error) {
      toast.error('Erro ao atualizar vencimento');
      return;
    }
    setProfiles(prev => prev.map(p => p.id === expiryTarget.id ? { ...p, expires_at: expiryDate.toISOString() } : p));
    toast.success(`Data atualizada!`);
    setExpiryOpen(false);
  };

  const copyInviteLink = (affiliateName: string) => {
    const link = `${window.location.origin}/auth?ref=${encodeURIComponent(affiliateName)}`;
    navigator.clipboard.writeText(link);
    toast.success(`Link de convite de ${affiliateName} copiado!`);
  };

  const toggleActive = async (profile: ProfileRow) => {
    const newStatus = !profile.is_active;
    const { error } = await supabaseScoped.from('profiles').update({ is_active: newStatus }).eq('id', profile.id);
    if (error) {
      toast.error('Erro ao atualizar status');
      return;
    }
    setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, is_active: newStatus } : p));
    toast.success(newStatus ? 'Ativado' : 'Desativado');
  };

  const handleCreate = async () => {
    if (!createForm.nome || !createForm.email || !createForm.password) {
      toast.error('Preencha todos os campos');
      return;
    }
    setCreating(true);
    const { data, error } = await supabaseScoped.functions.invoke('manage-user', {
      body: { action: 'create_user', ...createForm },
    });
    setCreating(false);
    if (error || data?.error) {
      toast.error(data?.error || 'Erro ao criar usuário');
      return;
    }
    toast.success('Usuário criado!');
    setCreateOpen(false);
    setCreateForm({ nome: '', email: '', password: '' });
    fetchData();
  };

  const handleResetPassword = async () => {
    setResetting(true);
    const { data, error } = await supabaseScoped.functions.invoke('manage-user', {
      body: { action: 'reset_password', user_id: resetTarget!.user_id, new_password: newPassword },
    });
    setResetting(false);
    if (error || data?.error) {
      toast.error(data?.error || 'Erro ao redefinir');
      return;
    }
    toast.success('Senha alterada!');
    setResetOpen(false);
    setNewPassword('');
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { data, error } = await supabaseScoped.functions.invoke('manage-user', {
      body: { action: 'delete_user', user_id: deleteTarget!.user_id, profile_id: deleteTarget!.id },
    });
    if (error || data?.error) {
      toast.error(data?.error || 'Erro ao excluir');
      setDeleting(false);
      return;
    }
    toast.success('Excluído permanentemente!');
    setDeleteOpen(false);
    setProfiles(prev => prev.filter(p => p.id !== deleteTarget!.id));
    setDeleting(false);
  };

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <Sparkles className="h-10 w-10 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100 selection:bg-primary/30">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-rose-400">
              Super Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/5" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Dashboard</span>
            </Button>
            <Button variant="ghost" className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/5" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-[#121214] border-white/5 shadow-2xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400 font-medium">Total de Profissionais</p>
                <p className="text-3xl font-bold font-display text-white">{metrics.totalPros}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#121214] border-white/5 shadow-2xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <DollarSign className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400 font-medium">Faturamento Estimado</p>
                <p className="text-3xl font-bold font-display text-white">R$ {metrics.totalRevenue.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="usuarios" className="w-full">
          <TabsList className="bg-[#121214] border border-white/5 p-1 mb-6">
            <TabsTrigger value="usuarios" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-2" /> Usuários
            </TabsTrigger>
            <TabsTrigger value="afiliados" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <Megaphone className="h-4 w-4 mr-2" /> Afiliados
            </TabsTrigger>
            <TabsTrigger value="config" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <Settings className="h-4 w-4 mr-2" /> Sistema
            </TabsTrigger>
          </TabsList>

          <TabsContent value="usuarios" className="space-y-6">
            <Card className="bg-[#121214] border-white/5 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-6">
                <div>
                  <CardTitle className="text-xl">Gestão de Contas</CardTitle>
                  <p className="text-sm text-slate-400 mt-1">Monitore e controle todos os profissionais cadastrados.</p>
                </div>
                <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Novo Usuário
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      placeholder="Buscar por nome ou afiliado..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-white/5 border-white/10 pl-10 focus:border-primary/50 text-white transition-all"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { key: 'todos', label: 'Todos' },
                      { key: 'ativos', label: 'Premium Ativos' },
                      { key: 'vencidos', label: 'Premium Vencidos' },
                      { key: 'testes_ativos', label: 'Trials Ativos' },
                      { key: 'testes_vencidos', label: 'Trials Vencidos' },
                    ] as { key: UserFilter; label: string }[]).map(f => (
                      <Button
                        key={f.key}
                        size="sm"
                        variant={activeFilter === f.key ? 'default' : 'outline'}
                        className={cn("h-9 rounded-full px-4 border-white/10", activeFilter === f.key ? 'bg-primary text-white' : 'bg-transparent text-slate-400 hover:bg-white/5')}
                        onClick={() => setActiveFilter(f.key)}
                      >
                        {f.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-black/20 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-white/5">
                      <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="text-slate-300">Profissional</TableHead>
                        <TableHead className="text-slate-300">Indicação</TableHead>
                        <TableHead className="text-slate-300">Status</TableHead>
                        <TableHead className="text-slate-300">Assinatura</TableHead>
                        <TableHead className="text-right text-slate-300">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProfiles.map(p => (
                        <TableRow key={p.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 ring-2 ring-primary/10">
                                {p.avatar_url ? <AvatarImage src={p.avatar_url} /> : null}
                                <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                                  {p.nome?.charAt(0)?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-slate-100">{p.nome}</p>
                                <p className="text-[10px] font-mono text-primary/80 lowercase">/{p.slug}</p>
                                <p className="text-xs text-slate-500">{emailMap[p.user_id] || 'Sem e-mail'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {p.referred_by ? (
                              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 cursor-pointer" onClick={() => setSelectedAffiliate(p.referred_by)}>
                                <Megaphone className="h-3 w-3 mr-1" /> {p.referred_by}
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-600">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("border-0", p.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400')}>
                              {p.is_active ? 'Ativo' : 'Bloqueado'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              {p.is_affiliate ? (
                                <span className="text-xs font-semibold flex items-center gap-1.5 text-blue-400">
                                  <Megaphone className="h-3.5 w-3.5" /> Afiliado
                                </span>
                              ) : (
                                <>
                                  <button onClick={() => p.plano_ativo ? handleDeactivatePlanClick(p) : handleActivatePlan(p)} className={cn("text-xs font-semibold flex items-center gap-1.5 hover:opacity-80 transition-all", p.plano_ativo ? 'text-emerald-400' : 'text-slate-500')}>
                                    {p.plano_ativo ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                                    {p.plano_ativo ? 'Premium' : 'Trial'}
                                  </button>
                                  {p.expires_at && (
                                    <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 cursor-pointer hover:text-primary" onClick={() => openExpiryEdit(p)}>
                                      Expira: {format(new Date(p.expires_at), 'dd/MM/yy')} ✏️
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-[#121214] border-white/10 text-white shadow-2xl">
                                <DropdownMenuLabel className="text-slate-400 text-xs text-center uppercase tracking-wider">Gestão do Usuário</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-white/5" />

                                {!p.is_affiliate && (
                                  <>
                                    {!p.plano_ativo ? (
                                      <DropdownMenuItem onClick={() => handleActivatePlan(p)} className="cursor-pointer text-emerald-400 focus:text-emerald-300 focus:bg-emerald-500/10 gap-2">
                                        <CheckCircle className="h-4 w-4" /> Ativar Plano Mensal
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem onClick={() => handleDeactivatePlanClick(p)} className="cursor-pointer text-orange-400 focus:text-orange-300 focus:bg-orange-500/10 gap-2">
                                        <XCircle className="h-4 w-4" /> Desativar Plano
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                )}

                                <DropdownMenuItem onClick={() => { setResetTarget(p); setResetOpen(true); }} className="cursor-pointer hover:text-white focus:text-white focus:bg-white/5 gap-2">
                                  <KeyRound className="h-4 w-4" /> Alterar Senha
                                </DropdownMenuItem>

                                <DropdownMenuItem onClick={() => toggleActive(p)} className={cn("cursor-pointer focus:bg-white/5 gap-2 text-slate-300")}>
                                  {p.is_active ? <><UserX className="h-4 w-4" /> Suspender Acesso</> : <><UserCheck className="h-4 w-4" /> Restaurar Acesso</>}
                                </DropdownMenuItem>

                                <DropdownMenuSeparator className="bg-white/5" />

                                <DropdownMenuItem onClick={() => { setDeleteTarget(p); setDeleteOpen(true); }} className="cursor-pointer text-rose-500 focus:text-rose-400 focus:bg-rose-500/10 gap-2">
                                  <Trash2 className="h-4 w-4" /> Excluir Permanentemente
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="afiliados" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-[#121214] border-white/5 h-fit lg:col-span-1">
                <CardHeader className="space-y-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" /> Afiliados Ativos
                  </CardTitle>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    <Input
                      placeholder="Pesquisar parceiro..."
                      className="h-8 text-xs bg-white/5 border-white/10 pl-8 text-white"
                      value={affiliateSearch}
                      onChange={(e) => setAffiliateSearch(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="ghost"
                    className={cn("w-full justify-between hover:bg-white/5", !selectedAffiliate && "bg-primary/10 text-primary border border-primary/20")}
                    onClick={() => setSelectedAffiliate(null)}
                  >
                    Todos os Clientes <Badge variant="secondary">{profiles.length}</Badge>
                  </Button>
                  {filteredAffiliates.map(aff => {
                    const count = profiles.filter(p => p.referred_by === aff).length;
                    return (
                      <div key={aff} className="group relative">
                        <Button
                          variant="ghost"
                          className={cn("w-full justify-between pr-10 hover:bg-white/5", selectedAffiliate === aff && "bg-primary/10 text-primary border border-primary/20")}
                          onClick={() => setSelectedAffiliate(aff)}
                        >
                          <span className="truncate">{aff}</span>
                          <Badge variant="outline" className="border-white/10">{count}</Badge>
                        </Button>
                        <button
                          onClick={(e) => { e.stopPropagation(); copyInviteLink(aff); }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-white transition-colors"
                          title="Copiar link de convite"
                        >
                          <LinkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <div className="lg:col-span-2 space-y-6">
                {selectedAffiliate && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-primary/5 border-primary/10">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg"><Users className="h-4 w-4 text-primary" /></div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Indicações</p>
                          <p className="text-xl font-bold">{profiles.filter(p => p.referred_by === selectedAffiliate).length}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-emerald-500/5 border-emerald-500/10">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg"><CheckCircle className="h-4 w-4 text-emerald-400" /></div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Pagantes</p>
                          <p className="text-xl font-bold">{profiles.filter(p => p.referred_by === selectedAffiliate && p.plano_ativo).length}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-blue-500/5 border-blue-500/10">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg"><TrendingUp className="h-4 w-4 text-blue-400" /></div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Conversão</p>
                          <p className="text-xl font-bold">
                            {((profiles.filter(p => p.referred_by === selectedAffiliate && p.plano_ativo).length /
                              Math.max(1, profiles.filter(p => p.referred_by === selectedAffiliate).length)) * 100).toFixed(0)}%
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <Card className="bg-[#121214] border-white/5">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {selectedAffiliate ? `Clientes de: ${selectedAffiliate}` : "Todos os Clientes"}
                      </CardTitle>
                      {selectedAffiliate && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-primary bg-primary/5 p-2 rounded-md border border-primary/10 w-full max-w-md">
                          <LinkIcon className="h-3 w-3" />
                          <span className="truncate">{window.location.origin}/auth?ref={selectedAffiliate}</span>
                          <Copy className="h-3 w-3 cursor-pointer ml-auto" onClick={() => copyInviteLink(selectedAffiliate)} />
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 mt-4">
                        {([
                          { key: 'todos', label: 'Todos' },
                          { key: 'ativos', label: 'Premium Ativos' },
                          { key: 'vencidos', label: 'Premium Vencidos' },
                          { key: 'testes_ativos', label: 'Trials Ativos' },
                          { key: 'testes_vencidos', label: 'Trials Vencidos' },
                        ] as { key: UserFilter; label: string }[]).map(f => {
                          const currentAffiliateProfiles = selectedAffiliate
                            ? profiles.filter(p => p.referred_by === selectedAffiliate)
                            : profiles;

                          let badgeCount = 0;
                          if (f.key === 'todos') badgeCount = currentAffiliateProfiles.length;
                          else {
                            badgeCount = currentAffiliateProfiles.filter(p => {
                              const expiresAt = p.expires_at ? new Date(p.expires_at) : null;
                              const isTrialExpired = expiresAt
                                ? isBefore(expiresAt, now)
                                : (now.getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60) > 24;

                              if (f.key === 'ativos') return p.plano_ativo && expiresAt && isAfter(expiresAt, now);
                              if (f.key === 'vencidos') return p.plano_ativo && expiresAt && isBefore(expiresAt, now);
                              if (f.key === 'testes_ativos') return !p.plano_ativo && !isTrialExpired;
                              if (f.key === 'testes_vencidos') return !p.plano_ativo && isTrialExpired;
                              return false;
                            }).length;
                          }

                          return (
                            <Button
                              key={f.key}
                              size="sm"
                              variant={activeFilter === f.key ? 'default' : 'outline'}
                              className={cn(
                                "h-8 rounded-full px-3 text-[11px] flex items-center gap-1.5",
                                activeFilter === f.key ? 'bg-primary text-white border-primary' : 'text-slate-400 border-white/5 bg-white/5'
                              )}
                              onClick={() => setActiveFilter(f.key)}
                            >
                              {f.label}
                              <Badge className={cn("h-4 min-w-[16px] px-1 text-[9px] border-0", activeFilter === f.key ? "bg-white text-primary" : "bg-white/10 text-slate-400")}>
                                {badgeCount}
                              </Badge>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="relative mb-4">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                          placeholder="Pesquisar cliente deste parceiro..."
                          className="bg-white/5 border-white/10 pl-9 text-white"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      {filteredProfiles.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-[10px] bg-white/5">{p.nome.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-white">{p.nome}</p>
                              <p className="text-[10px] text-slate-500 italic">Cadastrado em {format(new Date(p.created_at), 'dd/MM/yyyy')}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={p.plano_ativo ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" : "text-slate-500 border-white/5"}>
                              {p.plano_ativo ? "Premium" : "Trial"}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-[#121214] border-white/10 text-white shadow-2xl">
                                <DropdownMenuLabel className="text-slate-400 text-xs text-center uppercase tracking-wider">Gestão</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-white/5" />

                                {!p.plano_ativo ? (
                                  <DropdownMenuItem onClick={() => handleActivatePlan(p)} className="cursor-pointer text-emerald-400 focus:text-emerald-300 focus:bg-emerald-500/10 gap-2">
                                    <CheckCircle className="h-4 w-4" /> Ativar Plano Mensal
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleDeactivatePlanClick(p)} className="cursor-pointer text-orange-400 focus:text-orange-300 focus:bg-orange-500/10 gap-2">
                                    <XCircle className="h-4 w-4" /> Desativar Plano
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuItem onClick={() => { setResetTarget(p); setResetOpen(true); }} className="cursor-pointer hover:text-white focus:text-white focus:bg-white/5 gap-2">
                                  <KeyRound className="h-4 w-4" /> Alterar Senha
                                </DropdownMenuItem>

                                <DropdownMenuSeparator className="bg-white/5" />

                                <DropdownMenuItem onClick={() => { setDeleteTarget(p); setDeleteOpen(true); }} className="cursor-pointer text-rose-500 focus:text-rose-400 focus:bg-rose-500/10 gap-2">
                                  <Trash2 className="h-4 w-4" /> Excluir Cliente
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                      {filteredProfiles.length === 0 && (
                        <div className="text-center py-12 text-slate-600">Nenhum cliente encontrado.</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="config">
            <Card className="bg-[#121214] border-white/5 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" /> Configurações Globais
                </CardTitle>
                <p className="text-sm text-slate-400">Ajuste as regras de negócio e suporte do sistema.</p>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-slate-300">WhatsApp de Suporte</Label>
                    <Input
                      value={settingsWhatsapp}
                      onChange={e => setSettingsWhatsapp(e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="Ex: 5585999999999"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Valor do Plano (R$)</Label>
                    <Input
                      type="number"
                      value={settingsValor}
                      onChange={e => setSettingsValor(e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-slate-300">Chave PIX (Recebimento)</Label>
                    <Input
                      value={settingsChavePix}
                      onChange={e => setSettingsChavePix(e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="E-mail, CPF ou Chave Aleatória"
                    />
                  </div>
                </div>
                <Button className="w-full sm:w-auto bg-primary text-white" onClick={saveSettings} disabled={savingSettings}>
                  {savingSettings ? 'Processando...' : 'Salvar Alterações'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* DIALOGS */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#121214] border-white/10 text-white shadow-2xl">
          <DialogHeader><DialogTitle>Nova Conta</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Nome Completo</Label>
              <Input value={createForm.nome} onChange={e => setCreateForm(f => ({ ...f, nome: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">E-mail de Acesso</Label>
              <Input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Senha Provisória</Label>
              <Input type="password" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setCreateOpen(false)} className="text-slate-400">Cancelar</Button>
            <Button className="bg-primary text-white" onClick={handleCreate} disabled={creating}>{creating ? 'Criando...' : 'Criar Profissional'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="bg-[#121214] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription className="text-slate-400">Defina uma nova senha para {resetTarget?.nome}.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-slate-300">Nova Senha</Label>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="bg-white/5 border-white/10 mt-2 text-white" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResetOpen(false)} className="text-slate-400">Cancelar</Button>
            <Button className="bg-primary text-white" onClick={handleResetPassword} disabled={resetting}>{resetting ? 'Alterando...' : 'Atualizar Senha'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[#121214] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-rose-500 flex items-center gap-2"><Trash2 className="h-5 w-5" /> Exclusão Permanente</DialogTitle>
            <DialogDescription className="text-slate-400 pt-2">Apagar a conta de {deleteTarget?.nome}? Esta ação é irreversível.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} className="text-slate-400">Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? 'Excluindo...' : 'Confirmar Exclusão'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={planConfirmOpen} onOpenChange={setPlanConfirmOpen}>
        <DialogContent className="bg-[#121214] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-orange-400">Desativar Plano Premium</DialogTitle>
            <DialogDescription className="text-slate-400 mt-2">Tem certeza que deseja desativar a assinatura de {planTarget?.nome}? O usuário perderá o acesso premium imediatamente.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="ghost" onClick={() => setPlanConfirmOpen(false)} className="text-slate-400">Cancelar</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={confirmDeactivatePlan} disabled={togglingPlan}>{togglingPlan ? 'Desativando...' : 'Confirmar Desativação'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={expiryOpen} onOpenChange={setExpiryOpen}>
        <DialogContent className="bg-[#121214] border-white/10 text-white flex flex-col items-center max-w-sm">
          <DialogHeader className="w-full text-left">
            <DialogTitle>Vencimento da Conta</DialogTitle>
          </DialogHeader>
          <Calendar mode="single" selected={expiryDate} onSelect={setExpiryDate} className="bg-black/20 rounded-lg border border-white/5 mt-4 text-white" />
          <DialogFooter className="w-full mt-6 flex gap-2">
            <Button variant="ghost" onClick={() => setExpiryOpen(false)} className="flex-1 text-slate-400">Fechar</Button>
            <Button className="bg-primary text-white flex-1" onClick={handleUpdateExpiry} disabled={updatingExpiry || !expiryDate}>Salvar Data</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdmin;