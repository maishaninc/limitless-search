"use client";

import { useEffect } from "react";
import {
  detectPreferredLanguage,
  getTranslations,
  LANGUAGE_STORAGE_KEY,
  type Language,
  useLanguage,
} from "@/lib/i18n";

type LanguageInitializerProps = {
  initialLanguage: Language;
};

export function LanguageInitializer({ initialLanguage }: LanguageInitializerProps) {
  useEffect(() => {
    useLanguage.setState({
      language: initialLanguage,
      t: getTranslations(initialLanguage),
    });

    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const browserLanguage = detectPreferredLanguage(
      navigator.languages?.length ? Array.from(navigator.languages) : navigator.language,
    );
    const resolvedLanguage = savedLanguage
      ? detectPreferredLanguage(savedLanguage)
      : browserLanguage;

    if (resolvedLanguage !== initialLanguage) {
      useLanguage.getState().setLanguage(resolvedLanguage);
      return;
    }

    document.documentElement.lang = initialLanguage === "zh" ? "zh-CN" : initialLanguage;
  }, [initialLanguage]);

  useEffect(() => {
    const unsubscribe = useLanguage.subscribe((state) => {
      document.documentElement.lang = state.language === "zh" ? "zh-CN" : state.language;
    });

    return unsubscribe;
  }, []);

  return null;
}
