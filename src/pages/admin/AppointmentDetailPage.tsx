import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChevronLeft,
  Calendar,
  Clock,
  User,
  Phone,
  Scissors,
  DollarSign,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Status = Database['public']['Enums']['status_agendamento'];

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

const AppointmentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile: authProfile, user } = useAuth();
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchAppointment = async () => {
    try {
      const { data, error } = await supabase
        .from('agendamentos')
        .select('*, servicos(nome, preco, duracao)')
        .eq('id', id)
        .single();

      if (error) throw error;
      setAppointment(data);
    } catch (error: any) {
      toast.error('Erro ao carregar detalhes');
      navigate('/admin/agendamentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointment();
  }, [id]);

  const updateStatus = async (newStatus: Status) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: newStatus } as any)
        .eq('id', id);

      if (error) throw error;

      let msg = `Agendamento ${statusLabels[newStatus].toLowerCase()}!`;
      if (newStatus === 'confirmado' && appointment?.valor_reserva > 0) {
        msg = 'Confirmado! O valor da taxa foi somado ao faturamento.';
      }

      toast.success(msg);
      fetchAppointment();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdating(false);
    }
  };

  const openWhatsApp = () => {
    if (!appointment?.cliente_telefone) return;
    let cleanPhone = appointment.cliente_telefone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('55')) {
      cleanPhone = `55${cleanPhone}`;
    }
    const serviceName = appointment.servico_nome_historico || appointment.servicos?.nome || 'Serviço';
    const dateFormatted = new Date(appointment.data + 'T12:00:00').toLocaleDateString('pt-BR');
    const timeFormatted = appointment.hora.slice(0, 5);

    const nomeEstabelecimento = authProfile?.nome || user?.user_metadata?.nome || 'nosso espaço';

    const message = `_Olá, ${appointment.cliente_nome}! Tudo bem?_ 😊\n\n_Passando para lembrar do seu agendamento aqui na *${nomeEstabelecimento}*._ ✨\n\n📍 *${serviceName}*\n📅 ${dateFormatted} às ${timeFormatted}h\n\n_Estamos preparando tudo para te receber!_ 💅💖\n\n_Caso precise de alguma informação, pode falar por aqui._`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-display font-bold">Detalhes do Agendamento</h1>
      </div>

      <div className="space-y-4">
        <Badge className={cn(statusColors[appointment.status as Status], "px-3 py-1 text-xs")}>
          {statusLabels[appointment.status as Status]}
        </Badge>

        <div className="grid gap-4">
          <DetailCard icon={User} label="Cliente" value={appointment.cliente_nome} />

          <DetailCard icon={Phone} label="Telefone" value={appointment.cliente_telefone} />

          <DetailCard icon={Scissors} label="Serviço" value={appointment.servico_nome_historico || appointment.servicos?.nome} />

          <DetailCard
            icon={DollarSign}
            label="Preço"
            value={`R$ ${Number(appointment.valor_historico ?? appointment.servicos?.preco ?? 0).toFixed(2)}`}
          />

          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/10 border border-border/50">
            <div className="p-2 rounded-full bg-amber-100/50">
              <DollarSign className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Taxa de Reserva</p>
              <p className="text-sm font-semibold">
                {appointment?.valor_reserva && Number(appointment.valor_reserva) > 0
                  ? `R$ ${Number(appointment.valor_reserva).toFixed(2)}`
                  : "—"}
              </p>
            </div>
          </div>

          <DetailCard
            icon={Calendar}
            label="Data"
            value={new Date(appointment.data + 'T12:00:00').toLocaleDateString('pt-BR')}
          />

          <DetailCard icon={Clock} label="Hora" value={appointment.hora.slice(0, 5)} />
        </div>

        <p className="text-sm text-muted-foreground px-1">
          Duração estimada: <span className="font-medium text-foreground">{appointment.servicos?.duracao || 0} min</span>
        </p>

        <div className="pt-4 flex flex-col gap-3">
          <div className="flex gap-3">
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              disabled={updating || appointment.status === 'concluido'}
              onClick={() => updateStatus('concluido')}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" /> Concluir
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
              disabled={updating || appointment.status === 'cancelado'}
              onClick={() => updateStatus('cancelado')}
            >
              <XCircle className="h-4 w-4 mr-2" /> Cancelar
            </Button>
          </div>

          <Button variant="outline" className="w-full bg-emerald-700 text-white hover:bg-emerald-800 border-emerald-700" onClick={openWhatsApp}>
            <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
          </Button>

          {appointment.status === 'pendente' && (
            <Button className="w-full gradient-rose" onClick={() => updateStatus('confirmado')} disabled={updating}>
              Confirmar Agendamento
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const DetailCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/10 border border-border/50">
    <div className="p-2 rounded-full bg-background border border-border/50">
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value || '—'}</p>
    </div>
  </div>
);

export default AppointmentDetailPage;