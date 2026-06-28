import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rpvlaahbvsxkwugdigxm.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwdmxhYWhidnN4a3d1Z2RpZ3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2OTM5NzMsImV4cCI6MjA4NzI2OTk3M30.xWVK-_4kiskGnEyFpZxSKtlgtbh5JC37Ft0dXAkG1y0';

const supabase = createClient(supabaseUrl, supabaseKey);

function esc(str: string) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default async function handler(req: any, res: any) {
  try {
    const slug = req.query.slug as string;
    if (!slug) {
      return res.status(400).send('Link inválido');
    }

    // Identificar host e protocolo reais
    const host = req.headers.host || 'bellasup.vercel.app';
    const forwardedProto = req.headers['x-forwarded-proto'];
    const protocol = forwardedProto ? forwardedProto.split(',')[0].trim() : 'https';
    const siteUrl = `${protocol}://${host}`;
    const bookingUrl = `${siteUrl}/agendar/${slug}`;

    const { data: profile } = await supabase
      .from('profiles')
      .select('nome, avatar_url, frase_boas_vindas, bio')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    const nome = profile?.nome || 'Profissional';
    const title = `Agendar com ${nome} | BellasUp`;
    const description = profile?.frase_boas_vindas || `Olá, agende seu horário com ${nome} de forma rápida e prática.`;

    let ogImage = '';
    const fallbackImage = `${siteUrl}/og-image.png`;

    if (profile?.avatar_url) {
      if (profile.avatar_url.startsWith('http')) {
        ogImage = profile.avatar_url;
      } else {
        // Obter URL pública direta SEM transforms (query params confundem crawlers de WhatsApp e FB)
        ogImage = supabase.storage.from('avatars').getPublicUrl(profile.avatar_url).data.publicUrl;
      }
    }

    const finalImage = ogImage || fallbackImage;

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">

<!-- Open Graph / Facebook / WhatsApp -->
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(bookingUrl)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(finalImage)}">
<meta property="og:image:secure_url" content="${esc(finalImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:site_name" content="BellasUp">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:url" content="${esc(bookingUrl)}">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(finalImage)}">

<link rel="canonical" href="${esc(bookingUrl)}">
</head>
<body>
  <h1>${esc(title)}</h1>
  <p>${esc(description)}</p>
  <img src="${esc(finalImage)}" alt="${esc(title)}" />
  <script>
    // Redireciona o usuário comum, caso acesse diretamente e não seja um crawler
    window.location.replace("${esc(bookingUrl)}");
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).send(html);
  } catch (error) {
    console.error('[og-share] erro', error);
    return res.status(500).send('Erro ao processar');
  }
}
