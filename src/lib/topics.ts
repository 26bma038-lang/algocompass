/** "dynamic-programming" → "Dynamic programming" (topic slugs are lowercase, hyphenated). */
export function humanizeTopic(slug: string): string {
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    // Malformed escape: show the slug as-is.
  }
  const words = decoded.replace(/[-_]+/g, " ").trim();
  return words ? words[0]!.toUpperCase() + words.slice(1) : slug;
}
