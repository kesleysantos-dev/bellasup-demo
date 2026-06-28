import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TrialCTAProps {
  profileId: string;
}

const TrialCTA = ({ profileId }: TrialCTAProps) => {
  const [isTrial, setIsTrial] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!profileId) return;
    supabase
      .from('profiles')
      .select('plano_ativo')
      .eq('id', profileId)
      .single()
      .then(({ data }) => {
        if (data && !data.plano_ativo) setIsTrial(true);
      });
  }, [profileId]);

  if (!isTrial) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5 p-5 sm:p-6">
      <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
      <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-accent/10 blur-2xl" />
      
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-display font-bold text-foreground">
              Período de teste ativo
            </h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Gostando da experiência? Ative seu plano completo hoje mesmo e garanta acesso ilimitado.
          </p>
        </div>
        <Button
          onClick={() => navigate('/assinatura')}
          className="shrink-0 bg-gradient-to-r from-primary to-[hsl(350_40%_50%)] hover:from-primary/90 hover:to-[hsl(350_40%_45%)] text-primary-foreground font-display font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
          size="lg"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Assine agora
        </Button>
      </div>
    </div>
  );
};

export default TrialCTA;
