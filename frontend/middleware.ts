
export const config = {
  matcher: ['/product/:path*'],
};

/**
 * ABYRA STORE - Edge Middleware for SEO/OG Tags
 * 
 * This middleware intercepts requests from social media bots (WhatsApp, FB, Twitter, etc.)
 * and serves a minimal HTML page with dynamic Open Graph tags for product pages.
 * 
 * Normal users will bypass this and receive the standard SPA index.html, 
 * where react-helmet-async will handle the tags for the browser.
 */
export default async function middleware(req: Request) {
  const userAgent = req.headers.get('user-agent') || '';
  
  // Detection for major social media bots that don't execute JS well
  const isBot = /twitterbot|facebookexternalhit|whatsapp|telegrambot|discordbot|googlebot|bingbot|slackbot/i.test(userAgent);
  const url = new URL(req.url);

  if (isBot && url.pathname.startsWith('/product/')) {
    const id = url.pathname.split('/').pop();
    if (!id) return;

    try {
      // Configuration from Environment Variables (set in Vercel Dashboard)
      const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hgayhvaskddmcetltkca.supabase.co';
      const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || ''; 
      
      if (!supabaseAnonKey) {
        // Fallback to standard flow if keys are missing in middleware environment
        return;
      }

      // Fetch product data directly from Supabase REST API (Edge-safe, no heavy SDK)
      const apiResponse = await fetch(
        `${supabaseUrl}/rest/v1/products?id=eq.${id}&select=*`,
        {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          }
        }
      );

      if (!apiResponse.ok) return;

      const products = await apiResponse.json();
      const product = products[0];

      if (product) {
        const title = `${product.name} | ABYRA STORE`;
        const description = product.description 
          ? product.description.substring(0, 160).replace(/[<>"]/g, '') 
          : "Discover premium handcrafted crochet art.";
        const image = (product.images && product.images[0]) 
          ? product.images[0] 
          : 'https://res.cloudinary.com/dze1d3uen/image/upload/q_auto/f_auto/v1778080269/sgtzcvsm6uvuc4oasne0.jpg';
        const productUrl = `https://abyra-store.meltazi.me/product/${id}`;

        // Return a lightweight HTML response with essential OG tags for the bot
        return new Response(
          `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="product">
  <meta property="og:url" content="${productUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">
  <meta property="og:site_name" content="ABYRA STORE">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${productUrl}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${image}">
</head>
<body>
  <h1>${product.name}</h1>
  <p>${product.description}</p>
</body>
</html>`,
          {
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
              'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600'
            }
          }
        );
      }
    } catch (error) {
      console.error('[SEO Middleware] Error:', error);
    }
  }
}
