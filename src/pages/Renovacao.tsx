import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sparkles, MessageCircle, LogOut } from 'lucide-react';

const Renovacao = () => {
  const { user, loading, profileId, signOut } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [whatsapp, setWhatsapp] = useState('5585981049964');
  const [planPrice, setPlanPrice] = useState(50);
  const [isTrial, setIsTrial] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate('/auth', { replace: true }); return; }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!profileId) return;

    Promise.all([
      supabase.from('profiles').select('plano_ativo, expires_at, created_at, is_active').eq('id', profileId).single(),
      supabase.from('system_settings').select('whatsapp_suporte, valor_plano').limit(1).single(),
    ]).then(([profileRes, settingsRes]) => {
      const p = profileRes.data as any;
      const s = settingsRes.data as any;

      if (s?.whatsapp_suporte) setWhatsapp(s.whatsapp_suporte);
      if (s?.valor_plano) setPlanPrice(s.valor_plano);

      if (p) {
        const isInactive = p.is_active === false;
        const now = new Date();
        const expiresAt = p.expires_at ? new Date(p.expires_at) : null;
        const isPaid = !!p.plano_ativo;

        const isExpired = expiresAt
          ? now > expiresAt
          : !isPaid && (now.getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60) > 24;

        if (!isInactive && !isExpired) {
          navigate('/admin', { replace: true });
          return;
        }

        setIsTrial(!isPaid);
      }
      setChecked(true);
    });
  }, [profileId, navigate]);

  if (loading || !checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Sparkles className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-8 text-center space-y-6 animate-fade-in">
        <div className="mx-auto w-20 h-20 rounded-full gradient-rose flex items-center justify-center">
          <Sparkles className="h-10 w-10 text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-display font-bold text-foreground">
          Sua jornada com o BellasUp continua aqui!
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          {isTrial
            ? 'O seu período de teste gratuito chegou ao fim. Para continuar recebendo agendamentos automáticos e organizando sua agenda, assine seu plano mensal agora.'
            : 'O seu período de acesso chegou ao fim. Para continuar recebendo agendamentos automáticos e organizando sua agenda, renove seu plano mensal agora.'}
        </p>
        <div className="py-2">
          <span className="text-3xl font-display font-bold text-primary">
            R$ {planPrice.toFixed(2)}
          </span>
          <span className="text-muted-foreground text-sm"> / mês</span>
        </div>
        <Button
          onClick={() => {
            const num = whatsapp.replace(/\D/g, '');
            const msg = encodeURIComponent('Olá Kesley! Meu plano no BellasUp venceu e quero realizar a renovação mensal para continuar usando o sistema.');
            window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
          }}
          className="w-full gradient-rose text-primary-foreground text-lg py-6 rounded-xl shadow-lg"
        >
          <MessageCircle className="h-5 w-5 mr-2" />
          Ativar meu acesso via WhatsApp
        </Button>
        <p className="text-xs text-muted-foreground">
          Você será redirecionado(a) para o WhatsApp
        </p>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-1" />Sair da conta
        </Button>
      </div>
    </div>
  );
};

export default Renovacao;
