import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Trash2, ImagePlus, Loader2, Hand, X, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  profileId: string;
}

const CATEGORIAS = [
  { value: 'unhas', label: '💅 Unhas' },
  { value: 'cabelos', label: '✂️ Cabelos' },
  { value: 'sobrancelhas_cilios', label: '👁️ Sobrancelhas e Cílios' },
  { value: 'estetica_pele', label: '🌸 Estética e Pele' },
  { value: 'maquiagem', label: '🎨 Maquiagem' },
  { value: 'depilacao', label: '⚡ Depilação' },
  { value: 'outros', label: '✨ Outros' },
];

const formatDuration = (totalMinutes: number) => {
  if (!totalMinutes) return '0 min';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `${h} h e ${m} min`;
  if (h > 0 && m === 0) return `${h} h`;
  return `${m} min`;
};

const PLACEHOLDERS: Record<string, string> = {
  unhas: 'Ex: Pé e Mão Simples, Unhas de Gel...',
  cabelos: 'Ex: Corte Feminino, Progressiva, Luzes...',
  sobrancelhas_cilios: 'Ex: Design com Henna, Extensão de Cílios...',
  estetica_pele: 'Ex: Limpeza de Pele, Drenagem Linfática...',
  maquiagem: 'Ex: Maquiagem Social, Maquiagem para Noivas...',
  depilacao: 'Ex: Depilação Completa Meia Perna, Axilas...',
  outros: 'Digite o nome do seu serviço profissional...',
};

const VariationFields = ({ label, preco, setPreco, duracao, setDuracao }: {
  label: string; preco: string; setPreco: (v: string) => void; duracao: string; setDuracao: (v: string) => void;
}) => {
  const mins = duracao ? parseInt(duracao) : 0;
  const h = Math.floor(mins / 60);
  const m = mins % 60;

  return (
    <div className="p-3 rounded-xl border border-border/50 bg-secondary/20 space-y-3">
      <p className="text-sm font-semibold flex items-center gap-1.5">
        <Hand className="h-3.5 w-3.5 text-primary" />{label}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Preço (R$)</Label>
          <input type="number" step="0.01" value={preco} onChange={e => setPreco(e.target.value)} placeholder="0.00" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Duração</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input type="number" min="0" value={h || ''} onChange={e => setDuracao(String((parseInt(e.target.value) || 0) * 60 + m))} placeholder="0" className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 pr-5 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">h</span>
            </div>
            <div className="relative flex-1">
              <input type="number" min="0" max="59" value={m || ''} onChange={e => setDuracao(String(h * 60 + (parseInt(e.target.value) || 0)))} placeholder="00" className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 pr-7 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracao: number;
  ativo: boolean;
  imagem_url: string | null;
  categoria: string;
  preco_mao: number | null;
  duracao_mao: number | null;
  preco_pe: number | null;
  duracao_pe: number | null;
  preco_ambos: number | null;
  duracao_ambos: number | null;
}

const ServicosManager = ({ profileId }: Props) => {
  const { user } = useAuth();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('unhas');
  const [precoMao, setPrecoMao] = useState('');
  const [duracaoMao, setDuracaoMao] = useState('');
  const [precoPe, setPrecoPe] = useState('');
  const [duracaoPe, setDuracaoPe] = useState('');
  const [precoAmbos, setPrecoAmbos] = useState('');
  const [duracaoAmbos, setDuracaoAmbos] = useState('');
  const [precoUnico, setPrecoUnico] = useState('');
  const [duracaoUnica, setDuracaoUnica] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isUnhas = categoria === 'unhas';

  useEffect(() => { fetchServicos(); }, [profileId]);

  const fetchServicos = async () => {
    setLoading(true);
    const { data } = await supabase.from('servicos').select('*').eq('manicure_id', profileId).order('created_at');
    if (data) {
      setServicos(data as any);
      if (data.length === 0) setShowTutorial(true);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setNome('');
    setCategoria('unhas');
    setPrecoMao('');
    setDuracaoMao('');
    setPrecoPe('');
    setDuracaoPe('');
    setPrecoAmbos('');
    setDuracaoAmbos('');
    setPrecoUnico('');
    setDuracaoUnica('');
    setEditingId(null);
    setDialogOpen(false);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (servicoId: string): Promise<string | null> => {
    if (!imageFile || !user) return null;
    const ext = imageFile.name.split('.').pop();
    const path = `${user.id}/${servicoId}.${ext}`;
    const { error } = await supabase.storage.from('servicos').upload(path, imageFile, { upsert: true });
    if (error) { toast.error('Erro ao fazer upload da imagem'); return null; }
    const { data: { publicUrl } } = supabase.storage.from('servicos').getPublicUrl(path);
    return `${publicUrl}?t=${new Date().getTime()}`;
  };

  const handleSave = async () => {
    if (!nome || !categoria) { toast.error('Preencha os campos obrigatórios'); return; }

    setUploading(true);
    const baseData: any = {
      nome,
      categoria,
      manicure_id: profileId
    };

    if (isUnhas) {
      baseData.preco_mao = precoMao ? parseFloat(precoMao) : null;
      baseData.duracao_mao = duracaoMao ? parseInt(duracaoMao) : null;
      baseData.preco_pe = precoPe ? parseFloat(precoPe) : null;
      baseData.duracao_pe = duracaoPe ? parseInt(duracaoPe) : null;
      baseData.preco_ambos = precoAmbos ? parseFloat(precoAmbos) : null;
      baseData.duracao_ambos = duracaoAmbos ? parseInt(duracaoAmbos) : null;

      // Valor principal do serviço (usado como fallback)
      baseData.preco = parseFloat(precoMao || precoPe || precoAmbos || '0');
      baseData.duracao = parseInt(duracaoMao || duracaoPe || duracaoAmbos || '30');
    } else {
      baseData.preco = precoUnico ? parseFloat(precoUnico) : 0;
      baseData.duracao = duracaoUnica ? parseInt(duracaoUnica) : 30;
      // Limpa campos de unhas se mudar de categoria
      baseData.preco_mao = null; baseData.preco_pe = null; baseData.preco_ambos = null;
    }

    try {
      if (editingId) {
        if (imageFile) {
          const url = await uploadImage(editingId);
          if (url) baseData.imagem_url = url;
        }
        const { error } = await supabase.from('servicos').update(baseData).eq('id', editingId);
        if (error) throw error;
        toast.success('Serviço atualizado!');
      } else {
        const { data, error } = await supabase.from('servicos').insert(baseData).select('id').single();
        if (error) throw error;

        if (imageFile && data) {
          const url = await uploadImage(data.id);
          if (url) await supabase.from('servicos').update({ imagem_url: url }).eq('id', data.id);
        }
        toast.success('Serviço adicionado!');
        setShowTutorial(false);
      }
      resetForm();
      fetchServicos();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('servicos').delete().eq('id', id);
    toast.success('Serviço removido');
    setDeletingId(null);
    fetchServicos();
  };

  const startEdit = (s: Servico) => {
    setEditingId(s.id);
    setNome(s.nome);
    setCategoria(s.categoria || 'unhas');
    setImagePreview(s.imagem_url || null);

    // Preencher campos de variação
    setPrecoMao(s.preco_mao?.toString() || '');
    setDuracaoMao(s.duracao_mao?.toString() || '');
    setPrecoPe(s.preco_pe?.toString() || '');
    setDuracaoPe(s.duracao_pe?.toString() || '');
    setPrecoAmbos(s.preco_ambos?.toString() || '');
    setDuracaoAmbos(s.duracao_ambos?.toString() || '');
    setPrecoUnico(s.preco?.toString() || '');
    setDuracaoUnica(s.duracao?.toString() || '');

    setDialogOpen(true);
  };

  const getVariationSummary = (s: Servico) => {
    if (s.categoria && s.categoria !== 'unhas') return `R$ ${Number(s.preco).toFixed(2)} · ${formatDuration(s.duracao)}`;
    const parts: string[] = [];
    if (s.preco_mao != null) parts.push(`Mão R$${Number(s.preco_mao).toFixed(2)}`);
    if (s.preco_pe != null) parts.push(`Pé R$${Number(s.preco_pe).toFixed(2)}`);
    if (s.preco_ambos != null) parts.push(`Ambos R$${Number(s.preco_ambos).toFixed(2)}`);
    return parts.length === 0 ? `R$ ${Number(s.preco).toFixed(2)} · ${formatDuration(s.duracao)}` : parts.join(' · ');
  };

  const getCategoriaLabel = (value: string) => CATEGORIAS.find(c => c.value === value)?.label || value;

  const groupedServicos = servicos.reduce<Record<string, Servico[]>>((acc, s) => {
    const cat = s.categoria || 'unhas';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display">Meus Serviços</CardTitle>
        <div className="relative">
          <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-rose text-primary-foreground">
                <Plus className="h-4 w-4 mr-1" />Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] w-[95vw] sm:max-w-md overflow-y-auto bg-background p-6">
              <DialogHeader>
                <DialogTitle className="font-display text-center">{editingId ? 'Editar' : 'Novo'} Serviço</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-5 py-4">
                <div className="space-y-2">
                  <Label>Imagem do serviço</Label>
                  <div onClick={() => fileInputRef.current?.click()} className="w-full h-36 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors">
                    {imagePreview ? <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" /> : <div className="text-center text-muted-foreground"><ImagePlus className="h-8 w-8 mx-auto mb-1" /><p className="text-xs">Clique para adicionar</p></div>}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Categoria *</Label>
                  <Select value={categoria} onValueChange={setCategoria}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Nome do Serviço *</Label>
                  <Input value={nome} onChange={e => setNome(e.target.value)} placeholder={PLACEHOLDERS[categoria] || PLACEHOLDERS.outros} />
                </div>

                <AnimatePresence mode="wait">
                  {isUnhas ? (
                    <motion.div key="unhas-fields" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-3">
                      <VariationFields label="✋ Mão" preco={precoMao} setPreco={setPrecoMao} duracao={duracaoMao} setDuracao={setDuracaoMao} />
                      <VariationFields label="🦶 Pé" preco={precoPe} setPreco={setPrecoPe} duracao={duracaoPe} setDuracao={setDuracaoPe} />
                      <VariationFields label="✋🦶 Mão e Pé" preco={precoAmbos} setPreco={setPrecoAmbos} duracao={duracaoAmbos} setDuracao={setDuracaoAmbos} />
                    </motion.div>
                  ) : (
                    <motion.div key="single-fields" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <Label>Preço (R$) *</Label>
                        <Input type="number" step="0.01" value={precoUnico} onChange={e => setPrecoUnico(e.target.value)} placeholder="0.00" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label>Duração *</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input 
                              type="number" min="0"
                              value={duracaoUnica ? Math.floor(parseInt(duracaoUnica) / 60) || '' : ''} 
                              onChange={e => {
                                const hours = parseInt(e.target.value) || 0;
                                const mins = duracaoUnica ? parseInt(duracaoUnica) % 60 : 0;
                                setDuracaoUnica(String(hours * 60 + mins));
                              }} 
                              placeholder="0" className="pr-6" 
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">h</span>
                          </div>
                          <div className="relative flex-1">
                            <Input 
                              type="number" min="0" max="59"
                              value={duracaoUnica ? parseInt(duracaoUnica) % 60 || '' : ''} 
                              onChange={e => {
                                const hours = duracaoUnica ? Math.floor(parseInt(duracaoUnica) / 60) : 0;
                                const mins = parseInt(e.target.value) || 0;
                                setDuracaoUnica(String(hours * 60 + mins));
                              }} 
                              placeholder="00" className="pr-8" 
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">min</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button onClick={handleSave} disabled={uploading} className="w-full gradient-rose h-12 font-bold">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editingId ? 'Atualizar Serviço' : 'Salvar Serviço'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {showTutorial && !loading && servicos.length === 0 && (
            <div className="absolute top-full mt-3 right-0 z-50 animate-bounce">
              <div className="bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg shadow-xl whitespace-nowrap relative">
                Cadastre seu primeiro serviço aqui ✨
                <div className="absolute -top-1 right-8 w-3 h-3 bg-primary rotate-45" />
                <button onClick={() => setShowTutorial(false)} className="absolute -top-2 -right-2 bg-foreground text-background rounded-full w-5 h-5 text-[10px] flex items-center justify-center">✕</button>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
        ) : servicos.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-2xl border-border/50">
            <p className="text-muted-foreground">Você ainda não tem serviços cadastrados.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedServicos).map(([cat, items]) => (
              <div key={cat} className="space-y-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">{getCategoriaLabel(cat)}</h3>
                <div className="grid gap-3">
                  {items.map(s => (
                    <div key={s.id} onClick={() => startEdit(s)} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 group relative bg-card hover:border-primary/30 transition-all cursor-pointer shadow-sm">
                      {s.imagem_url ? (
                        <img src={s.imagem_url} alt={s.nome} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                          <ImagePlus className="h-5 w-5 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{s.nome}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{getVariationSummary(s)}</p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {deletingId === s.id ? (
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeletingId(null)}><X className="h-4 w-4" /></Button>
                            <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleDelete(s.id)}><Check className="h-4 w-4" /></Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => setDeletingId(s.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ServicosManager;