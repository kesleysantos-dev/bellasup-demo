import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabaseScoped } from '@/integrations/supabase/scopedClient';
import { useScopedAuth } from '@/contexts/ScopedAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { TrendingUp } from 'lucide-react';

const AffiliateRegister = () => {
  const navigate = useNavigate();
  const { refreshProfile } = useScopedAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) { toast.error('Informe seu nome'); return; }
    setLoading(true);

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const slug = `${nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${randomSuffix}`;

    const { data: authData, error } = await supabaseScoped.auth.signUp({
      email,
      password,
      options: {
        data: { nome, slug, is_affiliate: true },
        emailRedirectTo: `${window.location.origin}/afiliado`,
      },
    });

    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    if (authData?.user) {

      await supabaseScoped
        .from('profiles')
        .update({ is_affiliate: true, nome, slug })
        .eq('id', authData.user.id);

      await refreshProfile();

      toast.success('Conta de parceiro criada com sucesso!');
      navigate('/afiliado', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-slate-200 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-[-150px] right-[-150px] w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-150px] left-[-150px] w-[500px] h-[500px] bg-orange-600/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4 p-3 bg-gradient-to-br from-blue-600/20 to-orange-500/20 rounded-2xl border border-white/10 shadow-[0_0_20px_rgba(37,99,235,0.2)]">
            <TrendingUp className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-orange-400 leading-tight">
            Torne-se um parceiro e monetize sua rede
          </h1>
          <p className="text-slate-400 mt-3 text-sm">Crie sua conta VIP instantaneamente e receba seu link exclusivo.</p>
        </div>

        <Card className="bg-[#0a0a0c]/80 border border-slate-800 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl rounded-xl">
          <CardContent className="pt-8 pb-6 px-6 sm:px-8">
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="nome" className="text-slate-300">Seu Nome Completo</Label>
                <Input id="nome" value={nome} onChange={e => setNome(e.target.value)} required placeholder="João Afiliado" className="bg-black/50 border-slate-800 focus:border-blue-500/50 text-slate-200 h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">E-mail Profissional</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="parceiro@email.com" className="bg-black/50 border-slate-800 focus:border-blue-500/50 text-slate-200 h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Senha Segura</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" className="bg-black/50 border-slate-800 focus:border-blue-500/50 text-slate-200 h-11" />
              </div>

              <Button type="submit" className="w-full h-12 bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-500 hover:to-orange-400 text-white font-bold shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all border-0 mt-2" disabled={loading}>
                {loading ? 'Preparando painel...' : 'Ativar Conta de Parceiro'}
              </Button>

              <div className="text-center pt-3 text-sm text-slate-400">
                Já é um parceiro?{' '}
                <Link to="/afiliado/login" className="text-blue-400 hover:text-blue-300 font-semibold underline-offset-4 hover:underline transition-all">
                  Acesse aqui
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AffiliateRegister;
