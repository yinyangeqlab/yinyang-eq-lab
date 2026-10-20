// Apply after the framework response bridge and after access checks.
// Cloudflare derives Content-Length from the stream, rather than a header alone.
export function withMediaLength(request, response) {
  const headers = new Headers(response.headers);
  const length = Number(headers.get('X-Listening-Content-Length'));
  headers.delete('X-Listening-Content-Length');
  let body = response.body;
  if (new URL(request.url).pathname.startsWith('/api/listening-audio/') && request.method === 'GET' && (response.status === 200 || response.status === 206) && body && Number.isSafeInteger(length) && length > 0 && typeof FixedLengthStream !== 'undefined') {
    const fixed = new FixedLengthStream(length);
    void body.pipeTo(fixed.writable).catch(() => {});
    body = fixed.readable;
  }
  return new Response(body, {status:response.status,statusText:response.statusText,headers});
}
