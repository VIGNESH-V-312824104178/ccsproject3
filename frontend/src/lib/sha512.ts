/** Client-side SHA-512 via the Web Crypto API – used only for the live "what the server will store" preview. */
export async function sha512Hex(input: string): Promise<string> {
  if (typeof window === "undefined" || !window.crypto?.subtle) return "";
  const buf = await window.crypto.subtle.digest("SHA-512", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
