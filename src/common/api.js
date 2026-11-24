// Where the data comes from: the static files of public/data/ (scripts/prepareForFrontend.py).
export const DATA = `${import.meta.env.BASE_URL}data/`;

/**
 * A gzipped JSON file (public/data/details/*.json.gz), unpacked in the browser.
 * A server may also send it with Content-Encoding: gzip, in which case fetch has
 * unpacked it already: only bytes that start with the gzip magic are unpacked.
 */
export async function getGzipJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} (${url})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return JSON.parse(new TextDecoder().decode(bytes));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).json();
}

export async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} (${url})`);
  return response.json();
}
