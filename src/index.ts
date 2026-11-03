// Flow State Studio portal — Cloudflare Worker entry point.

const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Flow State Studio</title>
  <style>
    :root { --navy:#09003e; --lavender:#9982e3; --pink:#e64fb9; --flame:#ee2405; }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100vh; display:grid; place-items:center; padding:16px;
      background:var(--navy); color:#fff; font-family:"Helvetica Neue",Arial,sans-serif; text-align:center; }
    h1 { font-size:clamp(2rem,6vw,4rem); text-transform:uppercase; line-height:1.05; margin:0 0 1rem; }
    p { color:var(--lavender); letter-spacing:.08em; text-transform:uppercase; margin:0; }
  </style>
</head>
<body>
  <main>
    <h1>Find your<br>flow state.</h1>
    <p>Opening Nov 2026 · Cedar Grove, NJ</p>
  </main>
</body>
</html>`;

export default {
  async fetch(request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, service: "flow-state" });
    }

    if (url.pathname === "/") {
      return new Response(page, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler;
