import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const PlanBlocked = () => {
  const { profileId } = useAuth();
  const [whatsapp, setWhatsapp] = useState('5585981049964');
  const [valor, setValor] = useState(49.9);
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [settingsRes, profileRes] = await Promise.all([
        (supabase.from('system_settings' as any) as any)
          .select('whatsapp_suporte, valor_plano')
          .limit(1)
          .single(),
        profileId
          ? supabase.from('profiles').select('plano_ativo').eq('id', profileId).single()
          : null,
      ]);

      if (settingsRes.data) {
        setWhatsapp(settingsRes.data.whatsapp_suporte || '5585981049964');
        setValor(settingsRes.data.valor_plano || 49.9);
      }

      if (profileRes?.data) {
        setIsPaid(!!(profileRes.data as any).plano_ativo);
      }
    };
    fetchData();
  }, [profileId]);

  const handleSubscribe = () => {
    const num = whatsapp.replace(/\D/g, '');
    const msg = isPaid
      ? encodeURIComponent('*Olá, quero renovar meu plano mensal BellasUp!*')
      : encodeURIComponent('*Olá, Quero assinar meu plano mensal BellasUp*');
    window.location.href = `https://wa.me/${num}?text=${msg}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full shadow-rose border-border/50 animate-fade-in">
        <CardContent className="p-8 text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full gradient-rose flex items-center justify-center">
            <Sparkles className="h-10 w-10 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-display font-bold">
            {isPaid
              ? 'O seu período de assinatura chegou ao fim'
              : 'Sua experiência BellasUp está apenas começando'}
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            {isPaid
              ? 'Esperamos que o BellasUp tenha ajudado seu negócio a crescer neste mês! Para continuar acessando sua agenda e recebendo agendamentos, clique no botão abaixo para renovar seu plano.'
              : 'Assine o plano mensal para continuar elevando seu negócio com agendamentos online, ranking de serviços e muito mais.'}
          </p>
          <Button
            onClick={handleSubscribe}
            className="w-full gradient-rose text-primary-foreground text-lg py-6 rounded-xl shadow-lg"
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            {isPaid ? 'Falar com Suporte para Renovação' : `Assinar Plano Mensal - R$ ${valor.toFixed(2)}`}
          </Button>
          <p className="text-xs text-muted-foreground">
            Você será redirecionado(a) para o WhatsApp
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlanBlocked;
