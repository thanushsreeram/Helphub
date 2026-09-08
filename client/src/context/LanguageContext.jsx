import { createContext, useContext, useState } from "react";
import {
  translations,
  categoryTranslationMap,
  dayTranslationMap,
} from "../translations/translations";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem("helphub_language") || "en";
  });

  const setLanguage = (lang) => {
    if (translations[lang]) {
      setLanguageState(lang);
      localStorage.setItem("helphub_language", lang);
    }
  };

  const t = (key, fallback = "") => {
    const langDict = translations[language] || translations.en;
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    const fallbackDict = translations.en;
    if (fallbackDict && fallbackDict[key]) {
      return fallbackDict[key];
    }
    return fallback || key;
  };

  const tCategory = (categoryName) => {
    if (!categoryName) return "";
    const key = categoryTranslationMap[categoryName];
    if (key) {
      return t(key, categoryName);
    }
    return categoryName;
  };

  const tDay = (dayName) => {
    if (!dayName) return "";
    const key = dayTranslationMap[dayName];
    if (key) {
      return t(key, dayName);
    }
    return dayName;
  };

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t, tCategory, tDay }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
