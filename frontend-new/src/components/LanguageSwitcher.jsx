import React, { useEffect, useMemo, useState } from 'react';
import './LanguageSwitcher.css';

const DEFAULT_LANG = 'en';
const STORAGE_KEY = 'parkease_lang';
const GOOGLE_TRANSLATE_ELEMENT_ID = 'google_translate_element';
const GOOGLE_SCRIPT_ID = 'google-translate-script';

const ensureTranslateContainer = () => {
  let container = document.getElementById(GOOGLE_TRANSLATE_ELEMENT_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = GOOGLE_TRANSLATE_ELEMENT_ID;
    container.className = 'google-translate-container';
    document.body.appendChild(container);
  }
  return container;
};

const setTranslateCookie = (lang) => {
  const value = `/en/${lang}`;
  document.cookie = `googtrans=${value}; path=/`;
  document.cookie = `googtrans=${value}; path=/; domain=${window.location.hostname}`;
};

const initTranslate = () => {
  if (!window.google || !window.google.translate) return;
  if (!document.getElementById(GOOGLE_TRANSLATE_ELEMENT_ID)) return;
  if (window.__parkeaseTranslateInitialized) return;

  window.__parkeaseTranslateInitialized = true;
  // eslint-disable-next-line no-new
  new window.google.translate.TranslateElement(
    {
      pageLanguage: 'en',
      autoDisplay: false
    },
    GOOGLE_TRANSLATE_ELEMENT_ID
  );
};

const LanguageSwitcher = ({ className = '' }) => {
  const languages = useMemo(
    () => [
      { code: 'en', label: 'English' },
      { code: 'hi', label: 'Hindi' },
      { code: 'kn', label: 'Kannada' },
      { code: 'ta', label: 'Tamil' },
      { code: 'te', label: 'Telugu' },
      { code: 'ml', label: 'Malayalam' },
      { code: 'mr', label: 'Marathi' },
      { code: 'gu', label: 'Gujarati' },
      { code: 'bn', label: 'Bengali' },
      { code: 'ur', label: 'Urdu' },
      { code: 'es', label: 'Spanish' },
      { code: 'fr', label: 'French' },
      { code: 'de', label: 'German' },
      { code: 'ar', label: 'Arabic' },
      { code: 'zh-CN', label: 'Chinese' }
    ],
    []
  );

  const [language, setLanguage] = useState(() => localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG);

  useEffect(() => {
    ensureTranslateContainer();
    window.googleTranslateElementInit = initTranslate;

    if (!document.getElementById(GOOGLE_SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = GOOGLE_SCRIPT_ID;
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    } else {
      initTranslate();
    }

    const stored = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
    setTranslateCookie(stored);
  }, []);

  const handleChange = (event) => {
    const nextLang = event.target.value;
    setLanguage(nextLang);
    localStorage.setItem(STORAGE_KEY, nextLang);
    setTranslateCookie(nextLang);
    window.location.reload();
  };

  return (
    <div className={`lang-switcher ${className}`.trim()}>
      <select value={language} onChange={handleChange} aria-label="Select language">
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSwitcher;
