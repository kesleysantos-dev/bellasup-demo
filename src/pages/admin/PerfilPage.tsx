import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminContext } from '@/hooks/useAdminContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Camera, Loader2 } from 'lucide-react';

const aplicarMascaraTelefone = (valor: string) => {
  const apenasNumeros = valor.replace(/\D/g, '').slice(0, 11);
  if (apenasNumeros.length <= 2) return apenasNumeros.length > 0 ? `(${apenasNumeros}` : apenasNumeros;
  if (apenasNumeros.length <= 3) return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2)}`;
  if (apenasNumeros.length <= 7) return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2, 3)} ${apenasNumeros.slice(3)}`;
  return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2, 3)} ${apenasNumeros.slice(3, 7)}-${apenasNumeros.slice(7)}`;
};

const PerfilPage = () => {
  const { profileId } = useAdminContext();
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [bio, setBio] = useState('');
  const [telefone, setTelefone] = useState('');
  const [slug, setSlug] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [phoneError, setPhoneError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from('profiles').select('*').eq('id', profileId).single().then(({ data }) => {
      if (data) {
        setNome(data.nome);
        setBio(data.bio || '');
        setTelefone(data.telefone ? aplicarMascaraTelefone(data.telefone) : '');
        setSlug(data.slug);
        setAvatarUrl(data.avatar_url || '');
      }
    });
  }, [profileId]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);

    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profileId);

      if (updateError) throw updateError;

      await refreshProfile();
      setAvatarUrl(publicUrl);
      toast.success('Foto atualizada!');
    } catch (error) {
      toast.error('Erro ao fazer upload');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.length !== 11) {
      setPhoneError(true);
      toast.error('Corrija o número do WhatsApp antes de salvar.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      nome,
      bio,
      telefone: telefoneLimpo,
      slug
    }).eq('id', profileId);

    setSaving(false);
    if (error) {
      if (error.message.includes('profiles_slug_key') || error.code === '23505') {
        toast.error('Este link (slug) já está em uso. Por favor, escolha outro.');
      } else {
        toast.error(error.message);
      }
      return;
    }
    await refreshProfile();
    toast.success('Perfil atualizado!');
    navigate('/admin');
  };

  const bookingUrl = `${window.location.origin}/agendar/${slug}`;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-display font-bold">Meu Perfil</h1>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="font-display">Foto de Perfil</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="relative group">
            <Avatar className="h-24 w-24 border-2 border-primary/20">
              <AvatarImage src={avatarUrl ? `${avatarUrl}?t=${new Date().getTime()}` : ''} className="object-cover" />
              <AvatarFallback className="gradient-rose text-primary-foreground text-2xl font-display">
                {nome.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              {uploading ? <Loader2 className="h-6 w-6 text-white animate-spin" /> : <Camera className="h-6 w-6 text-white" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div>
            <p className="font-medium">{nome || 'Seu nome'}</p>
            <p className="text-sm text-muted-foreground">Clique na foto para alterar</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="font-display">Informações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Nome</Label><Input value={nome} onChange={e => setNome(e.target.value)} /></div>
          <div>
            <Label>Slug (link único)</Label>
            <Input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
            <p className="text-xs text-muted-foreground mt-1">Seu link: {bookingUrl}</p>
          </div>
          <div className="space-y-1">
            <Label>WhatsApp</Label>
            <Input
              value={telefone}
              onChange={e => {
                const formatado = aplicarMascaraTelefone(e.target.value);
                setTelefone(formatado);
                if (formatado.replace(/\D/g, '').length === 11) setPhoneError(false);
              }}
              placeholder="(00) 0 0000-0000"
              maxLength={17}
              className={phoneError ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {phoneError ? (
              <p className="text-red-500 text-[11px] font-medium animate-in fade-in slide-in-from-top-1">
                O número deve conter exatamente 11 dígitos (DDD + 9 + número)
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Apenas números com DDD</p>
            )}
          </div>
          <div><Label>Bio</Label><Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Conte sobre você e seu trabalho..." rows={3} /></div>
          <Button onClick={handleSave} disabled={saving} className="gradient-rose text-primary-foreground">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : 'Salvar Perfil'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerfilPage;