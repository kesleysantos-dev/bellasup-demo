import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Calendar, Sparkle, ShieldCheck, CheckCircle2, LayoutDashboard, Zap, UserPlus, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Variantes para a animação em cascata (Stagger)
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1, // Atraso de 0.1s entre cada card
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    },
  };

  const checkExpiryAndNavigate = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('plano_ativo, expires_at, created_at, is_active')
      .eq('user_id', userId)
      .single();

    if (profile) {
      const p = profile as any;
      const isInactive = p.is_active === false;
      const now = new Date();
      const expiresAt = p.expires_at ? new Date(p.expires_at) : null;
      const isPaid = !!p.plano_ativo;

      const isExpired = expiresAt
        ? now > expiresAt
        : !isPaid && (now.getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60) > 24;

      if (isInactive || isExpired) {
        toast.warning(isInactive ? 'Conta desativada.' : 'Assinatura vencida. Redirecionando...');
        navigate('/assinatura');
        return;
      }
    }
    toast.success('Bem-vinda de volta!');
    navigate('/admin');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!fullName.trim()) {
          toast.error('Informe seu nome');
          setLoading(false);
          return;
        }

        let referredBy = null;
        try {
          const affData = localStorage.getItem('bellasup_affiliate');
          if (affData) {
            const parsed = JSON.parse(affData);
            if (new Date().getTime() < parsed.expiry) {
              referredBy = parsed.id;
            }
          }
        } catch (e) { console.error("Error reading affiliate string"); }

        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const slug = `${fullName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${randomSuffix}`;

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nome: fullName,
              slug: slug,
              referred_by: referredBy
            }
          }
        });

        if (signUpError) throw signUpError;

        supabase.functions.invoke('notify-signup', {
          body: { nome: fullName, email: email },
        }).catch(() => { });

        if (signUpData.user) {
          toast.success("Conta criada! Teste Grátis liberado.");
          navigate('/admin');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          await checkExpiryAndNavigate(data.user.id);
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FBF9F6] p-4 selection:bg-[#E2B4BD]/30 font-sans">

      <div className="w-full max-w-[420px] bg-white rounded-[32px] border border-[#E2B4BD]/20 shadow-[0_30px_70px_-15px_rgba(160,112,121,0.12)] overflow-hidden p-6 md:p-8">

        <div className="flex flex-col items-center mb-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FBF9F6] border border-[#D4AF37]/20 text-[#A07079] text-[11px] font-black uppercase tracking-widest mb-3"
          >
            <Sparkle className="h-3.5 w-3.5 fill-[#D4AF37] text-[#D4AF37]" /> BellasUp Premium
          </motion.div>
          <h2 className="text-xl font-black text-zinc-950 tracking-tighter">
            {mode === 'signup' ? 'Criar sua Conta VIP' : 'Acessar seu Painel'}
          </h2>
          <p className="text-[10px] text-[#D4AF37] font-bold uppercase mt-1 tracking-[0.2em]">Teste Grátis</p>
        </div>

        {/* Vantagens com Animação em Cascata */}
        <motion.div
          className="grid grid-cols-2 gap-2 mb-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {[
            { icon: Calendar, text: "Agenda Inteligente" },
            { icon: Zap, text: "Furos Nunca Mais" },
            { icon: LayoutDashboard, text: "Gestão VIP" },
            { icon: CheckCircle2, text: "Agende Dormindo" }
          ].map((item, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ y: -2 }}
              className="flex items-center gap-2 text-[9px] font-black text-zinc-800 bg-white p-2 rounded-xl border border-zinc-100 shadow-sm"
            >
              <item.icon className="h-3 w-3 text-[#D4AF37] flex-shrink-0" />
              <span className="leading-tight uppercase tracking-tighter">{item.text}</span>
            </motion.div>
          ))}
        </motion.div>

        <form onSubmit={handleAuth} className="space-y-3.5">
          <AnimatePresence mode="wait">
            {mode === 'signup' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1.5 overflow-hidden"
              >
                <Label className="text-[10px] uppercase font-black text-zinc-800 tracking-widest ml-1">Seu Nome</Label>
                <Input
                  type="text" required
                  value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Ex: Maria Silva"
                  className="h-10 bg-[#FBF9F6] border-zinc-200 focus:border-[#D4AF37] transition-all rounded-xl text-xs"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-black text-zinc-800 tracking-widest ml-1">E-mail Profissional</Label>
            <Input
              type="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="h-10 bg-[#FBF9F6] border-zinc-200 focus:border-[#D4AF37] transition-all rounded-xl text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-black text-zinc-800 tracking-widest ml-1">Senha</Label>
            <Input
              type="password" required
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-10 bg-[#FBF9F6] border-zinc-200 focus:border-[#D4AF37] transition-all rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="h-11 flex items-center justify-center gap-1.5 border-2 border-[#E2B4BD]/40 hover:bg-[#FBF9F6] text-[#A07079] rounded-xl transition-all group shadow-sm active:scale-[0.98]"
            >
              {mode === 'signup' ? (
                <>
                  <LogIn className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Fazer Login</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Criar Conta</span>
                </>
              )}
            </button>

            <Button
              type="submit" disabled={loading}
              className="h-11 bg-gradient-to-r from-[#A07079] via-[#D4AF37] to-[#A07079] text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-[#D4AF37]/15 transition-all active:scale-[0.98]"
            >
              {loading ? 'Aguarde...' : mode === 'signup' ? 'Teste Grátis' : 'Acessar'}
            </Button>
          </div>
        </form>

        <div className="mt-8 pt-5 border-t border-zinc-50 flex flex-col items-center gap-1.5 opacity-90">
          <div className="flex items-center gap-2 text-zinc-800">
            <ShieldCheck className="h-3 w-3 text-[#A07079]" />
            <p className="text-[9px] font-black uppercase tracking-widest">Segurança BellasUp</p>
          </div>
          <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-tighter">© 2026 BellasUp Premium</p>
        </div>

      </div>
    </div>
  );
};

export default Auth;