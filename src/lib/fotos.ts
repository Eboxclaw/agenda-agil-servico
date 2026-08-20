/** Compressão de fotografias antes de guardar no IndexedDB. */
export async function comprimirFoto(
  entrada: Blob,
  maxLado = 1600,
  qualidade = 0.82,
): Promise<Blob> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return entrada;
  try {
    const bitmap = await createImageBitmap(entrada, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * escala);
    const h = Math.round(bitmap.height * escala);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return entrada;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const saida = await new Promise<Blob | null>((r) =>
      canvas.toBlob((b) => r(b), "image/jpeg", qualidade),
    );
    if (!saida) return entrada;
    return saida.size < entrada.size ? saida : entrada;
  } catch {
    return entrada;
  }
}
