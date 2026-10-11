import type { Manifest } from "./types";

export function githubReleaseBase(): string {
  const repo = process.env.LESSON_GH_REPO || "Zaevian/lesson-library";
  const tag = process.env.LESSON_GH_TAG || "lessons";
  return `https://github.com/${repo}/releases/download/${tag}`;
}

/** Public URL of manifest.json in the Blob store. */
export function manifestUrl(): string | null {
  if (process.env.LESSON_MANIFEST_URL) return process.env.LESSON_MANIFEST_URL;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const m = token?.match(/^vercel_blob_rw_([A-Za-z0-9]+)_/);
  if (m) return `https://${m[1].toLowerCase()}.public.blob.vercel-storage.com/manifest.json`;
  return `${githubReleaseBase()}/manifest.json`;
}

export async function getManifest(): Promise<{ manifest: Manifest | null; error: string | null }> {
  const url = manifestUrl();
  if (!url) return { manifest: null, error: "Lesson storage is not configured yet." };
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return { manifest: null, error: `Could not load lessons (HTTP ${res.status}).` };
    const manifest = (await res.json()) as Manifest;
    return { manifest, error: null };
  } catch {
    return { manifest: null, error: "Could not load lessons right now." };
  }
}
