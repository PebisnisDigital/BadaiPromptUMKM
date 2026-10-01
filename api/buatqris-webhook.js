export async function POST(request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-buatqris-signature') || '';
  const eventName = request.headers.get('x-buatqris-event') || '';

  if (!signature) {
    return Response.json({ error: 'Missing signature' }, { status: 400 });
  }

  const upstream = await fetch('https://sgp.cloud.appwrite.io/v1/functions/payment-api/executions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': 'badai-prompt-umkm'
    },
    body: JSON.stringify({
      body: rawBody,
      async: false,
      path: '/webhook',
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-buatqris-signature': signature,
        'x-buatqris-event': eventName
      }
    })
  });

  const execution = await upstream.json().catch(() => ({}));
  let payload = {};
  try {
    payload = JSON.parse(execution.responseBody || '{}');
  } catch {
    payload = { ok: false, error: 'Invalid upstream response' };
  }

  const status = Number(execution.responseStatusCode || (upstream.ok ? 200 : upstream.status) || 500);
  return Response.json(payload, { status });
}

export function GET() {
  return Response.json({ ok: true, service: 'BuatQRIS webhook relay' });
}
