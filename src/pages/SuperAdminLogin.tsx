import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseScoped } from '@/integrations/supabase/scopedClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Shield, Lock } from 'lucide-react';

const SuperAdminLogin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Sign in via scoped client — does not affect the main /admin session
    const { data: authData, error: authError } = await supabaseScoped.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      setLoading(false);
      toast.error(authError?.message || 'Erro ao fazer login');
      return;
    }

    // Check super_admin role
    const { data: roleData } = await (supabaseScoped as any)
      .from('user_roles')
      .select('role')
      .eq('user_id', authData.user.id)
      .eq('role', 'super_admin')
      .maybeSingle();

    if (!roleData) {
      // Not a super admin — sign out immediately
      await supabaseScoped.auth.signOut();
      setLoading(false);
      toast.error('Acesso negado: esta área é restrita a administradores do sistema.');
      return;
    }

    setLoading(false);
    toast.success('Bem-vindo, Super Admin!');
    navigate('/super-admin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(220,15%,8%)] p-4 overflow-x-hidden max-w-full">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-[hsl(220,15%,14%)] border border-[hsl(220,10%,25%)] flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-[hsl(210,60%,55%)]" />
          </div>
          <h1 className="text-2xl font-bold text-[hsl(220,10%,90%)] tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
            Painel Administrativo
          </h1>
          <p className="text-sm text-[hsl(220,8%,50%)] mt-1">Acesso restrito ao sistema</p>
        </div>

        <Card className="bg-[hsl(220,15%,12%)] border-[hsl(220,10%,20%)] shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-[hsl(220,10%,80%)] flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              <Lock className="h-4 w-4" />
              Login Super Admin
            </CardTitle>
            <CardDescription className="text-[hsl(220,8%,45%)]">
              Insira suas credenciais de administrador
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sa-email" className="text-[hsl(220,10%,70%)]">E-mail</Label>
                <Input
                  id="sa-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="admin@sistema.com"
                  className="bg-[hsl(220,15%,10%)] border-[hsl(220,10%,22%)] text-[hsl(220,10%,90%)] placeholder:text-[hsl(220,8%,35%)] focus-visible:ring-[hsl(210,60%,55%)]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sa-password" className="text-[hsl(220,10%,70%)]">Senha</Label>
                <Input
                  id="sa-password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="bg-[hsl(220,15%,10%)] border-[hsl(220,10%,22%)] text-[hsl(220,10%,90%)] placeholder:text-[hsl(220,8%,35%)] focus-visible:ring-[hsl(210,60%,55%)]"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[hsl(210,60%,50%)] hover:bg-[hsl(210,60%,45%)] text-white font-medium"
                disabled={loading}
              >
                {loading ? 'Verificando...' : 'Acessar Sistema'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-[hsl(220,8%,35%)] mt-6">
          BellasUp · Sistema de Gestão
        </p>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
