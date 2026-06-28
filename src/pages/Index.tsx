import { useEffect } from 'react';
import { Sparkles, Calendar, Clock, Star, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { useNavigate, useSearchParams } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    console.log("Tentando capturar ref da URL:", ref);

    if (ref) {
      localStorage.setItem('affiliate_ref', ref);
      console.log("Sucesso! Salvo no LocalStorage:", ref);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden max-w-full">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-rose opacity-90" />
        <div className="relative container py-20 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
            <span className="text-sm text-primary-foreground font-medium">Gestão inteligente para Salões de Beleza</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold text-primary-foreground mb-4">
            BellasUp
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/85 max-w-xl mx-auto mb-8">
            Simplifique sua agenda, encante suas clientes.
            O sistema completo de agendamento e gestão para profissionais de estética.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/auth')}
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 text-base px-8"
            >
              Começar agora <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="container py-20">
        <h2 className="text-3xl font-display font-bold text-center mb-12">Tudo que você precisa</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard icon={Calendar} title="Agendamento Online" desc="Link exclusivo para suas clientes agendarem 24h. Sem WhatsApp, sem confusão." />
          <FeatureCard icon={Clock} title="Gestão de Horários" desc="Configure seus dias e horários de atendimento. O sistema cuida da disponibilidade." />
          <FeatureCard icon={Star} title="Dashboard Completo" desc="Métricas de faturamento, agendamentos e clientes em tempo real." />
        </div>
      </section>

      {/* CTA */}
      <section className="gradient-rose-subtle py-16">
        <div className="container text-center">
          <h2 className="text-3xl font-display font-bold mb-4">Pronta para organizar sua agenda?</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">Crie sua conta gratuitamente e comece a receber agendamentos hoje mesmo.</p>
          <Button size="lg" onClick={() => navigate('/auth')} className="gradient-rose text-primary-foreground text-base px-8">
            Criar minha conta <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-display font-bold text-gradient-rose">BellasUp</span>
          </div>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} BellasUp. Feito com 💅 para Salões de beleza.</p>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) => (
  <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-rose/10 hover:shadow-rose/30 transition-shadow text-center">
    <div className="mx-auto w-14 h-14 rounded-xl gradient-rose-subtle flex items-center justify-center mb-4">
      <Icon className="h-6 w-6 text-primary" />
    </div>
    <h3 className="text-lg font-display font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm">{desc}</p>
  </div>
);

export default Index;
