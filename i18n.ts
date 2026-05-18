import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";

export default getRequestConfig(async () => {
  // Get the locale from the URL pathname
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  // Extract locale from pathname
  const segments = pathname.split("/").filter(Boolean);
  let locale = segments[0];

  // Validate locale and provide fallback
  if (!locale || !["kk", "ru"].includes(locale)) {
    locale = "kk"; // Default fallback
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
