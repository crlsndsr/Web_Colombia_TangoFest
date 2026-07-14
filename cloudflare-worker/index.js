/**
 * Cloudflare Worker — Meta Conversion API proxy
 * Deploy with: wrangler deploy
 * Set secrets:  wrangler secret put META_PIXEL_ID
 *               wrangler secret put META_ACCESS_TOKEN
 */

const ALLOWED_EVENTS = new Set(['Contact', 'Lead', 'InitiateCheckout', 'ViewContent', 'PageView']);

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(allowedOrigin),
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Origin check
    const origin = request.headers.get('Origin');
    if (allowedOrigin && origin && origin !== allowedOrigin) {
      return jsonResponse({ error: 'Origen no autorizado' }, 403, allowedOrigin);
    }

    try {
      const body = await request.json();
      const { eventName, userData, customData } = body;

      if (!eventName || !ALLOWED_EVENTS.has(eventName)) {
        return jsonResponse({ error: 'Evento no permitido' }, 400, allowedOrigin);
      }

      const pixelId = env.META_PIXEL_ID;
      const accessToken = env.META_ACCESS_TOKEN;
      const apiVersion = env.META_API_VERSION ?? 'v22.0';

      if (!pixelId || !accessToken) {
        return jsonResponse({ error: 'Error de configuración del servidor' }, 500, allowedOrigin);
      }

      const metaPayload = {
        data: [{
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          user_data: {
            // CF-Connecting-IP is the real client IP (more reliable than x-forwarded-for)
            client_ip_address: request.headers.get('CF-Connecting-IP') ?? '',
            client_user_agent: request.headers.get('User-Agent') ?? '',
            ...(userData ?? {}),
          },
          custom_data: customData ?? {},
        }],
      };

      const metaRes = await fetch(
        `https://graph.facebook.com/${apiVersion}/${pixelId}/events?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metaPayload),
        }
      );

      const metaResult = await metaRes.json();

      if (!metaRes.ok) {
        console.error('Meta CAPI error:', JSON.stringify(metaResult));
        return jsonResponse({ error: 'Error enviando evento a Meta' }, metaRes.status, allowedOrigin);
      }

      return jsonResponse({ success: true }, 200, allowedOrigin);

    } catch (err) {
      console.error('Worker error:', err);
      return jsonResponse({ error: 'Error interno del servidor' }, 500, allowedOrigin);
    }
  },
};

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}
