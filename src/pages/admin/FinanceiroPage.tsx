import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminContext } from '@/hooks/useAdminContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { DollarSign, TrendingUp, ChevronLeft, ChevronRight, ArrowRight, Search } from 'lucide-react';
import { format, parseISO, isSameMonth, subMonths, addMonths, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const FinanceiroPage = () => {
  const { profileId } = useAdminContext();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [allAppointments, setAllAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (profileId) fetchData();
  }, [profileId]);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*, servicos(preco)')
      .eq('manicure_id', profileId);

    if (!error && data) {
      setAllAppointments(data);
    }
    setLoading(false);
  };

  const getLocalDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = parseISO(dateStr);
    return startOfDay(date);
  };

  const stats = allAppointments.reduce((acc, a) => {
    const status = a.status?.toLowerCase() || "";

    if (status.includes('cancela') || status.includes('pendente') || status === 'aguardando') return acc;

    const taxa = Number(a.valor_reserva || 0);
    const total = Number(a.valor_historico || a.servicos?.preco || 0);
    const isConcluido = status.includes('conclui');

    const dataAgendamento = getLocalDate(a.data);
    const dataCriacao = getLocalDate(a.created_at) || dataAgendamento;
    const dataConclusao = getLocalDate(a.updated_at) || dataAgendamento;

    if (taxa > 0 && dataCriacao && isSameMonth(dataCriacao, currentMonth)) {
      acc.totalTaxas += taxa;
    }

    if (isConcluido && dataConclusao && isSameMonth(dataConclusao, currentMonth)) {
      acc.totalSaldos += (total - taxa);
      acc.concluidosCount += 1;
    }

    return acc;
  }, { totalTaxas: 0, totalSaldos: 0, concluidosCount: 0 });

  const filteredView = allAppointments.filter(a => {
    const status = a.status?.toLowerCase() || "";
    if (status.includes('cancela') || status.includes('pendente') || status === 'aguardando') return false;

    const dataAgendamento = getLocalDate(a.data);
    const dataCriacao = getLocalDate(a.created_at) || dataAgendamento;
    const dataConclusao = getLocalDate(a.updated_at) || dataAgendamento;

    const temTaxaNoMes = Number(a.valor_reserva || 0) > 0 && dataCriacao && isSameMonth(dataCriacao, currentMonth);
    const temConclusaoNoMes = status.includes('conclui') && dataConclusao && isSameMonth(dataConclusao, currentMonth);

    const matchesSearch = a.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.servico_nome_historico?.toLowerCase().includes(searchTerm.toLowerCase());

    return (temTaxaNoMes || temConclusaoNoMes) && matchesSearch;
  });

  const totalLucro = stats.totalTaxas + stats.totalSaldos;

  return (
    <div className="space-y-6 p-1">
      <h1 className="text-2xl font-display font-bold">Financeiro</h1>

      <div className="flex items-center justify-between bg-card border border-border p-2 rounded-xl shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}><ChevronLeft /></Button>
        <span className="font-semibold capitalize">{format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}</span>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}><ChevronRight /></Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-emerald-600 text-white border-none shadow-lg">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-white/20"><DollarSign className="h-6 w-6" /></div>
            <div>
              <p className="text-xs opacity-80 font-bold uppercase tracking-wider">Dinheiro em Caixa</p>
              <p className="text-3xl font-bold">R$ {totalLucro.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600"><TrendingUp /></div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Serviços Finalizados</p>
              <p className="text-2xl font-bold">{stats.concluidosCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente ou serviço..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card className="border-border/50">
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Entradas do Mês</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? <Skeleton className="h-40 w-full" /> : filteredView.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">Nenhuma entrada encontrada.</div>
          ) : (
            <div className="space-y-3">
              {filteredView.map(a => {
                const taxa = Number(a.valor_reserva || 0);
                const total = Number(a.valor_historico || a.servicos?.preco || 0);
                const status = a.status?.toLowerCase() || "";
                const dataAgendamento = getLocalDate(a.data);
                const dataCriacao = getLocalDate(a.created_at) || dataAgendamento;
                const dataConclusao = getLocalDate(a.updated_at) || dataAgendamento;

                const taxaNoMes = taxa > 0 && dataCriacao && isSameMonth(dataCriacao, currentMonth);
                const conclusaoNoMes = status.includes('conclui') && dataConclusao && isSameMonth(dataConclusao, currentMonth);

                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card cursor-pointer hover:bg-muted/50 transition-colors group"
                    onClick={() => navigate(`/admin/agendamentos/${a.id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm truncate">{a.cliente_nome}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                        {a.servico_nome_historico || 'Serviço'} · Agendado: {dataAgendamento ? format(dataAgendamento, 'dd/MM') : '--/--'}
                      </p>
                    </div>
                    <div className="text-right ml-4 flex items-center gap-3">
                      <div className="flex flex-col items-end gap-1">
                        {taxaNoMes && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                            Taxa: R$ {taxa.toFixed(2)}
                          </span>
                        )}
                        {conclusaoNoMes && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                            Saldo: R$ {(total - taxa).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceiroPage;