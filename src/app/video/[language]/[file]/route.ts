import { githubReleaseBase } from "@/lib/manifest";

export const runtime = "edge";

const SAFE = /^[a-z0-9-]+\.mp4$/;

/**
 * Streams a lesson video stored as a GitHub release asset with a proper
 * video/mp4 content type and HTTP range support (needed for seeking / iOS).
 */
export async function GET(req: Request, ctx: { params: Promise<{ language: string; file: string }> }) {
  const { language, file } = await ctx.params;
  if (!["spanish", "russian"].includes(language) || !SAFE.test(file)) {
    return new Response("Not found", { status: 404 });
  }
  const headers: Record<string, string> = {};
  const range = req.headers.get("range");
  if (range) headers.range = range;

  const upstream = await fetch(`${githubReleaseBase()}/${language}-${file}`, { headers, redirect: "follow" });
  if (!upstream.ok && upstream.status !== 206) {
    return new Response("Not found", { status: upstream.status === 404 ? 404 : 502 });
  }

  const out = new Headers({
    "content-type": "video/mp4",
    "accept-ranges": "bytes",
    "cache-control": "public, max-age=3600, s-maxage=86400",
    "content-disposition": `inline; filename="${language}-${file}"`,
  });
  for (const h of ["content-length", "content-range", "etag", "last-modified"]) {
    const v = upstream.headers.get(h);
    if (v) out.set(h, v);
  }
  return new Response(upstream.body, { status: upstream.status, headers: out });
}

export async function HEAD(req: Request, ctx: { params: Promise<{ language: string; file: string }> }) {
  const res = await GET(req, ctx);
  res.body?.cancel();
  return new Response(null, { status: res.status, headers: res.headers });
}
