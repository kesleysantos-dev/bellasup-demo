import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Sparkles, MessageCircle, LogOut, Copy, CheckCircle,
  Calendar, Users, ShieldCheck, BarChart3, Link2, Crown
} from 'lucide-react';

const benefits = [
  { icon: Calendar, title: 'Agenda Online 24h', desc: 'Suas clientes marcam horário mesmo enquanto você dorme.' },
  { icon: Users, title: 'Gestão de Clientes', desc: 'Histórico completo e contatos organizados.' },
  { icon: ShieldCheck, title: 'Fim dos "Bolos"', desc: 'Controle de sinal (Pix) para garantir o comparecimento.' },
  { icon: BarChart3, title: 'Painel Financeiro', desc: 'Veja quanto você fatura por dia, semana e mês.' },
  { icon: Link2, title: 'Link Personalizado', desc: 'Seu próprio site profissional para divulgar no Instagram.' },
];

const Assinatura = () => {
  const { user, loading, profileId, signOut } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [whatsapp, setWhatsapp] = useState('5585981049964');
  const [planPrice, setPlanPrice] = useState(50);
  const [chavePix, setChavePix] = useState('');
  const [userName, setUserName] = useState('');
  const [isTrial, setIsTrial] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate('/auth', { replace: true }); return; }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!profileId) return;

    Promise.all([
      supabase.from('profiles').select('plano_ativo, expires_at, created_at, is_active, nome').eq('id', profileId).single(),
      supabase.from('system_settings').select('whatsapp_suporte, valor_plano, chave_pix_suporte').limit(1).single(),
    ]).then(([profileRes, settingsRes]) => {
      const p = profileRes.data as any;
      const s = settingsRes.data as any;

      if (s?.whatsapp_suporte) setWhatsapp(s.whatsapp_suporte);
      if (s?.valor_plano) setPlanPrice(s.valor_plano);
      if (s?.chave_pix_suporte) setChavePix(s.chave_pix_suporte);

      if (p) {
        setUserName(p.nome || '');
        const isPaid = !!p.plano_ativo;
        setIsTrial(!isPaid);
      }
      setChecked(true);
    });
  }, [profileId, navigate]);

  const handleCopyPix = async () => {
    if (!chavePix) {
      toast.error('Chave Pix não configurada. Entre em contato pelo WhatsApp.');
      return;
    }
    await navigator.clipboard.writeText(chavePix);
    setCopied(true);
    toast.success('Chave Pix copiada!');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleWhatsApp = () => {
    const num = whatsapp.replace(/\D/g, '');
    const clientName = userName || 'Não informado';
    const clientEmail = user?.email || 'Não informado';

    const msg = encodeURIComponent(
      `Olá, Fiz o pagamento de R$ ${planPrice.toFixed(2)}. Segue o comprovante para liberar meu acesso ao BellasUp.\n\n` +
      `*Dados para ativação:*\n` +
      `Nome: ${clientName}\n` +
      `E-mail: ${clientEmail}`
    );
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
  };

  if (loading || !checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Sparkles className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div className="text-center space-y-1.5">
          <div className="mx-auto w-14 h-14 rounded-full gradient-rose flex items-center justify-center shadow-lg">
            <Crown className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">
            {isTrial ? 'Ative seu plano mensal' : 'Hora de renovar seu acesso!'}
          </h1>
          <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">
            {isTrial
              ? 'Desbloqueie tudo e continue recebendo agendamentos.'
              : 'Renove agora para continuar gerenciando sua agenda.'}
          </p>
        </div>

        <Card className="border-primary/20 shadow-lg">
          <CardContent className="p-5 space-y-4">
            <div className="text-center">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Investimento mensal</span>
              <div className="mt-1">
                <span className="text-4xl font-display font-bold text-primary">
                  R$ {planPrice.toFixed(2)}
                </span>
                <span className="text-muted-foreground text-sm"> / mês</span>
              </div>
            </div>

            {chavePix && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Chave Pix para pagamento:</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-secondary rounded-lg px-3 py-2.5 text-sm text-foreground font-mono truncate border border-border">
                    {chavePix}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyPix}
                    className="shrink-0 border-primary/30 hover:bg-primary/10"
                  >
                    {copied ? <CheckCircle className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4 text-primary" />}
                  </Button>
                </div>
              </div>
            )}

            {!chavePix && (
              <p className="text-center text-xs text-muted-foreground">
                Solicite a chave Pix pelo WhatsApp abaixo.
              </p>
            )}

            <Button
              onClick={handleWhatsApp}
              className="w-full h-auto py-4 px-4 gradient-rose text-primary-foreground rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-center whitespace-normal leading-tight"
            >
              <MessageCircle className="h-5 w-5 mr-2 shrink-0" />
              <span className="font-bold text-base">
                Enviar comprovante agora
              </span>
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Você será redirecionado(a) para o WhatsApp do suporte
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-lg overflow-hidden">
          <div className="gradient-rose px-4 py-2.5">
            <h2 className="text-sm font-bold text-primary-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> O que você desbloqueia
            </h2>
          </div>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-3 px-4 py-2.5">
                  <div className="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <b.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-foreground">{b.title}</span>
                    <p className="text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="text-center pb-4">
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-1" /> Sair da conta
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Assinatura;