import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '../types';
import { translations } from '../lib/translations';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: typeof translations.mn;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'mn',
  setLang: () => {},
  t: translations.mn,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('aetheria_lang');
    return saved === 'en' ? 'en' : 'mn';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('aetheria_lang', newLang);
  };

  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
