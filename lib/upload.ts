const MAX_BREEDTE = 1200;
const MAX_BYTES = 500 * 1024;
const TOEGESTANE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function valideerAfbeelding(bestand: File): string | null {
  if (!TOEGESTANE_TYPES.includes(bestand.type)) return "Alleen jpg, png en webp zijn toegestaan";
  if (bestand.size > 10 * 1024 * 1024) return "Bestand is groter dan 10 MB";
  return null;
}

export async function comprimeerAfbeelding(bestand: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(bestand);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let breedte = img.width;
      let hoogte = img.height;

      if (breedte > MAX_BREEDTE) {
        hoogte = Math.round((hoogte * MAX_BREEDTE) / breedte);
        breedte = MAX_BREEDTE;
      }

      const canvas = document.createElement("canvas");
      canvas.width = breedte;
      canvas.height = hoogte;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas niet beschikbaar")); return; }
      ctx.drawImage(img, 0, 0, breedte, hoogte);

      // Probeer aflopende kwaliteit tot onder de grens
      const probeer = (kwaliteit: number) => {
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error("Compressie mislukt")); return; }
          if (blob.size <= MAX_BYTES || kwaliteit <= 0.25) {
            resolve(new File([blob], bestand.name, { type: "image/jpeg" }));
          } else {
            probeer(Math.round((kwaliteit - 0.1) * 10) / 10);
          }
        }, "image/jpeg", kwaliteit);
      };
      probeer(0.85);
    };

    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Afbeelding kon niet worden geladen")); };
    img.src = objectUrl;
  });
}

export async function uploadAfbeelding(bestand: File, bucket: string): Promise<string> {
  const fout = valideerAfbeelding(bestand);
  if (fout) throw new Error(fout);

  const gecomprimeerd = await comprimeerAfbeelding(bestand);

  const form = new FormData();
  form.append("bestand", gecomprimeerd);
  form.append("bucket", bucket);

  const res = await fetch("/api/admin/upload", { method: "POST", body: form });
  if (!res.ok) {
    const { fout: apiFout } = await res.json();
    throw new Error(apiFout ?? "Upload mislukt");
  }
  const { pad } = await res.json();
  return pad;
}

export function afbeeldingUrl(bucket: string, pad: string, supabaseUrl: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${pad}`;
}
