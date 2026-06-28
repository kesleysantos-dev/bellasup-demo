import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Copy, Clock, MessageCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PaymentScreenProps {
  serviceName: string;
  variacao: string | null;
  date: Date;
  time: string;
  clienteNome: string;
  totalPrice: number;
  reservationPercent: number;
  chavePix: string;
  tipoChavePix: string;
  expiresAt: Date;
  profileTelefone: string;
  profileNome: string;
}

const PaymentScreen = ({
  serviceName,
  variacao,
  date,
  time,
  clienteNome,
  totalPrice,
  reservationPercent,
  chavePix,
  tipoChavePix,
  expiresAt,
  profileTelefone,
  profileNome,
}: PaymentScreenProps) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [expired, setExpired] = useState(false);

  const reservationValue = (totalPrice * reservationPercent) / 100;

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(diff);
      if (diff <= 0) setExpired(true);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const copyPix = useCallback(() => {
    navigator.clipboard.writeText(chavePix);
    toast.success('Chave Pix copiada!');
  }, [chavePix]);

  const variacaoLabels: Record<string, string> = { mao: 'Mão', pe: 'Pé', ambos: 'Mão e Pé' };
  const variacaoText = variacao ? ` (${variacaoLabels[variacao] || variacao})` : '';

  const sendWhatsApp = () => {
    let phone = profileTelefone.replace(/\D/g, '');
    if (!phone.startsWith('55')) phone = '55' + phone;

    const dataFormatted = format(new Date(date), "dd/MM/yyyy");

    const message = `Olá ${profileNome}! 👋\n\n` +
      `Confirmando meu agendamento:\n` +
      `👤 *Nome:* ${clienteNome}\n` +
      `💅 *Serviço:* ${serviceName}${variacaoText}\n` +
      `📅 *Data:* ${dataFormatted}\n` +
      `⏰ *Horário:* ${time}\n` +
      `💰 *Valor Total:* R$ ${totalPrice.toFixed(2)}\n` +
      `💳 *Reserva (${reservationPercent}%):* R$ ${reservationValue.toFixed(2)}\n\n` +
      `Envio o comprovante em anexo. muito obrigado(a)!`;

    const finalUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;

    const win = window.open(finalUrl, '_blank');
    if (win) {
      win.focus();
    } else {
      window.location.href = finalUrl;
    }
  };

  if (expired) {
    return (
      <Card className="max-w-md w-full mx-auto shadow-rose border-border/50 animate-fade-in">
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-display font-bold">Tempo Esgotado</h2>
          <p className="text-muted-foreground text-sm">
            O prazo para pagamento da reserva expirou. O horário foi liberado.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md w-full mx-auto shadow-rose border-border/50 animate-fade-in">
      <CardContent className="p-6 space-y-5">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200">
            <Clock className="h-4 w-4 text-amber-600" />
            <span className="text-lg font-bold font-mono text-amber-800">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-secondary/50 space-y-2">
          <p className="font-display font-semibold">Resumo do Agendamento</p>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>👤 {clienteNome}</p>
            <p>💅 {serviceName}{variacaoText}</p>
            <p>📅 {format(new Date(date), "dd 'de' MMMM", { locale: ptBR })} às {time}</p>
          </div>
          <div className="pt-2 border-t border-border/50 space-y-1">
            <div className="flex justify-between text-sm font-bold text-primary">
              <span>Valor da Reserva</span>
              <span>R$ {reservationValue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-display font-semibold text-sm">Pagamento via Pix</p>
          <div className="p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 space-y-2">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Chave Pix ({tipoChavePix})</p>
              <p className="font-mono font-medium text-sm mt-0.5 break-all">{chavePix}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyPix}
              className="w-full border-primary/30 text-primary hover:bg-primary/10"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar Chave Pix
            </Button>
          </div>
        </div>

        <Button
          onClick={sendWhatsApp}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-lg py-6"
        >
          <MessageCircle className="h-5 w-5 mr-2" />
          Enviar Comprovante
        </Button>
      </CardContent>
    </Card>
  );
};

export default PaymentScreen;