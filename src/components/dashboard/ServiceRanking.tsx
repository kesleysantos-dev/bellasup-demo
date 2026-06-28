import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Trophy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface RankItem {
  id: string;
  nome: string;
  currentCount: number;
  previousCount: number;
  growth: number; // percentage
}

const ServiceRanking = ({ profileId }: { profileId: string }) => {
  const [ranking, setRanking] = useState<RankItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRanking();
  }, [profileId]);

  const fetchRanking = async () => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    const [servRes, currentRes, prevRes] = await Promise.all([
      supabase.from('servicos').select('id, nome').eq('manicure_id', profileId),
      supabase.from('agendamentos').select('servico_id').eq('manicure_id', profileId).neq('status', 'cancelado').gte('data', currentMonthStart),
      supabase.from('agendamentos').select('servico_id').eq('manicure_id', profileId).neq('status', 'cancelado').gte('data', previousMonthStart).lte('data', previousMonthEnd),
    ]);

    if (!servRes.data) { setLoading(false); return; }

    const currentCounts: Record<string, number> = {};
    const prevCounts: Record<string, number> = {};
    currentRes.data?.forEach((a: any) => { if (a.servico_id) currentCounts[a.servico_id] = (currentCounts[a.servico_id] || 0) + 1; });
    prevRes.data?.forEach((a: any) => { if (a.servico_id) prevCounts[a.servico_id] = (prevCounts[a.servico_id] || 0) + 1; });

    const items: RankItem[] = servRes.data.map((s: any) => {
      const curr = currentCounts[s.id] || 0;
      const prev = prevCounts[s.id] || 0;
      const growth = prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;
      return { id: s.id, nome: s.nome, currentCount: curr, previousCount: prev, growth };
    });

    items.sort((a, b) => b.currentCount - a.currentCount);
    setRanking(items);
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader><CardTitle className="font-display text-base">Ranking de Serviços</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </CardContent>
      </Card>
    );
  }

  if (ranking.length === 0) return null;

  const chartData = ranking.filter(r => r.currentCount > 0).slice(0, 6).map(r => ({
    name: r.nome.length > 12 ? r.nome.slice(0, 12) + '…' : r.nome,
    agendamentos: r.currentCount,
  }));

  const barColors = ['hsl(350 35% 58%)', 'hsl(350 30% 65%)', 'hsl(350 25% 72%)', 'hsl(35 50% 60%)', 'hsl(35 40% 68%)', 'hsl(35 30% 75%)'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="border-border/50">
          <CardHeader><CardTitle className="font-display text-base">Ranking de Serviços (mês atual)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(v: number) => [v, 'Agendamentos']} />
                <Bar dataKey="agendamentos" radius={[0, 6, 6, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={barColors[i % barColors.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* List with growth indicators */}
      <Card className="border-border/50">
        <CardHeader><CardTitle className="font-display text-base">Crescimento vs Mês Anterior</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {ranking.map((r, i) => (
            <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30">
              <span className="text-sm font-bold text-muted-foreground w-6 text-center">
                {i === 0 ? <Trophy className="h-4 w-4 text-amber-500 mx-auto" /> : `${i + 1}º`}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.nome}</p>
                <p className="text-xs text-muted-foreground">{r.currentCount} este mês · {r.previousCount} mês anterior</p>
              </div>
              <GrowthBadge growth={r.growth} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

const GrowthBadge = ({ growth }: { growth: number }) => {
  if (growth > 0) {
    return (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 shrink-0">
        <TrendingUp className="h-3 w-3" />+{Math.round(growth)}%
      </Badge>
    );
  }
  if (growth < 0) {
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1 shrink-0">
        <TrendingDown className="h-3 w-3" />{Math.round(growth)}%
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-secondary text-muted-foreground gap-1 shrink-0">
      <Minus className="h-3 w-3" />0%
    </Badge>
  );
};

export default ServiceRanking;
