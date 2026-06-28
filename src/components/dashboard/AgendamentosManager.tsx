import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Check, X, CheckCircle, Clock, History, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Status = Database['public']['Enums']['status_agendamento'];

interface Agendamento {
  id: string;
  cliente_nome: string;
  cliente_telefone: string | null;
  data: string;
  hora: string;
  status: Status;
  servico_id: string | null;
  variacao: string | null;
  valor_reserva?: number | null;
  servicos?: { nome: string; preco: number } | null;
}

const variacaoLabels: Record<string, string> = { mao: 'Mão', pe: 'Pé', ambos: 'Mão e Pé' };

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

const getBrasiliaTime = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));

const getTimeLabel = (data: string, hora: string): string => {
  const now = getBrasiliaTime();
  const [y, m, d] = data.split('-').map(Number);
  const [hh, mm] = hora.split(':').map(Number);
  const apptDate = new Date(y, m - 1, d, hh, mm);
  const diffMs = apptDate.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 0) return 'Já passou';
  if (diffMin <= 1) return 'Agora';
  if (diffMin < 60) return `Daqui a ${diffMin} min`;
  if (diffMin < 120) return `Daqui a 1h${diffMin - 60 > 0 ? ` ${diffMin - 60}min` : ''}`;

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (data === todayStr) return `Hoje às ${hora.slice(0, 5)}`;

  const [, mo, da] = data.split('-');
  return `${da}/${mo} às ${hora.slice(0, 5)}`;
};

const isPast = (data: string, hora: string): boolean => {
  const now = getBrasiliaTime();
  const [y, m, d] = data.split('-').map(Number);
  const [hh, mm] = hora.split(':').map(Number);
  const apptDate = new Date(y, m - 1, d, hh, mm);
  return apptDate.getTime() < now.getTime();
};

const AgendamentosManager = ({ profileId, onUpdate }: { profileId: string; onUpdate: () => void }) => {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [tab, setTab] = useState<'proximos' | 'historico'>('proximos');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => { fetchAgendamentos(); }, [profileId]);

  useEffect(() => {
    const channel = supabase
      .channel('agendamentos-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'agendamentos',
        filter: `manicure_id=eq.${profileId}`,
      }, () => {
        fetchAgendamentos();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profileId]);

  const fetchAgendamentos = async () => {
    await supabase
      .from('agendamentos')
      .update({ status: 'cancelado' } as any)
      .eq('manicure_id', profileId)
      .eq('status', 'pendente')
      .not('valor_reserva', 'is', null)
      .not('expira_em', 'is', null)
      .lt('expira_em', new Date().toISOString());

    const { data } = await supabase
      .from('agendamentos')
      .select('*, servicos(nome, preco)')
      .eq('manicure_id', profileId)
      .order('data', { ascending: true })
      .order('hora', { ascending: true });
    if (data) setAgendamentos(data as any);
  };

  const updateStatus = async (e: React.MouseEvent, id: string, status: Status) => {
    e.stopPropagation();
    const appt = agendamentos.find(a => a.id === id);
    const { error } = await supabase.from('agendamentos').update({ status }).eq('id', id);

    if (error) {
      toast.error(error.message);
    } else {
      let mensagem = `Status atualizado para ${statusLabels[status]}`;
      if (status === 'confirmado' && appt?.valor_reserva && appt.valor_reserva > 0) {
        mensagem = "Agendamento confirmado! O valor da taxa agora conta no faturamento.";
      }
      toast.success(mensagem);
      fetchAgendamentos();
      onUpdate();
    }
  };

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  const filteredAgendamentos = useMemo(() => {
    if (!searchTerm) return agendamentos;
    const lowerSearch = searchTerm.toLowerCase();
    return agendamentos.filter(a => {
      const servicoNome = (a as any).servico_nome_historico || a.servicos?.nome || '';
      return (
        a.cliente_nome.toLowerCase().includes(lowerSearch) ||
        servicoNome.toLowerCase().includes(lowerSearch)
      );
    });
  }, [agendamentos, searchTerm]);

  const { upcoming, past } = useMemo(() => {
    const upcoming: Agendamento[] = [];
    const past: Agendamento[] = [];
    for (const a of filteredAgendamentos) {
      if (a.status === 'concluido' || a.status === 'cancelado' || isPast(a.data, a.hora)) {
        past.push(a);
      } else {
        upcoming.push(a);
      }
    }
    past.reverse();
    return { upcoming, past };
  }, [filteredAgendamentos]);

  const renderRow = (a: Agendamento, index: number) => {
    const isNext = tab === 'proximos' && index === 0 && !searchTerm;
    return (
      <TableRow
        key={a.id}
        className={cn(
          'cursor-pointer hover:bg-secondary/50 transition-colors',
          isNext && 'border-l-4 border-l-primary bg-primary/5'
        )}
        onClick={() => navigate(`/admin/agendamentos/${a.id}`)}
      >
        <TableCell>
          <div>
            <p className="font-medium">{a.cliente_nome}</p>
            {a.cliente_telefone && <p className="text-xs text-muted-foreground">{a.cliente_telefone}</p>}
          </div>
        </TableCell>
        <TableCell>
          <div>
            <p>{(a as any).serviço_nome_histórico || (a as any).servico_nome_historico || a.servicos?.nome || '—'}</p>
            {a.variacao && (
              <Badge variant="outline" className="text-[10px] mt-0.5 border-primary/30 text-primary">
                {variacaoLabels[a.variacao] || a.variacao}
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell>
          <div>
            <p>{formatDate(a.data)}</p>
            {isNext && (
              <span className="text-xs font-medium text-primary">{getTimeLabel(a.data, a.hora)}</span>
            )}
          </div>
        </TableCell>
        <TableCell>{a.hora.slice(0, 5)}</TableCell>
        <TableCell><Badge variant="outline" className={statusColors[a.status]}>{statusLabels[a.status]}</Badge></TableCell>
        <TableCell>
          {a.status === 'pendente' && (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" title="Confirmar" onClick={(e) => updateStatus(e, a.id, 'confirmado')}><Check className="h-4 w-4 text-blue-600" /></Button>
              <Button variant="ghost" size="icon" title="Cancelar" onClick={(e) => updateStatus(e, a.id, 'cancelado')}><X className="h-4 w-4 text-destructive" /></Button>
            </div>
          )}
          {a.status === 'confirmado' && (
            <Button variant="ghost" size="icon" title="Concluir" onClick={(e) => updateStatus(e, a.id, 'concluido')}><CheckCircle className="h-4 w-4 text-emerald-600" /></Button>
          )}
        </TableCell>
      </TableRow>
    );
  };

  const renderMobileCard = (a: Agendamento, index: number) => {
    const isNext = tab === 'proximos' && index === 0 && !searchTerm;
    return (
      <div
        key={a.id}
        className={cn(
          'p-3 rounded-lg bg-secondary/30 space-y-1.5 cursor-pointer active:bg-secondary/50 transition-colors',
          isNext && 'ring-2 ring-primary/40 bg-primary/5'
        )}
        onClick={() => navigate(`/admin/agendamentos/${a.id}`)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isNext && <Badge className="gradient-rose text-primary-foreground text-[10px] px-1.5 py-0 border-0">Próximo</Badge>}
            <span className="font-medium text-sm truncate">{a.cliente_nome}</span>
          </div>
          <Badge variant="outline" className={statusColors[a.status] + ' text-xs'}>
            {statusLabels[a.status]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {(a as any).serviço_nome_histórico || (a as any).servico_nome_historico || a.servicos?.nome || '—'}
          {a.variacao ? ` (${variacaoLabels[a.variacao] || a.variacao})` : ''}
        </p>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{formatDate(a.data)} às {a.hora.slice(0, 5)}</p>
          {isNext && <span className="text-xs font-medium text-primary">{getTimeLabel(a.data, a.hora)}</span>}
        </div>
        <div className="flex gap-1 pt-1">
          {a.status === 'pendente' && (
            <>
              <Button variant="outline" size="sm" className="h-7 text-xs text-blue-600 border-blue-200" onClick={(e) => { e.stopPropagation(); updateStatus(e, a.id, 'confirmado'); }}>
                <Check className="h-3 w-3 mr-1" />Confirmar
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs text-destructive border-destructive/30" onClick={(e) => { e.stopPropagation(); updateStatus(e, a.id, 'cancelado'); }}>
                <X className="h-3 w-3 mr-1" />Cancelar
              </Button>
            </>
          )}
          {a.status === 'confirmado' && (
            <Button variant="outline" size="sm" className="h-7 text-xs text-emerald-600 border-emerald-200" onClick={(e) => { e.stopPropagation(); updateStatus(e, a.id, 'concluido'); }}>
              <CheckCircle className="h-3 w-3 mr-1" />Concluir
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="font-display">Agendamentos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou serviço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="proximos" className="gap-1.5">
              <Clock className="h-4 w-4" />
              Próximos ({upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-1.5">
              <History className="h-4 w-4" />
              Histórico ({past.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="proximos" className="mt-4">
            {upcoming.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhum agendamento encontrado.</p>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Serviço</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-32">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>{upcoming.map((a, i) => renderRow(a, i))}</TableBody>
                  </Table>
                </div>
                <div className="md:hidden space-y-3">{upcoming.map((a, i) => renderMobileCard(a, i))}</div>
              </>
            )}
          </TabsContent>

          <TabsContent value="historico" className="mt-4">
            {past.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhum agendamento no histórico.</p>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Serviço</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-32">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>{past.map((a, i) => renderRow(a, i))}</TableBody>
                  </Table>
                </div>
                <div className="md:hidden space-y-3">{past.map((a, i) => renderMobileCard(a, i))}</div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AgendamentosManager;