import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, HelpCircle, X, MessageCircle, User, LogOut } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { getStudent as getStudentService } from '../services/student';
import StudentAvatar from './StudentAvatar';
import { useStudentProfile } from '../hooks/useStudentProfiles';
import LanguageSwitcher from './LanguageSwitcher';
import type { Student } from '../lib/supabase';

interface HeaderProps {
  onShowAdminModal: () => void;
  showBackButton?: boolean;
  onBack?: () => void;
  hideButtons?: boolean;
}

export default function Header({ onShowAdminModal, showBackButton = false, onBack, hideButtons = false }: HeaderProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [savedStudent, setSavedStudent] = useState<{student: Student, className: string} | null>(null);
  
  // Загружаем профиль студента если есть сохраненный сеанс
  const { profile } = useStudentProfile(savedStudent?.student?.id || '');

  useEffect(() => {
    checkSavedSession();
  }, []);

  const checkSavedSession = async () => {
    try {
      const savedId = localStorage.getItem('studentId');
      const savedTime = localStorage.getItem('createdAt');
      const shouldSkipAutoLogin = localStorage.getItem('skipAutoLogin') === 'true';

      if (!savedId || !savedTime || shouldSkipAutoLogin) {
        return;
      }

      const now = Date.now();
      const diff = now - parseInt(savedTime, 10);

      // 3 дня = 259200000 мс
      if (diff > 259200000) {
        localStorage.removeItem('studentId');
        localStorage.removeItem('createdAt');
        localStorage.removeItem('studentDashboardData');
        return;
      }

      const student = await getStudentService(savedId);
      if (student) {
        // Здесь нужно получить название класса
        // Для простоты используем сохраненные данные дашборда
        const dashboardData = localStorage.getItem('studentDashboardData');
        if (dashboardData) {
          const parsed = JSON.parse(dashboardData);
          setSavedStudent({ student, className: parsed.className });
        }
      }
    } catch (err) {
      console.error('Error checking saved session:', err);
    }
  };

  const handleStudentClick = () => {
    if (savedStudent) {
      // Сохраняем данные для дашборда и переходим
      const dashboardData = { 
        student: savedStudent.student, 
        className: savedStudent.className 
      };
      localStorage.setItem('studentDashboardData', JSON.stringify(dashboardData));
      navigate('/student-dashboard');
    }
  };

  const getStudentDisplayName = () => {
    if (!savedStudent) return '';
    const nameParts = savedStudent.student.name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0]} ${nameParts[1]}`;
    }
    return savedStudent.student.name;
  };

  const handleLogoutFromHeader = () => {
    // Очищаем все данные сессии
    localStorage.removeItem('studentId');
    localStorage.removeItem('createdAt');
    localStorage.removeItem('studentDashboardData');
    localStorage.setItem('skipAutoLogin', 'true');
    
    // Обновляем состояние
    setSavedStudent(null);
    window.location.reload(); // Перезагружаем страницу для обновления состояния
  };

  return (
    <>
      <LanguageSwitcher showBackButton={showBackButton} onBack={onBack} />
      <header className="absolute top-0 left-0 right-0 z-40 p-4">
        <div className="flex justify-end items-center space-x-3">
          {savedStudent ? (
            /* Кнопка с именем студента при наличии сеанса */
            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStudentClick}
                className="flex items-center space-x-3 bg-white/95 backdrop-blur-md border border-green-200/50 hover:border-green-300/70 text-green-700 px-4 py-2 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <StudentAvatar 
                  student={savedStudent.student} 
                  avatarUrl={profile?.avatar_url}
                  size="sm"
                  className="w-6 h-6"
                />
                <div className="text-left">
                  <div className="text-sm font-medium">{getStudentDisplayName()}</div>
                  <div className="text-xs opacity-75">{savedStudent.className}</div>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </motion.button>
              
              {/* Кнопка выхода */}
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogoutFromHeader}
                className="flex items-center justify-center w-10 h-10 bg-white/90 backdrop-blur-md border border-red-200/50 hover:border-red-300/70 text-red-600 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                title="Выйти из аккаунта"
              >
                <LogOut className="w-4 h-4" />
              </motion.button>
            </div>
          ) : (
            /* Показываем кнопки только если hideButtons не установлен */
            !hideButtons && (
              <>
                {/* Кнопка "Как получить ключ?" */}
                <motion.button
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowKeyModal(true)}
                  className="flex items-center space-x-2 bg-white/90 backdrop-blur-md border border-indigo-200/50 hover:border-indigo-300/70 text-indigo-700 px-4 py-2 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:inline">{t('help.howToGetKey')}</span>
                  <span className="text-sm font-medium sm:hidden">{t('auth.enterKey')}?</span>
                </motion.button>

                {/* Кнопка авторизации */}
                <motion.button
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onShowAdminModal}
                  className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:inline">{t('admin.login')}</span>
                  <span className="text-sm font-medium sm:hidden">{t('auth.login')}</span>
                </motion.button>
              </>
            )
          )}
        </div>
      </header>

      {/* Модальное окно "Как получить ключ?" */}
      <AnimatePresence>
        {showKeyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/60 backdrop-blur-md flex items-center justify-center p-4 z-50"
            onClick={() => setShowKeyModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-indigo-100 overflow-hidden"
            >
              {/* Заголовок */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-5 border-b border-indigo-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">
                      {t('help.howToGetKey')}
                    </h2>
                    <p className="text-gray-600 text-sm">
                      {t('help.getKeyDesc')}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowKeyModal(false)}
                    className="p-2 hover:bg-white/70 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Контент */}
              <div className="p-6 space-y-4">
                {/* Кнопка Поддержка 1 */}
                <motion.a
                  href="https://t.me/MrDarkRyder"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-center space-x-3 w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <motion.div
                    animate={{ 
                      rotate: [0, -5, 5, -5, 0],
                      scale: [1, 1.05, 1, 1.05, 1]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 3
                    }}
                  >
                    <MessageCircle className="w-5 h-5" />
                  </motion.div>
                  <span className="font-medium">{t('help.support1')}</span>
                </motion.a>

                {/* Кнопка Поддержка 2 */}
                <motion.a
                  href="https://t.me/Jaysson_5557"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-center space-x-3 w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <motion.div
                    animate={{ 
                      rotate: [0, 5, -5, 5, 0],
                      scale: [1, 1.05, 1, 1.05, 1]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 3,
                      delay: 0.5
                    }}
                  >
                    <MessageCircle className="w-5 h-5" />
                  </motion.div>
                  <span className="font-medium">{t('help.support2')}</span>
                </motion.a>

                {/* Кнопка закрыть */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setShowKeyModal(false)}
                  className="w-full bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 py-3 px-4 rounded-xl transition-all duration-300 font-medium"
                >
                  {t('common.close')}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}