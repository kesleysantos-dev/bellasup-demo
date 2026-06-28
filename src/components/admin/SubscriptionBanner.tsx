import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SubscriptionBannerProps {
  profileId: string;
}

const SubscriptionBanner = ({ profileId }: SubscriptionBannerProps) => {
  const navigate = useNavigate();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) return;

    Promise.all([
      supabase.from('profiles').select('plano_ativo, expires_at').eq('id', profileId).single(),
      supabase.from('system_settings').select('whatsapp_suporte').limit(1).single(),
    ]).then(([profileRes]) => {
      const p = profileRes.data as any;
      if (!p) return;

      setIsPaid(!!p.plano_ativo);
      setExpiresAt(p.expires_at);

      if (p.expires_at) {
        const diff = new Date(p.expires_at).getTime() - Date.now();
        setDaysLeft(Math.ceil(diff / (1000 * 60 * 60 * 24)));
      }
    });
  }, [profileId]);

  const handleRenew = () => {
    navigate('/assinatura');
  };

  if (!isPaid) return null;
  if (daysLeft === null) return null;

  if (daysLeft > 3) {
    const formattedDate = expiresAt
      ? new Date(expiresAt).toLocaleDateString('pt-BR')
      : '';
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
        <Clock className="h-4 w-4 shrink-0" />
        <span>Sua assinatura está ativa até <strong>{formattedDate}</strong></span>
      </div>
    );
  }

  if (daysLeft > 0) {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
        <div className="flex items-center gap-2 flex-1">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            {daysLeft === 1
              ? <strong>Atenção: Seu plano vence hoje! Evite o bloqueio do sistema realizando a renovação agora.</strong>
              : <>Seu plano mensal vence em <strong>{daysLeft} dias</strong>. Garanta a continuidade dos seus agendamentos renovando sua assinatura!</>
            }
          </span>
        </div>
        <Button size="sm" onClick={handleRenew} className="gradient-rose text-primary-foreground shrink-0">
          Assine Agora
        </Button>
      </div>
    );
  }

  return null;
};

export default SubscriptionBanner;