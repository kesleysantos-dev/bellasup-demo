import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
const siteUrl = Deno.env.get('SITE_URL') || 'https://bellasup.vercel.app'

const CRAWLER_REGEX = /facebookexternalhit|Facebot|Twitterbot|WhatsApp|LinkedInBot|Slackbot|TelegramBot|Discordbot|Googlebot|bingbot|Pinterestbot|vkShare/i

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const url = new URL(req.url)
    const slug = url.searchParams.get('slug')

    if (!slug) {
      return new Response('Link invalido', { status: 400 })
    }

    const bookingUrl = `${siteUrl}/agendar/${slug}`
    const userAgent = req.headers.get('user-agent') || ''
    const isCrawler = CRAWLER_REGEX.test(userAgent)

    // Real browsers: immediate 302 redirect (no HTML rendering needed)
    if (!isCrawler) {
      return new Response(null, {
        status: 302,
        headers: { 'Location': bookingUrl },
      })
    }

    // Crawlers only: serve OG meta tags as HTML
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: profile } = await supabase
      .from('profiles')
      .select('nome, avatar_url, frase_boas_vindas, bio')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    const nome = profile?.nome || 'Profissional'
    const title = `Agendamento Online - ${nome}`
    const description = `Olá, agende seu horário na ${nome}`

    let ogImage = ''
    const fallbackImage = `${siteUrl}/logo.png`
    if (profile?.avatar_url) {
      ogImage = profile.avatar_url.startsWith('http')
        ? profile.avatar_url
        : `${supabaseUrl}/storage/v1/render/image/public/avatars/${profile.avatar_url}?width=400&height=400&resize=contain`
    }

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(bookingUrl)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(ogImage || fallbackImage)}">
<meta property="og:image:width" content="600">
<meta property="og:image:height" content="600">
<meta property="og:site_name" content="BellasUp">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(ogImage || fallbackImage)}">
<link rel="canonical" href="${esc(bookingUrl)}">
</head>
<body><p>Redirecionando...</p></body>
</html>`

    return new Response(html, {
      status: 200,
      headers: new Headers({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      }),
    })
  } catch (error) {
    console.error('[og-share] erro', error)
    return new Response('Erro ao processar', { status: 500 })
  }
})
