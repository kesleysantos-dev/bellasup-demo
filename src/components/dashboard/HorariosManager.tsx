import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

interface Bloco {
  inicio: string;
  fim: string;
}

interface Horario {
  id: string;
  dia_semana: number;
  ativo: boolean;
  hora_inicio: string;
  hora_fim: string;
  blocos: Bloco[] | null;
}

const getBlocos = (h: Horario): Bloco[] => {
  if (h.blocos && Array.isArray(h.blocos) && h.blocos.length > 0) return h.blocos;
  return [{ inicio: h.hora_inicio, fim: h.hora_fim }];
};

const HorariosManager = ({ profileId }: { profileId: string }) => {
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchHorarios(); }, [profileId]);

  const fetchHorarios = async () => {
    const { data } = await supabase.from('horarios_funcionamento').select('*').eq('manicure_id', profileId).order('dia_semana');
    if (data) setHorarios(data as any);
  };

  const updateHorario = (index: number, field: keyof Horario, value: any) => {
    setHorarios(prev => prev.map((h, i) => i === index ? { ...h, [field]: value } : h));
  };

  const updateBloco = (horarioIndex: number, blocoIndex: number, field: 'inicio' | 'fim', value: string) => {
    setHorarios(prev => prev.map((h, i) => {
      if (i !== horarioIndex) return h;
      const blocos = getBlocos(h);
      const updated = blocos.map((b, bi) => bi === blocoIndex ? { ...b, [field]: value } : b);
      return { ...h, blocos: updated, hora_inicio: updated[0].inicio, hora_fim: updated[updated.length - 1].fim };
    }));
  };

  const addBloco = (horarioIndex: number) => {
    setHorarios(prev => prev.map((h, i) => {
      if (i !== horarioIndex) return h;
      const blocos = getBlocos(h);
      const lastEnd = blocos[blocos.length - 1].fim;
      return { ...h, blocos: [...blocos, { inicio: lastEnd, fim: lastEnd }] };
    }));
  };

  const removeBloco = (horarioIndex: number, blocoIndex: number) => {
    setHorarios(prev => prev.map((h, i) => {
      if (i !== horarioIndex) return h;
      const blocos = getBlocos(h).filter((_, bi) => bi !== blocoIndex);
      if (blocos.length === 0) return { ...h, blocos: null, ativo: false };
      return { ...h, blocos, hora_inicio: blocos[0].inicio, hora_fim: blocos[blocos.length - 1].fim };
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    for (const h of horarios) {
      const blocos = h.ativo ? getBlocos(h) : null;
      await supabase.from('horarios_funcionamento').update({
        ativo: h.ativo,
        hora_inicio: blocos ? blocos[0].inicio : h.hora_inicio,
        hora_fim: blocos ? blocos[blocos.length - 1].fim : h.hora_fim,
        blocos: blocos && blocos.length > 1 ? blocos as any : null,
      } as any).eq('id', h.id);
    }
    setSaving(false);
    toast.success('Horários salvos com sucesso!');
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="font-display">Horários de Funcionamento</CardTitle>
        <p className="text-xs text-muted-foreground">Adicione múltiplos blocos por dia para intervalos (ex: 8h–11h e 13h–18h).</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {horarios.map((h, i) => {
          const blocos = getBlocos(h);
          return (
            <div key={h.id} className="p-3 rounded-lg bg-secondary/50 space-y-2">
              <div className="flex items-center gap-3">
                <Switch checked={h.ativo} onCheckedChange={(v) => updateHorario(i, 'ativo', v)} />
                <span className="w-20 sm:w-24 font-medium text-sm">{DIAS[h.dia_semana]}</span>
              </div>
              {h.ativo && (
                <div className="pl-0 sm:pl-11 space-y-2">
                  {blocos.map((b, bi) => (
                    <div key={bi} className="flex items-center gap-2 w-full max-w-md">
                      <div className="flex items-center gap-2 flex-1">
                        <Input type="time" value={b.inicio} onChange={e => updateBloco(i, bi, 'inicio', e.target.value)} className="flex-1" />
                        <span className="text-muted-foreground text-xs shrink-0">às</span>
                        <Input type="time" value={b.fim} onChange={e => updateBloco(i, bi, 'fim', e.target.value)} className="flex-1" />
                      </div>
                      {blocos.length > 1 && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir horário?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover este bloco de horário?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => removeBloco(i, bi)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="text-xs text-primary p-0 h-auto hover:bg-transparent" onClick={() => addBloco(i)}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar Horário
                  </Button>
                </div>
              )}
              {!h.ativo && <span className="text-muted-foreground text-sm pl-11">Fechado</span>}
            </div>
          );
        })}
        <Button onClick={handleSave} disabled={saving} className="gradient-rose text-primary-foreground w-full sm:w-auto">
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default HorariosManager;