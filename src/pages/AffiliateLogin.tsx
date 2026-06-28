import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabaseScoped } from '@/integrations/supabase/scopedClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { TrendingUp, Sparkles } from 'lucide-react';

const AffiliateLogin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabaseScoped.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    
    if (error) {
      toast.error('Combinação de e-mail e senha inválida.');
    } else {
      toast.success('Bem-vindo de volta ao seu painel!');
      navigate('/afiliado');
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-slate-200 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-[-150px] left-[-150px] w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-150px] right-[-150px] w-[500px] h-[500px] bg-orange-600/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4 p-3 bg-gradient-to-br from-blue-600/20 to-orange-500/20 rounded-2xl border border-white/10 shadow-[0_0_20px_rgba(37,99,235,0.2)]">
            <TrendingUp className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-orange-400 leading-tight">
            Painel do Parceiro
          </h1>
          <p className="text-slate-400 mt-3 text-sm">Faça login e impulsione suas comissões hoje.</p>
        </div>

        <Card className="bg-[#0a0a0c]/80 border border-slate-800 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl rounded-xl">
          <CardContent className="pt-8 pb-6 px-6 sm:px-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">E-mail Profissional</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="parceiro@email.com" className="bg-black/50 border-slate-800 focus:border-blue-500/50 text-slate-200 h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Senha</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="bg-black/50 border-slate-800 focus:border-blue-500/50 text-slate-200 h-11" />
              </div>
              
              <Button type="submit" className="w-full h-12 bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all border border-slate-700 mt-2" disabled={loading}>
                {loading ? 'Acessando sistema...' : 'Entrar na Conta'}
              </Button>

              <div className="text-center pt-3 text-sm text-slate-400">
                Ainda não é parceiro?{' '}
                <Link to="/afiliado/cadastro" className="text-orange-400 hover:text-orange-300 font-semibold underline-offset-4 hover:underline transition-all">
                  Cadastre-se agora
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-12 text-center">
          <Link to="/auth" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors">
            <Sparkles className="h-3.5 w-3.5" /> Sou um profissional e quero gerenciar meu negócio
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AffiliateLogin;
