import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Globe } from 'lucide-react';
import { useLanguage, Language } from '../contexts/LanguageContext';
import { useLocation, useNavigate } from 'react-router-dom';

interface LanguageSwitcherProps {
  showBackButton?: boolean;
  onBack?: () => void;
}

const languages = [
  { code: 'ru' as Language, name: 'RU', fullName: 'Русский' },
  { code: 'uz' as Language, name: 'UZ', fullName: 'O\'zbek' },
  { code: 'en' as Language, name: 'EN', fullName: 'English' },
];

export default function LanguageSwitcher({ showBackButton = false, onBack }: LanguageSwitcherProps) {
  const { language, cycleLanguage, t } = useLanguage();
  const [isAnimating, setIsAnimating] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const currentLanguage = languages.find(lang => lang.code === language);

  const handleLanguageChange = async () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    cycleLanguage();
    
    // Анимация длится 300ms
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="fixed top-4 left-4 z-50">
      <AnimatePresence mode="wait">
        {showBackButton ? (
          <motion.button
            key="back-button"
            initial={{ opacity: 0, x: -20, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBack}
            className="flex items-center space-x-2 bg-white/95 backdrop-blur-md border border-indigo-200/50 rounded-xl px-4 py-2.5 shadow-lg hover:shadow-xl transition-all duration-200 hover:border-indigo-300/70 group"
            data-back-button
          >
            <motion.div
              animate={{ x: [-2, 0, -2] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <ArrowLeft className="w-4 h-4 text-indigo-600 group-hover:text-indigo-700" />
            </motion.div>
            <span className="font-medium text-gray-900 group-hover:text-indigo-700">
              {t('common.back')}
            </span>
          </motion.button>
        ) : (
          <motion.button
            key="language-button"
            initial={{ opacity: 0, x: -20, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLanguageChange}
            disabled={isAnimating}
            className="flex items-center space-x-2 bg-white/95 backdrop-blur-md border border-indigo-200/50 rounded-xl px-4 py-2.5 shadow-lg hover:shadow-xl transition-all duration-200 min-w-[80px] hover:border-indigo-300/70 disabled:cursor-not-allowed"
          >
            <motion.div
              animate={isAnimating ? { 
                rotate: [0, 180, 360],
                scale: [1, 1.2, 1]
              } : {}}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <Globe className="w-4 h-4 text-indigo-600" />
            </motion.div>
            
            <motion.span 
              className="font-medium text-gray-900"
              animate={isAnimating ? {
                scale: [1, 1.1, 1],
                color: ['#111827', '#4f46e5', '#111827']
              } : {}}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {currentLanguage?.name}
            </motion.span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}