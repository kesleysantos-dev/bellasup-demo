import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const AccessDenied = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
        <div className="mx-auto w-20 h-20 rounded-full gradient-rose-subtle flex items-center justify-center">
          <ShieldX className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-display font-bold text-foreground">
          Ops! Acesso Negado
        </h1>
        <p className="text-muted-foreground text-lg">
          Você não tem permissão para acessar esta área.
        </p>
        <Button
          onClick={() => navigate('/admin')}
          className="gradient-rose text-primary-foreground px-8 py-3 text-base"
        >
          Voltar ao meu Dashboard
        </Button>
      </div>
    </div>
  );
};

export default AccessDenied;
