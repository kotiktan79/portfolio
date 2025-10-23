import { Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import { setLanguage, getLanguage, Language } from '../lib/i18n';

export function LanguageSwitcher() {
  const [currentLang, setCurrentLang] = useState<Language>(getLanguage());

  useEffect(() => {
    setLanguage(currentLang);
    window.location.reload();
  }, [currentLang]);

  return (
    <button
      onClick={() => setCurrentLang(currentLang === 'tr' ? 'en' : 'tr')}
      className="flex items-center gap-2 px-3 py-2 bg-white bg-opacity-15 hover:bg-opacity-25 text-white rounded-lg transition-all backdrop-blur-md shadow-md border border-white/20 hover:scale-105"
      title={currentLang === 'tr' ? 'Switch to English' : 'Türkçeye Geç'}
    >
      <Globe size={18} />
      <span className="text-sm font-semibold uppercase">{currentLang}</span>
    </button>
  );
}
