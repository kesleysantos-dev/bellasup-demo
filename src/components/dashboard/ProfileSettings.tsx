import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext'; // Importe o useAuth
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Camera, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const ProfileSettings = ({ profileId }: { profileId: string }) => {
  const { refreshProfile } = useAuth(); // Pega a função de atualização global
  const [nome, setNome] = useState('');
  const [bio, setBio] = useState('');
  const [telefone, setTelefone] = useState('');
  const [slug, setSlug] = useState('');
  const [fraseBoasVindas, setFraseBoasVindas] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from('profiles').select('*').eq('id', profileId).single().then(({ data }) => {
      if (data) {
        setNome(data.nome);
        setBio(data.bio || '');
        setTelefone(data.telefone || '');
        setSlug(data.slug);
        setFraseBoasVindas((data as any).frase_boas_vindas || '');
        setAvatarUrl(data.avatar_url);
      }
    });
  }, [profileId]);

  const handleUploadFoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      // Nome único para evitar cache do navegador
      const filePath = `${profileId}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl } as any)
        .eq('id', profileId);

      if (updateError) throw updateError;

      // ATUALIZAÇÃO GLOBAL: Avisa o AdminLayout e o resto do app
      await refreshProfile();

      setAvatarUrl(publicUrl);
      toast.success('Foto atualizada com sucesso!');

    } catch (error: any) {
      toast.error('Erro ao subir foto: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      nome,
      bio,
      telefone,
      slug,
      frase_boas_vindas: fraseBoasVindas
    } as any).eq('id', profileId);

    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      await refreshProfile(); // Atualiza nome globalmente também
      toast.success('Perfil atualizado!');
    }
  };

  const bookingUrl = `${window.location.origin}/agendar/${slug}`;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="font-display">Meu Perfil</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <Avatar className="h-24 w-24 border-2 border-primary/20">
              <AvatarImage src={avatarUrl || ''} className="object-cover" />
              <AvatarFallback className="bg-secondary text-xl">
                {nome.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full hover:scale-105 transition-transform shadow-lg"
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUploadFoto}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div><Label>Nome</Label><Input value={nome} onChange={e => setNome(e.target.value)} /></div>
          <div><Label>Slug (link único)</Label><Input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
            <p className="text-xs text-muted-foreground mt-1 break-all">Seu link: {bookingUrl}</p>
          </div>
          <div><Label>Telefone</Label><Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(11) 99999-0000" /></div>
          <div><Label>Bio</Label><Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Conte sobre você e seu trabalho..." rows={3} /></div>
          <div>
            <Label>Frase de Boas-vindas (Social Preview)</Label>
            <Textarea value={fraseBoasVindas} onChange={e => setFraseBoasVindas(e.target.value)} placeholder="Olá! Reserve seu momento de beleza comigo aqui ✨" rows={2} />
            <p className="text-xs text-muted-foreground mt-1">Aparece na descrição do link ao compartilhar no WhatsApp/Instagram.</p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full gradient-rose text-primary-foreground">
          {saving ? 'Salvando...' : 'Salvar Perfil'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProfileSettings;