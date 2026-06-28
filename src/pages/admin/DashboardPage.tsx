import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminContext } from '@/hooks/useAdminContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Calendar,
  DollarSign,
  Users,
  Copy,
  X,
  CheckCheck,
  Sparkles,
  Circle,
  CheckCircle2,
  AlertCircle,
  Check,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import ServiceRanking from '@/components/dashboard/ServiceRanking';
import TrialCTA from '@/components/dashboard/TrialCTA';
import type { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { isSameMonth, parseISO, startOfDay } from 'date-fns';

type Status = Database['public']['Enums']['status_agendamento'];

interface AgendamentoComServico {
  id: string;
  cliente_nome: string;
  cliente_telefone: string;
  data: string;
  hora: string;
  status: Status;
  valor_reserva: number | null;
  valor_historico: number | null;
  created_at: string;
  updated_at: string | null;
  servicos: {
    nome: string;
    preco: number;
  } | null;
}

const statusColors: Record<Status, string> = {
  pendente: 'bg-amber-100 text-amber-800 border-amber-200',
  confirmado: 'bg-blue-100 text-blue-800 border-blue-200',
  concluido: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelado: 'bg-red-100 text-red-800 border-red-200',
};

const statusLabels: Record<Status, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

const DashboardPage = () => {
  const { profileId } = useAdminContext();
  const navigate = useNavigate();
  const [slug, setSlug] = useState('');
  const [metrics, setMetrics] = useState({ todayCount: 0, monthlyRevenue: 0, newClients: 0 });
  const [recentAppointments, setRecentAppointments] = useState<AgendamentoComServico[]>([]);
  const [pendingAppointments, setPendingAppointments] = useState<AgendamentoComServico[]>([]);
  const [revenueChart, setRevenueChart] = useState<{ name: string; valor: number }[]>([]);
  const [volumeChart, setVolumeChart] = useState<{ name: string; agendamentos: number }[]>([]);
  const [copied, setCopied] = useState(false);

  // Estados do Tutorial/Onboarding
  const [steps, setSteps] = useState({ hasService: false, hasProfile: false });
  const [showTutorial, setShowTutorial] = useState(false);
  const [showCopyTooltip, setShowCopyTooltip] = useState(false);
  const [loadingSteps, setLoadingSteps] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const getLocalDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return startOfDay(parseISO(dateStr));
  };

  const checkOnboardingSteps = async () => {
    if (!profileId) return;
    try {
      const { data: services } = await supabase.from('servicos').select('id').eq('manicure_id', profileId).limit(1);
      const { data: profile } = await supabase.from('profiles').select('nome, telefone').eq('id', profileId).maybeSingle();

      const hasS = !!(services && services.length > 0);
      const hasP = !!(profile?.nome && profile?.telefone);

      setSteps({ hasService: hasS, hasProfile: hasP });

      // Lógica de exibição do tutorial vs tooltip de cópia
      if (!hasS || !hasP) {
        setShowTutorial(true);
      } else {
        // Mostra o card verde até que ele decida copiar e clique naquele fechamento ou botão
        setShowCopyTooltip(true);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingSteps(false);
    }
  };

  useEffect(() => {
    if (profileId) {
      checkOnboardingSteps();
      fetchAll();
    }
  }, [profileId]);

  const autoExpireReservations = async () => {
    if (!profileId) return;
    await supabase
      .from('agendamentos')
      .update({ status: 'cancelado' } as any)
      .eq('manicure_id', profileId)
      .eq('status', 'pendente')
      .not('valor_reserva', 'is', null)
      .not('expira_em', 'is', null)
      .lt('expira_em', new Date().toISOString());
  };

  const fetchAll = async () => {
    if (!profileId) return;
    await autoExpireReservations();

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const [slugRes, todayRes, allRes, recentRes, pendingRes] = await Promise.all([
      supabase.from('profiles').select('slug').eq('id', profileId).maybeSingle(),
      supabase.from('agendamentos').select('id', { count: 'exact', head: true }).eq('manicure_id', profileId).eq('data', todayStr),
      supabase.from('agendamentos').select('*, servicos(nome, preco)').eq('manicure_id', profileId),
      supabase.from('agendamentos').select('*, servicos(nome, preco)').eq('manicure_id', profileId).order('created_at', { ascending: false }).limit(5),
      supabase.from('agendamentos').select('*, servicos(nome, preco)').eq('manicure_id', profileId).eq('status', 'pendente').order('data', { ascending: true }).order('hora', { ascending: true }),
    ]);

    if (slugRes.data) setSlug(slugRes.data.slug);
    if (recentRes.data) setRecentAppointments(recentRes.data as unknown as AgendamentoComServico[]);
    if (pendingRes.data) setPendingAppointments(pendingRes.data as unknown as AgendamentoComServico[]);

    let monthlyRevenue = 0;
    const currentMonth = new Date();

    if (allRes.data) {
      const dataFormatada = allRes.data as unknown as AgendamentoComServico[];
      monthlyRevenue = dataFormatada.reduce((acc, a) => {
        const status = a.status?.toLowerCase() || "";
        if (status.includes('cancela') || status.includes('pendente') || status === 'aguardando') return acc;

        const taxa = Number(a.valor_reserva || 0);
        const total = Number(a.valor_historico || a.servicos?.preco || 0);
        const isConcluido = status.includes('conclui');
        const dataAgendamento = getLocalDate(a.data);
        const dataCriacao = getLocalDate(a.created_at) || dataAgendamento;
        const dataConclusao = getLocalDate(a.updated_at) || dataAgendamento;

        let ganhoNoMes = 0;
        if (taxa > 0 && dataCriacao && isSameMonth(dataCriacao, currentMonth)) {
          ganhoNoMes += taxa;
        }
        if (isConcluido && dataConclusao && isSameMonth(dataConclusao, currentMonth)) {
          ganhoNoMes += (total - taxa);
        }
        return acc + ganhoNoMes;
      }, 0);
    }

    const uniqueClients = new Set(allRes.data?.filter(a => {
      const date = getLocalDate(a.created_at);
      return date && isSameMonth(date, currentMonth);
    }).map(a => a.cliente_nome) || []);

    setMetrics({
      todayCount: todayRes.count || 0,
      monthlyRevenue,
      newClients: uniqueClients.size
    });

    const charts = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      charts.push({ name: label, valor: 0, agendamentos: 0 });
    }

    if (allRes.data) {
      allRes.data.forEach((a: any) => {
        const status = a.status?.toLowerCase() || "";
        const d = new Date(a.data + 'T12:00:00');
        const label = `${d.getDate()}/${d.getMonth() + 1}`;
        const chart = charts.find(c => c.name === label);
        if (chart) {
          chart.agendamentos++;
          if (!status.includes('cancela') && !status.includes('pendente')) {
            const taxa = Number(a.valor_reserva || 0);
            const total = Number(a.valor_historico || a.servicos?.preco || 0);
            chart.valor += status.includes('conclui') ? total : taxa;
          }
        }
      });
    }
    setRevenueChart(charts.map(c => ({ name: c.name, valor: c.valor })));
    setVolumeChart(charts.map(c => ({ name: c.name, agendamentos: c.agendamentos })));
  };

  const handleConfirm = async (id: string) => {
    const { error } = await supabase.from('agendamentos').update({ status: 'confirmado' as any }).eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Agendamento confirmado!');
      fetchAll();
    }
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase.from('agendamentos').update({ status: 'cancelado' as any }).eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Agendamento recusado.');
      fetchAll();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/agendar/${slug}`);
    setCopied(true);
    setShowCopyTooltip(false); // Esconde o balão ao copiar
    toast.success('Link Copiado!');
    setTimeout(() => setCopied(false), 2500);
  };

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  const allStepsCompleted = steps.hasService && steps.hasProfile;

  return (
    <div className="relative min-h-screen pb-10">

      {/* MODAL DE TUTORIAL - SOBREPÕE TUDO */}
      <Dialog open={showTutorial} onOpenChange={setShowTutorial}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none bg-transparent">
          <Card className="border-primary/20 shadow-2xl">
            <CardHeader className="gradient-rose text-white p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Sparkles className="h-6 w-6 text-white animate-pulse" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-display font-bold text-white">Bem-vinda ao BellasUp!</DialogTitle>
                  <DialogDescription className="text-rose-100 text-sm">
                    Siga os passos abaixo para ativar seu link de agendamentos.
                  </DialogDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4 bg-background">
              <div className="grid gap-3">
                <button
                  onClick={() => navigate('/admin/perfil')}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border transition-all group",
                    steps.hasProfile ? "bg-emerald-50 border-emerald-200" : "bg-background border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("p-2 rounded-full", steps.hasProfile ? "bg-emerald-500" : "bg-muted")}>
                      {steps.hasProfile ? <Check className="h-4 w-4 text-white" /> : <Users className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="text-left">
                      <p className={cn("text-sm font-bold", steps.hasProfile && "text-emerald-700")}>1. Perfil Profissional</p>
                      <p className="text-xs text-muted-foreground">Configure seu nome e telefone.</p>
                    </div>
                  </div>
                  {!steps.hasProfile && <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-all" />}
                </button>

                <button
                  onClick={() => navigate('/admin/servicos')}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border transition-all group",
                    steps.hasService ? "bg-emerald-50 border-emerald-200" : "bg-background border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("p-2 rounded-full", steps.hasService ? "bg-emerald-500" : "bg-muted")}>
                      {steps.hasService ? <Check className="h-4 w-4 text-white" /> : <Calendar className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="text-left">
                      <p className={cn("text-sm font-bold", steps.hasService && "text-emerald-700")}>2. Seus Serviços</p>
                      <p className="text-xs text-muted-foreground">Cadastre pelo menos um serviço.</p>
                    </div>
                  </div>
                  {!steps.hasService && <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-all" />}
                </button>
              </div>

              <Button
                variant="ghost"
                className="w-full text-xs text-muted-foreground mt-2"
                onClick={() => setShowTutorial(false)}
              >
                Configurar mais tarde
              </Button>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>

      <div className="space-y-6 overflow-x-hidden max-w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Dashboard</h1>
        </div>

        <TrialCTA profileId={profileId} />

        {slug && (
          <div className="space-y-4">
            <Card className={cn(
              "border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 transition-all duration-500",
              allStepsCompleted && "ring-2 ring-emerald-500/30"
            )}>
              <CardContent className="p-4 flex items-center justify-between gap-3 relative">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground/80 truncate">bellasup.com/agendar/{slug}</p>
                </div>

                <div className="relative">
                  <Button
                    className={cn("shrink-0", copied ? 'bg-emerald-600 text-white' : 'gradient-rose text-primary-foreground')}
                    size="sm" onClick={handleCopyLink}
                  >
                    {copied ? <CheckCheck className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </Button>

                  {/* TOOLTIP VERDE DE CÓPIA */}
                  {showCopyTooltip && allStepsCompleted && (
                    <div className="absolute bottom-full mb-3 right-0 z-50 animate-bounce">
                      <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-xl whitespace-nowrap relative">
                        Seu link está pronto! Copie aqui ✨
                        <div className="absolute -bottom-1 right-6 w-2 h-2 bg-emerald-600 rotate-45" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowCopyTooltip(false);
                          }}
                          className="absolute -top-2 -right-2 bg-black text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px]"
                        >
                          <X className="h-2 w-2" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {pendingAppointments.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <CardTitle className="font-display text-base text-amber-900">
                  Solicitações Pendentes ({pendingAppointments.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingAppointments.slice(0, 5).map((a) => (
                <div key={a.id} className="p-3 rounded-lg bg-background border border-amber-100 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">{a.cliente_nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.servicos?.nome || '—'} · {formatDate(a.data)} às {a.hora.slice(0, 5)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => handleConfirm(a.id)}>
                      <Check className="h-3.5 w-3.5 mr-1.5" /> Confirmar
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs border-red-100 text-red-600 hover:bg-red-50" onClick={() => handleReject(a.id)}>
                      <X className="h-3.5 w-3.5 mr-1.5" /> Recusar
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard icon={Calendar} label="Agendamentos Hoje" value={metrics.todayCount.toString()} />
          <MetricCard icon={DollarSign} label="Faturamento Mensal" value={`R$ ${metrics.monthlyRevenue.toFixed(2)}`} />
          <MetricCard icon={Users} label="Novos Clientes" value={metrics.newClients.toString()} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border/50">
            <CardHeader><CardTitle className="font-display text-base">Faturamento (7 dias)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={revenueChart}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => [`R$ ${v.toFixed(2)}`, 'Faturamento']} />
                  <Bar dataKey="valor" fill="hsl(350 35% 58%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardHeader><CardTitle className="font-display text-base">Agendamentos (7 dias)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={volumeChart}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="agendamentos" stroke="hsl(35 60% 55%)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <ServiceRanking profileId={profileId} />

        <Card className="border-border/50">
          <CardHeader><CardTitle className="font-display text-base">Agendamentos Recentes</CardTitle></CardHeader>
          <CardContent>
            {recentAppointments.length === 0 ? (
              <p className="text-muted-foreground text-center py-6 text-sm">Nenhum agendamento ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Data</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {recentAppointments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium text-sm">{a.cliente_nome}</TableCell>
                        <TableCell className="text-sm">{formatDate(a.data)} {a.hora.slice(0, 5)}</TableCell>
                        <TableCell><Badge variant="outline" className={cn(statusColors[a.status as Status], "text-[10px]")}>{statusLabels[a.status as Status]}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const MetricCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <Card className="shadow-sm border-border/50">
    <CardContent className="p-5 flex items-center gap-4">
      <div className="p-3 rounded-xl bg-primary/5"><Icon className="h-5 w-5 text-primary" /></div>
      <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-semibold font-display">{value}</p></div>
    </CardContent>
  </Card>
);

export default DashboardPage;