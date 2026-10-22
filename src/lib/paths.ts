/** Root-relative URL under the GitHub Pages base (/sld/). */
export function href(path = ""): string {
  const base = import.meta.env.BASE_URL;
  const cleaned = String(path).replace(/^\/+/, "");
  if (!cleaned) return base;
  return `${base}${cleaned}`;
}
