import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Sparkles, Clock, CheckCircle, ImagePlus, Loader2, Scissors, Eye, Flower2, Palette, Zap, Check, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import PaymentScreen from '@/components/booking/PaymentScreen';

const aplicarMascaraTelefone = (valor: string) => {
  const apenasNumeros = valor.replace(/\D/g, '').slice(0, 11);

  if (apenasNumeros.length <= 2) return apenasNumeros;
  if (apenasNumeros.length <= 7) return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2)}`;
  return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2, 7)}-${apenasNumeros.slice(7)}`;
};
interface Profile {
  id: string;
  nome: string;
  bio: string | null;
  telefone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  frase_boas_vindas?: string | null;
  taxa_reserva_ativo?: boolean;
  taxa_reserva_percentual?: number;
  chave_pix?: string;
  tipo_chave_pix?: string;
  tempo_expiracao_min?: number;
}

interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracao: number;
  imagem_url: string | null;
  categoria: string;
  preco_mao: number | null;
  duracao_mao: number | null;
  preco_pe: number | null;
  duracao_pe: number | null;
  preco_ambos: number | null;
  duracao_ambos: number | null;
}

type Variacao = 'mao' | 'pe' | 'ambos';

interface HorarioRow {
  dia_semana: number;
  ativo: boolean;
  hora_inicio: string;
  hora_fim: string;
  blocos?: { inicio: string; fim: string }[] | null;
}

const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; phrase: string; label: string }> = {
  unhas: {
    icon: <Sparkles className="h-6 w-6" />,
    phrase: 'Suas mãos dizem muito sobre você. Escolha seu estilo e brilhe.',
    label: 'Unhas',
  },
  cabelos: {
    icon: <Scissors className="h-6 w-6" />,
    phrase: 'Transforme seu visual e eleve sua autoestima com nossos cuidados capilares.',
    label: 'Cabelos',
  },
  sobrancelhas_cilios: {
    icon: <Eye className="h-6 w-6" />,
    phrase: 'O olhar é a moldura do rosto. Realce sua beleza natural aqui.',
    label: 'Sobrancelhas e Cílios',
  },
  estetica_pele: {
    icon: <Flower2 className="h-6 w-6" />,
    phrase: 'Um momento de autocuidado para renovar suas energias e sua pele.',
    label: 'Estética e Pele',
  },
  maquiagem: {
    icon: <Palette className="h-6 w-6" />,
    phrase: 'Realce o que você tem de melhor para os seus momentos especiais.',
    label: 'Maquiagem',
  },
  depilacao: {
    icon: <Zap className="h-6 w-6" />,
    phrase: 'Sinta a liberdade de uma pele bem cuidada e renovada.',
    label: 'Depilação',
  },
  outros: {
    icon: <Sparkles className="h-6 w-6" />,
    phrase: 'Cuidados especiais pensados exclusivamente para você.',
    label: 'Outros',
  },
};

const normalizeFilterCategory = (value: string | null | undefined): string => {
  if (!value) return '';
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
};

const getCategoryConfigKey = (value: string | null | undefined): string => {
  const normalized = normalizeFilterCategory(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

  if (normalized.includes('unha')) return 'unhas';
  if (normalized.includes('cabelo')) return 'cabelos';
  if (normalized.includes('depil')) return 'depilacao';
  if (normalized.includes('sobrancelha') || normalized.includes('cilio')) return 'sobrancelhas_cilios';
  if (normalized.includes('estetica') || normalized.includes('pele')) return 'estetica_pele';
  if (normalized.includes('maquiagem')) return 'maquiagem';
  return normalized || 'outros';
};

const ServiceImage = ({ url, alt }: { url: string; alt: string }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="w-[110px] h-[110px] shrink-0 bg-secondary/30 rounded-xl overflow-hidden relative">
      {!loaded && <Skeleton className="absolute inset-0 rounded-none" />}
      <img
        src={url}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={cn(
          'w-full h-full object-contain transition-all duration-300',
          loaded ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  );
};

const variacaoLabels: Record<Variacao, string> = { mao: '✋ Mão', pe: '🦶 Pé', ambos: '✋🦶 Mão e Pé' };

const getAvailableVariations = (s: Servico): Variacao[] => {
  const v: Variacao[] = [];
  if (s.preco_mao != null && s.duracao_mao != null) v.push('mao');
  if (s.preco_pe != null && s.duracao_pe != null) v.push('pe');
  if (s.preco_ambos != null && s.duracao_ambos != null) v.push('ambos');
  return v;
};

const getVariacaoPrice = (s: Servico, v: Variacao): number => {
  if (v === 'mao' && s.preco_mao != null) return Number(s.preco_mao);
  if (v === 'pe' && s.preco_pe != null) return Number(s.preco_pe);
  if (v === 'ambos' && s.preco_ambos != null) return Number(s.preco_ambos);
  return s.preco;
};

const getVariacaoDuration = (s: Servico, v: Variacao): number => {
  if (v === 'mao' && s.duracao_mao != null) return s.duracao_mao;
  if (v === 'pe' && s.duracao_pe != null) return s.duracao_pe;
  if (v === 'ambos' && s.duracao_ambos != null) return s.duracao_ambos;
  return s.duracao;
};

const getTimeBlocks = (h: HorarioRow): { inicio: string; fim: string }[] => {
  if (h.blocos && Array.isArray(h.blocos) && h.blocos.length > 0) {
    return h.blocos;
  }
  return [{ inicio: h.hora_inicio, fim: h.hora_fim }];
};

const getApptDuration = (appt: any): number => {
  const svc = appt.servicos;
  if (!svc) return 60;
  const variacao = appt.variacao as Variacao | null;
  if (variacao === 'mao' && svc.duracao_mao != null) return svc.duracao_mao;
  if (variacao === 'pe' && svc.duracao_pe != null) return svc.duracao_pe;
  if (variacao === 'ambos' && svc.duracao_ambos != null) return svc.duracao_ambos;
  return svc.duracao || 60;
};

const formatDuration = (totalMinutes: number) => {
  if (!totalMinutes) return '0 min';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `${h} h e ${m} min`;
  if (h > 0 && m === 0) return `${h} h`;
  return `${m} min`;
};

/* ── Step indicator component ── */
const StepIndicator = ({ number, state }: { number: number; state: 'done' | 'active' | 'locked' }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold shrink-0 transition-all duration-500',
        state === 'done' && 'bg-green-500 text-white',
        state === 'active' && 'bg-primary text-primary-foreground',
        state === 'locked' && 'bg-muted text-muted-foreground',
      )}
    >
      {state === 'done' ? (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        >
          <Check className="h-4 w-4" />
        </motion.span>
      ) : (
        number
      )}
    </span>
  );
};

const Booking = () => {
  const [phoneError, setPhoneError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { slug } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [popularIds, setPopularIds] = useState<Set<string>>(new Set());
  const [horarios, setHorarios] = useState<HorarioRow[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedVariacao, setSelectedVariacao] = useState<Variacao | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clienteNome, setClienteNome] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [booked, setBooked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentExpiresAt, setPaymentExpiresAt] = useState<Date | null>(null);

  const variacaoRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const serviceRef = useRef<HTMLDivElement>(null);

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    setTimeout(() => { ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 200);
  };

  useEffect(() => { if (slug) fetchData(); }, [slug]);

  const fetchData = async () => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, nome, bio, telefone, avatar_url, is_active, frase_boas_vindas, taxa_reserva_ativo, taxa_reserva_percentual, chave_pix, tipo_chave_pix, tempo_expiracao_min')
      .eq('slug', slug!)
      .single();
    if (!profileData) { setLoading(false); return; }
    setProfile(profileData as any);



    const [servRes, horRes] = await Promise.all([
      supabase.from('servicos').select('id, nome, preco, duracao, imagem_url, categoria, preco_mao, duracao_mao, preco_pe, duracao_pe, preco_ambos, duracao_ambos').eq('manicure_id', profileData.id).eq('ativo', true).order('nome'),
      supabase.from('horarios_funcionamento').select('*').eq('manicure_id', profileData.id),
    ]);
    if (horRes.data) setHorarios(horRes.data as any);

    const { data: popularData } = await supabase
      .from('agendamentos')
      .select('servico_id')
      .eq('manicure_id', profileData.id)
      .neq('status', 'cancelado');

    const counts: Record<string, number> = {};
    if (popularData && popularData.length > 0) {
      popularData.forEach(a => { if (a.servico_id) counts[a.servico_id] = (counts[a.servico_id] || 0) + 1; });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const topIds = sorted.slice(0, 3).filter(([, c]) => c >= 2).map(([id]) => id);
      setPopularIds(new Set(topIds));
    }

    if (servRes.data) {
      const sorted = [...servRes.data].sort((a: any, b: any) => (counts[b.id] || 0) - (counts[a.id] || 0));
      setServicos(sorted as any);
    }
    setLoading(false);
  };

  const categories = useMemo(() => {
    const categoryMap = new Map<string, string>();
    servicos.forEach((s) => {
      const rawCategory = s.categoria?.trim();
      if (!rawCategory) return;
      const normalized = normalizeFilterCategory(rawCategory);
      if (!categoryMap.has(normalized)) {
        categoryMap.set(normalized, rawCategory);
      }
    });
    return Array.from(categoryMap.values());
  }, [servicos]);

  const servicosFiltrados = useMemo(() => {
    if (!selectedCategory) return [];
    const categoriaAtiva = normalizeFilterCategory(selectedCategory);
    const searchLower = searchTerm.toLowerCase();

    return servicos.filter((s) => {
      const matchCategory = normalizeFilterCategory(s.categoria) === categoriaAtiva;
      const matchSearch = s.nome.toLowerCase().includes(searchLower); // Filtra pelo nome
      return matchCategory && matchSearch;
    });
  }, [servicos, selectedCategory, searchTerm]); // Adicione searchTerm nas dependências

  // NO auto-select: categoriaAtiva starts null, user must pick

  useEffect(() => {
    if (!selectedCategory) return;
    if (servicos.length > 0 && servicosFiltrados.length === 0) {
      console.error('[Booking] Filtro de categoria sem resultados', {
        categoriaAtiva: selectedCategory,
        categoriasDisponiveis: categories,
        totalServicos: servicos.length,
      });
    }
  }, [selectedCategory, servicos, servicosFiltrados, categories]);

  const selectedServico = servicos.find(s => s.id === selectedService) || null;
  const availableVariations = selectedServico ? getAvailableVariations(selectedServico) : [];
  const hasVariations = availableVariations.length > 0;
  const effectiveVariacao = selectedVariacao;
  const effectivePrice = selectedServico ? (effectiveVariacao ? getVariacaoPrice(selectedServico, effectiveVariacao) : selectedServico.preco) : 0;
  const effectiveDuration = selectedServico ? (effectiveVariacao ? getVariacaoDuration(selectedServico, effectiveVariacao) : selectedServico.duracao) : 60;

  const canSelectDate = selectedService && (!hasVariations || selectedVariacao);

  useEffect(() => {
    if (!selectedDate || !profile || !canSelectDate) { setAvailableTimes([]); return; }
    fetchAvailableTimes();
  }, [selectedDate, selectedService, selectedVariacao]);

  const fetchAvailableTimes = async () => {
    if (!selectedDate || !profile || !canSelectDate) return;
    const dayOfWeek = selectedDate.getDay();
    const dayHours = horarios.find(h => h.dia_semana === dayOfWeek);
    if (!dayHours || !dayHours.ativo) { setAvailableTimes([]); return; }

    const blocks = getTimeBlocks(dayHours);

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const { data: existingApptsFull } = await supabase
      .from('agendamentos')
      .select('hora, variacao, expira_em, valor_reserva, status, servicos(duracao, duracao_mao, duracao_pe, duracao_ambos)')
      .eq('manicure_id', profile.id)
      .eq('data', dateStr)
      .neq('status', 'cancelado');

    const blockedRanges: { start: number; end: number }[] = [];
    if (existingApptsFull) {
      existingApptsFull.forEach((a: any) => {
        if (a.valor_reserva != null && a.expira_em && new Date(a.expira_em) < new Date() && a.status === 'pendente') {
          return;
        }
        const [aH, aM] = a.hora.split(':').map(Number);
        const aStart = aH * 60 + aM;
        const dur = getApptDuration(a);
        blockedRanges.push({ start: aStart, end: aStart + dur });
      });
    }

    const brasiliaTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const isToday = selectedDate.toDateString() === brasiliaTime.toDateString();
    const currentMinutes = brasiliaTime.getHours() * 60 + brasiliaTime.getMinutes();
    const SAFETY_MARGIN = 5;

    const slots: string[] = [];

    for (const block of blocks) {
      const [startH, startM] = block.inicio.split(':').map(Number);
      const [endH, endM] = block.fim.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      for (let m = startMinutes; m + effectiveDuration <= endMinutes; m += 30) {
        const h = String(Math.floor(m / 60)).padStart(2, '0');
        const min = String(m % 60).padStart(2, '0');
        const timeStr = `${h}:${min}`;

        if (isToday && m <= currentMinutes + SAFETY_MARGIN) continue;

        const slotEnd = m + effectiveDuration;
        const hasConflict = blockedRanges.some(r => m < r.end && slotEnd > r.start);
        if (!hasConflict) slots.push(timeStr);
      }
    }

    setAvailableTimes(slots);
  };

  const isDateDisabled = (date: Date) => {
    if (date < new Date(new Date().setHours(0, 0, 0, 0))) return true;
    const dayOfWeek = date.getDay();
    const dayHours = horarios.find(h => h.dia_semana === dayOfWeek);
    return !dayHours || !dayHours.ativo;
  };

  const hasReservationPolicy = profile?.taxa_reserva_ativo && profile?.chave_pix;

  const handleBook = async () => {
    if (!clienteNome || !selectedService || !selectedDate || !selectedTime || !profile) {
      toast.error('Preencha todos os campos'); return;
    }

    const telefoneLimpo = clienteTelefone.replace(/\D/g, '');

    if (telefoneLimpo.length !== 11) {
      setPhoneError(true);

      document.getElementById('telefone-input')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setSubmitting(true);

    const tempoExp = profile.tempo_expiracao_min || 30;
    const expiresAt = hasReservationPolicy
      ? new Date(Date.now() + tempoExp * 60000).toISOString()
      : null;
    const valorReserva = hasReservationPolicy
      ? effectivePrice * (profile.taxa_reserva_percentual || 30) / 100
      : null;

    const nomeServico = servicos?.find(s => s.id === selectedService)?.nome || 'Serviço';

    const telefoneSanitizado = clienteTelefone.replace(/\D/g, '');

    const { error } = await supabase.from('agendamentos').insert({
      manicure_id: profile.id,
      servico_id: selectedService,
      cliente_nome: clienteNome,
      cliente_telefone: telefoneSanitizado,
      data: format(selectedDate, 'yyyy-MM-dd'),
      hora: selectedTime + ':00',
      variacao: effectiveVariacao || null,
      valor_reserva: valorReserva,
      expira_em: expiresAt,
      valor_historico: effectivePrice,
      duracao_historica: effectiveDuration,
      servico_nome_historico: nomeServico
    } as any);

    if (error) {
      toast.error('Erro ao agendar: ' + error.message);
      setSubmitting(false);
      return;
    }

    if (hasReservationPolicy) {
      setPaymentExpiresAt(new Date(expiresAt!));
      setShowPayment(true);
      toast.success('Horário reservado! Conclua o pagamento.');
    } else {
      setBooked(true);
      toast.success('Agendamento realizado com sucesso!');

      const dataFormatted = format(selectedDate, "dd/MM/yyyy");
      if (profile.telefone) {
        let whatsappManicure = profile.telefone.replace(/\D/g, '');
        if (!whatsappManicure.startsWith('55')) whatsappManicure = '55' + whatsappManicure;
        const celularLimpo = telefoneSanitizado;
        const variacaoText = effectiveVariacao ? ` (${variacaoLabels[effectiveVariacao]})` : '';
        const message = `Olá! 👋\n\n` +
          `Confirmando meu agendamento:\n` +
          `👤 *Nome:* ${clienteNome}\n` +
          `💅 *Serviço:* ${selectedServico?.nome}${variacaoText}\n` +
          `📅 *Data:* ${dataFormatted}\n` +
          `⏰ *Horário:* ${selectedTime}\n` +
          `💰 *Valor Total:* R$ ${effectivePrice.toFixed(2)}\n` +
          `📱 *Celular:* ${celularLimpo}\n\n` +
          `Muito obrigado(a)! 😊`;

        setTimeout(() => {
          window.location.href = `https://api.whatsapp.com/send?phone=${whatsappManicure}&text=${encodeURIComponent(message)}`;
        }, 2000);

      }
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Sparkles className="h-8 w-8 text-primary animate-pulse" /></div>;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4"><CardContent className="p-8 text-center">
          <h2 className="text-xl font-display font-bold">Profissional não encontrado</h2>
          <p className="text-muted-foreground mt-2">Verifique o link e tente novamente.</p>
        </CardContent></Card>
      </div>
    );
  }

  if (!profile.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full shadow-rose border-border/50">
          <CardContent className="p-8 text-center space-y-4">
            <h2 className="text-xl font-display font-bold">Agenda Indisponível</h2>
            <p className="text-muted-foreground">Este profissional não está aceitando agendamentos no momento.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Payment screen
  if (showPayment && paymentExpiresAt && profile) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden max-w-full">
        <header className="gradient-rose py-6 px-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
            <span className="text-xl font-display font-bold text-primary-foreground">BellasUp</span>
          </div>
        </header>
        <main className="container max-w-2xl py-6 px-4">
          <PaymentScreen
            serviceName={selectedServico?.nome || ''}
            variacao={effectiveVariacao}
            date={selectedDate!}
            time={selectedTime!}
            clienteNome={clienteNome}
            totalPrice={effectivePrice}
            reservationPercent={profile.taxa_reserva_percentual || 30}
            chavePix={profile.chave_pix || ''}
            tipoChavePix={profile.tipo_chave_pix || 'pix'}
            expiresAt={paymentExpiresAt}
            profileTelefone={profile.telefone || ''}
            profileNome={profile.nome}
          />
        </main>
      </div>
    );
  }

  if (booked) {
    const variacaoText = effectiveVariacao ? ` (${variacaoLabels[effectiveVariacao]})` : '';
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full shadow-rose border-border/50 animate-fade-in">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full gradient-rose flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-display font-bold">Agendamento Confirmado!</h2>
            <p className="text-muted-foreground">
              {clienteNome}, seu horário com {profile.nome} foi reservado para{' '}
              {selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: ptBR })} às {selectedTime}.
            </p>
            <p className="text-sm text-primary font-medium">{selectedServico?.nome}{variacaoText} · R$ {effectivePrice.toFixed(2)}</p>
            {profile.telefone && (
              <p className="text-sm text-muted-foreground animate-pulse">Redirecionando para o WhatsApp...</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine step states for visual feedback
  const categoryDone = !!selectedCategory;
  const serviceDone = !!selectedService;

  // Dynamic step counter
  let stepCounter = 0;

  const activeCatConfig = selectedCategory
    ? CATEGORY_CONFIG[getCategoryConfigKey(selectedCategory)] || CATEGORY_CONFIG.outros
    : null;

  let url_completa_da_imagem = `${window.location.origin}/og-image.png`;
  if (profile.avatar_url) {
    if (profile.avatar_url.startsWith('http')) {
      url_completa_da_imagem = profile.avatar_url;
    } else {
      url_completa_da_imagem = supabase.storage.from('avatars').getPublicUrl(profile.avatar_url, {
        transform: { width: 400, height: 400, resize: 'contain' }
      }).data.publicUrl;
      if (url_completa_da_imagem.startsWith('/')) {
        url_completa_da_imagem = `${window.location.origin}${url_completa_da_imagem}`;
      }
    }
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden max-w-full">
      <Helmet>
        <title>Agendamento Online - {profile.nome}</title>
        <meta name="description" content={`Olá, agende seu horário na ${profile.nome}`} />
        <meta property="og:title" content={`Agendamento Online - ${profile.nome}`} />
        <meta property="og:description" content={`Olá, agende seu horário na ${profile.nome}`} />
        <meta property="og:image" content={profile.avatar_url ? url_completa_da_imagem : `${window.location.origin}/og-image.png`} />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content={`Agendamento Online - ${profile.nome}`} />
        <meta name="twitter:description" content={`Olá, agende seu horário na ${profile.nome}`} />
        <meta name="twitter:image" content={url_completa_da_imagem} />
      </Helmet>
      <header className="gradient-rose py-8 px-4 text-center overflow-hidden">
        {profile.avatar_url && (
          <div className="mx-auto w-20 h-20 rounded-full border-2 border-primary-foreground/30 overflow-hidden mb-3 shadow-lg">
            <img src={profile.avatar_url} alt={profile.nome} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="h-6 w-6 text-primary-foreground" />
          <span className="text-xl font-display font-bold text-primary-foreground">BellasUp</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-primary-foreground">{profile.nome}</h1>
        {profile.bio && <p className="text-primary-foreground/80 mt-1 max-w-md mx-auto">{profile.bio}</p>}
      </header>

      <main className="container max-w-2xl py-6 px-4 space-y-6">
        {/* ── STEP 1: Category selector ── */}
        {categories.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 px-1">
              <StepIndicator number={++stepCounter} state={categoryDone ? 'done' : 'active'} />
              <p className="font-display text-lg font-semibold">Escolha a categoria</p>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full px-2 py-4 justify-items-center">
              {categories.map(cat => {
                const normalizedCat = normalizeFilterCategory(cat);
                const config = CATEGORY_CONFIG[getCategoryConfigKey(cat)] || CATEGORY_CONFIG.outros;
                const isActive = normalizeFilterCategory(selectedCategory) === normalizedCat;
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setCategoryLoading(true);
                      setSelectedCategory(cat);
                      setSelectedService(null);
                      setSelectedVariacao(null);
                      setSelectedDate(undefined);
                      setSelectedTime(null);
                      setTimeout(() => {
                        setCategoryLoading(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        serviceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 400);
                    }}
                    className={cn(
                      'flex flex-col items-center justify-center gap-3 p-8 w-full rounded-2xl border transition-all shadow-sm',
                      isActive
                        ? 'bg-gradient-to-bl from-orange-400 to-pink-500 text-white border-transparent shadow-xl scale-[1.05] ring-2 ring-orange-200/50 transition-all duration-300' // Ativo: Coral/Rosa Salmão
                        : 'bg-gradient-to-bl from-purple-400 to-purple-500 text-white border-transparent shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-300' // Inativo: Roxo/Lavanda Vibrante
                    )}
                  >
                    <span className="text-3xl md:text-4xl drop-shadow-sm text-white">
                      {config.icon}
                    </span>
                    <span className="text-xl font-bold text-center leading-tight text-white">
                      {config.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              {activeCatConfig && (
                <motion.p
                  key={selectedCategory}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                  className="text-center text-sm italic text-muted-foreground leading-relaxed"
                >
                  {activeCatConfig.phrase}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── STEP 2: Services list ── */}
        <div ref={serviceRef}>
          {!selectedCategory ? (
            /* Locked / placeholder state */
            <Card className="border-border/50 shadow-rose/20 opacity-50 pointer-events-none select-none">
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <StepIndicator number={++stepCounter} state="locked" />
                  <CardTitle className="font-display text-lg text-muted-foreground">Escolha o serviço</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-row items-center gap-3 rounded-xl border border-border p-2.5">
                    <Skeleton className="w-[110px] h-[110px] rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4 rounded" />
                      <Skeleton className="h-3 w-1/2 rounded" />
                      <Skeleton className="h-5 w-1/3 rounded" />
                    </div>
                  </div>
                ))}
                <p className="text-muted-foreground font-medium text-center pt-2">Selecione uma categoria acima para ver os serviços.</p>
              </CardContent>
            </Card>
          ) : (
            /* Active / visible state */
            <Card className="border-border/50 shadow-rose/20">
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <StepIndicator number={++stepCounter} state={serviceDone ? 'done' : 'active'} />
                  <CardTitle className="font-display text-lg">Escolha o serviço</CardTitle>
                </div>

                {/* Barra de Pesquisa de Serviços */}
                <div className="mt-4 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={`Buscar em ${selectedCategory}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-secondary/20 border-border/40 focus-visible:ring-primary/30"
                  />
                </div>

                {categories.length <= 1 && activeCatConfig && (
                  <p className="text-sm italic text-muted-foreground mt-1">{activeCatConfig.phrase}</p>
                )}
              </CardHeader>
              <CardContent className="grid gap-3">
                {categoryLoading ? (
                  <>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex flex-row items-center gap-3 rounded-xl border border-border p-2.5">
                        <Skeleton className="w-[110px] h-[110px] rounded-xl shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4 rounded" />
                          <Skeleton className="h-3 w-1/2 rounded" />
                          <Skeleton className="h-5 w-1/3 rounded" />
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedCategory || 'all'}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="grid gap-3"
                    >
                      {servicosFiltrados.map(s => {
                        const vars = getAvailableVariations(s);
                        const minPrice = vars.length > 0
                          ? Math.min(...vars.map(v => getVariacaoPrice(s, v)))
                          : s.preco;
                        return (
                          <button
                            key={s.id}
                            onClick={() => {
                              setSelectedService(s.id);
                              setSelectedVariacao(null);
                              setSelectedTime(null);
                              setSelectedDate(undefined);
                              const sVars = getAvailableVariations(s);
                              if (sVars.length === 0) scrollTo(dateRef);
                              else if (sVars.length === 1) { setSelectedVariacao(sVars[0]); scrollTo(dateRef); }
                              else scrollTo(variacaoRef);
                            }}
                            className={cn(
                              'flex flex-row items-center gap-3 rounded-xl border p-2.5 transition-all text-left group relative',
                              selectedService === s.id
                                ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                                : 'border-border hover:border-primary/50 hover:shadow-sm'
                            )}
                          >
                            {popularIds.has(s.id) && (
                              <Badge className="absolute -top-2.5 left-3 z-10 gradient-rose text-primary-foreground text-[10px] px-2 py-0.5 shadow-sm border-0">
                                ⭐ Mais Pedido
                              </Badge>
                            )}
                            {s.imagem_url ? (
                              <ServiceImage url={s.imagem_url} alt={s.nome} />
                            ) : (
                              <div className="w-[110px] h-[110px] shrink-0 bg-secondary/30 rounded-xl flex items-center justify-center">
                                <ImagePlus className="h-7 w-7 text-muted-foreground/40" />
                              </div>
                            )}
                            <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
                              <p className="font-semibold text-sm leading-tight">{s.nome}</p>
                              {vars.length > 0 ? (
                                <span className="text-xs text-muted-foreground">A partir de</span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{formatDuration(s.duracao)}</span>
                              )}
                              <span className="text-base font-bold text-primary">R$ {Number(minPrice).toFixed(2)}</span>
                            </div>
                          </button>
                        );
                      })}
                      {servicosFiltrados.length === 0 && (
                        <p className="text-muted-foreground text-center py-4">
                          Nenhum serviço disponível nesta categoria no momento.
                        </p>
                      )}
                    </motion.div>
                  </AnimatePresence>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Variation selection */}
        {selectedService && hasVariations && availableVariations.length > 1 && (
          <div ref={variacaoRef}>
            <Card className="border-border/50 shadow-rose/20 animate-fade-in">
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <StepIndicator number={++stepCounter} state={selectedVariacao ? 'done' : 'active'} />
                  <CardTitle className="font-display text-lg">Escolha a opção</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid gap-2">
                {availableVariations.map(v => {
                  const price = getVariacaoPrice(selectedServico!, v);
                  const dur = getVariacaoDuration(selectedServico!, v);
                  return (
                    <button
                      key={v}
                      onClick={() => { setSelectedVariacao(v); setSelectedTime(null); setSelectedDate(undefined); scrollTo(dateRef); }}
                      className={cn(
                        'flex items-center justify-between p-4 rounded-xl border transition-all',
                        selectedVariacao === v
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <span className="font-semibold text-sm">{variacaoLabels[v]}</span>
                      <div className="text-right">
                        <span className="text-base font-bold text-primary">R$ {price.toFixed(2)}</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground justify-end"><Clock className="h-3 w-3" />{formatDuration(dur)}</span>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Summary bar */}
        {canSelectDate && selectedServico && (
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between text-sm">
            <span className="font-medium">{selectedServico.nome} {effectiveVariacao ? `· ${variacaoLabels[effectiveVariacao]}` : ''}</span>
            <span className="font-bold text-primary">R$ {effectivePrice.toFixed(2)} · {formatDuration(effectiveDuration)}</span>
          </div>
        )}

        {/* Date */}
        {canSelectDate && (
          <div ref={dateRef}>
            <Card className="border-border/50 shadow-rose/20 animate-fade-in">
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <StepIndicator number={++stepCounter} state={selectedDate ? 'done' : 'active'} />
                  <CardTitle className="font-display text-lg">Escolha a data</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => { setSelectedDate(d); setSelectedTime(null); scrollTo(timeRef); }}
                  disabled={isDateDisabled}
                  locale={ptBR}
                  className="p-3 pointer-events-auto"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Time */}
        {selectedDate && (
          <div ref={timeRef}>
            <Card className="border-border/50 shadow-rose/20 animate-fade-in">
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <StepIndicator number={++stepCounter} state={selectedTime ? 'done' : 'active'} />
                  <CardTitle className="font-display text-lg">Escolha o horário</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {availableTimes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum horário disponível neste dia.
                    {selectedDate.toDateString() === new Date().toDateString() && (
                      <span className="block mt-1 text-sm">Todos os horários de hoje já passaram. Selecione outro dia.</span>
                    )}
                  </p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {availableTimes.map(t => (
                      <Button
                        key={t}
                        variant={selectedTime === t ? 'default' : 'outline'}
                        className={selectedTime === t ? 'gradient-rose text-primary-foreground' : ''}
                        onClick={() => { setSelectedTime(t); scrollTo(formRef); }}
                      >
                        {t}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Client info */}
        {selectedTime && (
          <div ref={formRef}>
            <Card className="border-border/50 shadow-rose/20 animate-fade-in">
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <StepIndicator number={++stepCounter} state="active" />
                  <CardTitle className="font-display text-lg">Seus dados</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Nome *</Label><Input value={clienteNome} onChange={e => setClienteNome(e.target.value)} placeholder="Seu nome completo" /></div>
                <div className="space-y-1" id="telefone-input">
                  <Label>Celular / WhatsApp</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm font-medium select-none">
                      +55
                    </span>
                    <Input
                      value={clienteTelefone}
                      onChange={(e) => {
                        const valor = aplicarMascaraTelefone(e.target.value);
                        setClienteTelefone(valor);
                        if (valor.replace(/\D/g, '').length === 11) {
                          setPhoneError(false);
                        }
                      }}
                      placeholder="(85) 99999-9999"
                      maxLength={15}
                      inputMode="tel"
                      className={cn(
                        "rounded-l-none",
                        phoneError && "border-red-500 focus-visible:ring-red-500"
                      )}
                    />
                  </div>
                  {phoneError && (
                    <p className="text-red-500 text-[11px] font-medium animate-in fade-in slide-in-from-top-1">
                      O WhatsApp deve ter 11 dígitos (DDD + número)
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-secondary/50 space-y-1">
                  <p className="font-medium">Resumo</p>
                  <p className="text-sm text-muted-foreground">Serviço: {selectedServico?.nome}{effectiveVariacao ? ` (${variacaoLabels[effectiveVariacao]})` : ''}</p>
                  <p className="text-sm text-muted-foreground">Data: {format(selectedDate!, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                  <p className="text-sm text-muted-foreground">Horário: {selectedTime}</p>
                  <p className="text-sm text-muted-foreground">Duração: {formatDuration(effectiveDuration)}</p>
                  <p className="text-sm font-semibold text-primary">Valor: R$ {effectivePrice.toFixed(2)}</p>
                  {hasReservationPolicy && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground">
                        💳 Taxa de reserva ({profile.taxa_reserva_percentual}%): <strong className="text-primary">R$ {(effectivePrice * (profile.taxa_reserva_percentual || 30) / 100).toFixed(2)}</strong>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        O pagamento da reserva será solicitado na próxima etapa via Pix.
                      </p>
                    </div>
                  )}
                </div>

                <Button onClick={handleBook} disabled={submitting} className="w-full gradient-rose text-primary-foreground text-lg py-6">
                  {submitting ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Agendando...</> : (
                    hasReservationPolicy ? 'Reservar Horário e Pagar' : 'Confirmar Agendamento'
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Booking;
