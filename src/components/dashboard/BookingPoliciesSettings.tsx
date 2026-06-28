import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Shield, Loader2, Copy, CreditCard, Clock, AlertTriangle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  profileId: string;
}

const TIPOS_CHAVE = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'aleatoria', label: 'Chave Aleatória' },
];

const BookingPoliciesSettings = ({ profileId }: Props) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [taxaAtivo, setTaxaAtivo] = useState(false);
  const [percentual, setPercentual] = useState('30');
  const [chavePix, setChavePix] = useState('');
  const [tipoChave, setTipoChave] = useState('cpf');
  const [tempoExpiracao, setTempoExpiracao] = useState('30');

  useEffect(() => { fetchSettings(); }, [profileId]);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('taxa_reserva_ativo, taxa_reserva_percentual, chave_pix, tipo_chave_pix, tempo_expiracao_min')
      .eq('id', profileId)
      .single();
    if (data) {
      const d = data as any;
      setTaxaAtivo(d.taxa_reserva_ativo || false);
      setPercentual(String(d.taxa_reserva_percentual || 30));
      setChavePix(d.chave_pix || '');
      setTipoChave(d.tipo_chave_pix || 'cpf');
      setTempoExpiracao(String(d.tempo_expiracao_min || 30));
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (taxaAtivo && !chavePix.trim()) {
      toast.error('Preencha a chave Pix para ativar a taxa de reserva');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        taxa_reserva_ativo: taxaAtivo,
        taxa_reserva_percentual: parseInt(percentual),
        chave_pix: chavePix.trim(),
        tipo_chave_pix: tipoChave,
        tempo_expiracao_min: parseInt(tempoExpiracao),
      } as any)
      .eq('id', profileId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Políticas de agendamento salvas!');
    navigate('/admin');
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl gradient-rose-subtle">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-display text-lg">Taxa de Reserva</CardTitle>
              <CardDescription>Cobre um sinal antecipado para confirmar o horário</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/50">
            <div>
              <p className="font-medium text-sm">Cobrar taxa de reserva</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                O cliente pagará um sinal via Pix para confirmar o horário
              </p>
            </div>
            <Switch checked={taxaAtivo} onCheckedChange={setTaxaAtivo} />
          </div>

          <AnimatePresence>
            {taxaAtivo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-4 overflow-hidden"
              >
                <div>
                  <Label>Porcentagem do sinal</Label>
                  <Select value={percentual} onValueChange={setPercentual}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 20, 30, 40, 50, 100].map(p => (
                        <SelectItem key={p} value={String(p)}>{p}% do valor total</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tipo de Chave Pix</Label>
                  <Select value={tipoChave} onValueChange={setTipoChave}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_CHAVE.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Chave Pix *</Label>
                  <Input
                    value={chavePix}
                    onChange={e => setChavePix(e.target.value)}
                    placeholder="Sua chave Pix"
                    className="mt-1"
                  />
                  <p className="text-[11px] text-amber-600 flex items-center gap-1 font-medium px-1 mt-1.5">
                    <Info className="h-3 w-3" /> Certifique-se de que a chave PIX está correta.
                  </p>
                </div>

                <div>
                  <Label className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Tempo para pagamento (minutos)
                  </Label>
                  <Select value={tempoExpiracao} onValueChange={setTempoExpiracao}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        { value: '30', label: '30 minutos' },
                        { value: '60', label: '60 minutos' },
                        { value: '180', label: '3 horas' },
                        { value: '360', label: '6 horas' },
                        { value: '480', label: '8 horas' },
                      ].map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Se o cliente não enviar o comprovante neste tempo, o horário será liberado automaticamente.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800">
                    O horário ficará bloqueado por <strong>{parseInt(tempoExpiracao) >= 60 ? `${parseInt(tempoExpiracao) / 60} hora(s)` : `${tempoExpiracao} minutos`}</strong> enquanto aguarda o pagamento.
                    Após esse período, será liberado automaticamente se não for confirmado por você.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Button onClick={handleSave} disabled={saving} className="w-full gradient-rose text-primary-foreground">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : 'Salvar Políticas'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingPoliciesSettings;