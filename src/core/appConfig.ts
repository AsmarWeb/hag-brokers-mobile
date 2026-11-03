import { safeMedia } from "./api";
export type AppConfig = {
  version: number;
  app_name: string;
  welcome_title_ar: string;
  welcome_title_en: string;
  welcome_body_ar: string;
  welcome_body_en: string;
  home_title_ar: string;
  home_title_en: string;
  home_body_ar: string;
  home_body_en: string;
  announcement_ar: string;
  announcement_en: string;
  welcome_enabled: boolean;
  show_marine: boolean;
  categories: string[];
  welcome_image: string | null;
  home_image: string | null;
};
export const defaultConfig: AppConfig = {
  version: 0,
  app_name: "HAG Brokers",
  welcome_title_ar: "بحر من الفرص. عالم من الأعمال.",
  welcome_title_en: "A sea of opportunity. A world of business.",
  welcome_body_ar:
    "وساطة الشحن البحري والفرص التجارية، من الإمارات إلى العالم.",
  welcome_body_en:
    "Sea freight brokerage and commercial opportunities, from the UAE to the world.",
  home_title_ar: "اكتشف فرصتك القادمة",
  home_title_en: "Discover your next opportunity",
  home_body_ar: "تواصل مع الشركات واكتشف فرص التجارة والأصول البحرية.",
  home_body_en: "Connect with companies. Discover trade and marine assets.",
  announcement_ar: "",
  announcement_en: "",
  welcome_enabled: true,
  show_marine: true,
  categories: [],
  welcome_image: null,
  home_image: null,
};
// Server content never supplies executable links, credentials or authorization rules.
export function parseAppConfig(raw: unknown, origin: string): AppConfig {
  const out = { ...defaultConfig };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const data = raw as Record<string, unknown>;
  for (const key of Object.keys(defaultConfig) as (keyof AppConfig)[]) {
    const value = data[key];
    if (key === "version") {
      if (Number.isSafeInteger(value) && Number(value) >= 0)
        out.version = Number(value);
    } else if (key === "categories") {
      if (Array.isArray(value))
        out.categories = [
          ...new Set(
            value.filter(
              (x): x is string =>
                typeof x === "string" && /^[a-z_]{1,40}$/.test(x),
            ),
          ),
        ].slice(0, 30);
    } else if (key === "welcome_enabled" || key === "show_marine") {
      if (typeof value === "boolean") out[key] = value;
    } else if (key === "welcome_image" || key === "home_image") {
      out[key] =
        typeof value === "string" ? (safeMedia(origin, value) ?? null) : null;
    } else if (typeof value === "string") {
      const max = key === "app_name" ? 40 : key.includes("title") ? 100 : 240;
      if (
        value.length <= max &&
        (value.trim() || key.startsWith("announcement") || key.includes("body"))
      )
        out[key] = value;
    }
  }
  return out;
}
