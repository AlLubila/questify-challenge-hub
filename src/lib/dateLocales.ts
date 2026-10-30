import { enUS, fr, pl, de, es } from "date-fns/locale";
import type { Language } from "@/lib/i18n";

export const dateLocales = { en: enUS, fr, pl, de, es } satisfies Record<Language, typeof enUS>;
