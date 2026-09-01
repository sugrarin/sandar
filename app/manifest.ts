import { MetadataRoute } from "next";
import { cookies } from "next/headers";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value || "kk";

  const name =
    locale === "ru"
      ? "SANDAR • Тренажёр счёта"
      : "SANDAR • Есептеу тренажері";

  const description =
    locale === "ru"
      ? "Тренажёр по математике для устного счёта: сложение, вычитание, умножение и деление."
      : "Математика тренажері: қосу, алу, көбейту және бөлу.";

  return {
    name,
    short_name: "SANDAR",
    description,
    start_url: "/",
    display: "standalone",
    background_color: "#f4f2ea",
    theme_color: "#111318",
    icons: [
      {
        src: "/favicon/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/favicon/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
