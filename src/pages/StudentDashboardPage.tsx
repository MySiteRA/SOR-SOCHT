import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, FileText, MoreVertical, LogOut, Trash2, User as UserIcon, Calendar, MessageCircle, Gamepad2, Timer, Clock, User, MapPin, ArrowRight, Menu, X, Home } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import StudentAvatar from '../components/StudentAvatar';
import { usePreloadedData } from '../hooks/usePreloadedData';
import { useRealtimeLessonTimer } from '../hooks/useRealtimeLessonTimer';
import { supabase } from '../lib/supabase';
import { checkStudentKeyValidity } from '../lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import type { Student } from '../lib/supabase';

export default function StudentDashboardPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<{student: Student, className: string} | null>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Используем предзагруженные данные
  const { data: preloadedData } = usePreloadedData();

  // Используем хук для реального времени урока
  const currentLesson = useRealtimeLessonTimer({
    classId: studentData?.student.class_id || '',
    schedule
  });

  useEffect(() => {
    const saved = localStorage.getItem('studentDashboardData');
    if (saved) {
      const data = JSON.parse(saved);
      setStudentData(data);
      
      // Проверяем валидность ключа студента
      validateStudentKey(data.student.id);
      
      loadSchedule(data.student.class_id);
    } else {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const validateStudentKey = async (studentId: string) => {
    try {
      const isValid = await checkStudentKeyValidity(studentId);
      
      if (!isValid) {
        // Ключ больше не валиден, принудительно разлогиниваем
        localStorage.removeItem('studentDashboardData');
        localStorage.removeItem('studentId');
        localStorage.removeItem('createdAt');
        localStorage.setItem('skipAutoLogin', 'true');
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error('Error validating student key:', error);
      // В случае ошибки проверки, не разлогиниваем
    }
  };

  const loadSchedule = async (classId: string) => {
    try {
      const { data, error } = await supabase
        .from('schedule')
        .select('*')
        .eq('class_id', classId)
        .order('day_of_week')
        .order('lesson_number');

      if (error) throw error;
      setSchedule(data || []);
    } catch (err) {
      console.error('Error loading schedule:', err);
    }
  };

  const handleLogout = () => {
    // НЕ удаляем данные сеанса при обычном выходе
    localStorage.removeItem('studentDashboardData');
    navigate('/', { replace: true });
  };

  const handleForgetSession = () => {
    // Полностью удаляем сеанс только при явном действии "забыть сеанс"
    localStorage.removeItem('studentId');
    localStorage.removeItem('createdAt');
    localStorage.removeItem('studentDashboardData');
    localStorage.setItem('skipAutoLogin', 'true');
    navigate('/', { replace: true });
  };

  const handleProfileClick = () => {
    navigate('/student-profile');
  };

  const handleScheduleClick = () => {
    navigate('/student-schedule');
  };

  const handleChatClick = () => {
    navigate('/student-chat');
  };

  const handleGamesClick = () => {
    navigate('/student-games');
  };
  
  const getStudentName = () => {
    if (!studentData) return '';
    const nameParts = studentData.student.name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0]} ${nameParts[1]}`;
    }
    return studentData.student.name;
  };

  // Функция для получения текущего предмета по расписанию
  const getCurrentSubjectInfo = () => {
    if (!currentLesson.current) return null;
    
    const subject = currentLesson.current.subject;
    const timeRange = `${currentLesson.current.start_time.slice(0, 5)} - ${currentLesson.current.end_time.slice(0, 5)}`;
    
    return { subject, timeRange };
  };

  // Функция для получения следующего предмета по расписанию
  const getNextSubjectInfo = () => {
    if (!currentLesson.next) return null;
    
    const subject = currentLesson.next.subject;
    const timeRange = `${currentLesson.next.start_time.slice(0, 5)} - ${currentLesson.next.end_time.slice(0, 5)}`;
    
    return { subject, timeRange };
  };
  if (!studentData) {
    return null;
  }

  const { student, className } = studentData;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3 flex-1"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-md">
                <Home className="w-5 h-5 text-white" />
              </div>
              <div className="hidden md:block">
                <h1 className="text-lg font-bold text-gray-900">
                  {getStudentName()}
                </h1>
                <p className="text-xs text-gray-600">{className}</p>
              </div>
            </motion.div>

            <div className="flex items-center space-x-2 md:space-x-3">
              {/* Session Indicator */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-2 h-2 bg-green-500 rounded-full shadow-lg animate-pulse"
                title="Активный сеанс"
              />

              {/* Desktop Menu */}
              <div className="hidden md:flex items-center space-x-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleProfileClick}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Профиль"
                >
                  <UserIcon className="w-5 h-5 text-gray-600" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleScheduleClick}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Расписание"
                >
                  <Calendar className="w-5 h-5 text-gray-600" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleChatClick}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Чат класса"
                >
                  <MessageCircle className="w-5 h-5 text-gray-600" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleGamesClick}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Игры"
                >
                  <Gamepad2 className="w-5 h-5 text-gray-600" />
                </motion.button>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 text-gray-600" />
                ) : (
                  <Menu className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {/* More Options */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-600" />
                  </motion.button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-48"
                  asChild
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    <div>
                      <DropdownMenuItem
                        onClick={() => { handleForgetSession(); setMobileMenuOpen(false); }}
                        className="cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 mr-3 text-orange-500" />
                        <span>Полный выход</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                        className="cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 mr-3 text-red-500" />
                        <span>Выход</span>
                      </DropdownMenuItem>
                    </div>
                  </motion.div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden mt-3 pt-3 border-t border-gray-100 space-y-2"
              >
                <button
                  onClick={() => { handleProfileClick(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <UserIcon className="w-5 h-5 text-blue-500" />
                  <span className="font-medium text-gray-700">Профиль</span>
                </button>

                <button
                  onClick={() => { handleScheduleClick(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <Calendar className="w-5 h-5 text-green-500" />
                  <span className="font-medium text-gray-700">Расписание</span>
                </button>

                <button
                  onClick={() => { handleChatClick(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <MessageCircle className="w-5 h-5 text-cyan-500" />
                  <span className="font-medium text-gray-700">Чат класса</span>
                </button>

                <button
                  onClick={() => { handleGamesClick(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <Gamepad2 className="w-5 h-5 text-purple-500" />
                  <span className="font-medium text-gray-700">Игры с классом</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 md:py-12">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Current Lesson Widget */}
          {schedule.length > 0 && (currentLesson.current || currentLesson.isBreak) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-6 md:p-8 text-white shadow-lg overflow-hidden relative">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16"></div>

                <div className="relative z-10">
                  {currentLesson.current ? (
                    <div>
                      <div className="flex items-center space-x-3 mb-4">
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                        >
                          <Timer className="w-6 h-6" />
                        </motion.div>
                        <h3 className="text-lg font-bold">Идет урок сейчас</h3>
                      </div>

                      <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        {currentLesson.current.subject}
                      </h2>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                          <p className="text-white/70 text-sm">Преподаватель</p>
                          <p className="font-semibold">{currentLesson.current.teacher}</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                          <p className="text-white/70 text-sm">Кабинет</p>
                          <p className="font-semibold">{currentLesson.current.room}</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                          <p className="text-white/70 text-sm">Время</p>
                          <p className="font-semibold">
                            {currentLesson.current.start_time.slice(0, 5)} - {currentLesson.current.end_time.slice(0, 5)}
                          </p>
                        </div>
                      </div>

                      <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 inline-flex items-center space-x-3">
                        <div>
                          <div className="text-4xl font-mono font-bold">
                            {String(currentLesson.timeLeft.hours).padStart(2, '0')}:
                            {String(currentLesson.timeLeft.minutes).padStart(2, '0')}:
                            {String(currentLesson.timeLeft.seconds).padStart(2, '0')}
                          </div>
                          <div className="text-sm text-white/80">Осталось</div>
                        </div>
                      </div>
                    </div>
                  ) : currentLesson.isBreak && currentLesson.next ? (
                    <div>
                      <div className="flex items-center space-x-3 mb-4">
                        <Clock className="w-6 h-6" />
                        <h3 className="text-lg font-bold">Перемена</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-white/70 text-sm mb-2">Следующий урок</p>
                          <h2 className="text-3xl font-bold mb-2">{currentLesson.next.subject}</h2>
                          <p className="text-white/80 text-sm">
                            {currentLesson.next.start_time.slice(0, 5)} - {currentLesson.next.end_time.slice(0, 5)}
                          </p>
                        </div>

                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-3xl font-mono font-bold">
                              {String(currentLesson.timeUntilNext.hours).padStart(2, '0')}:
                              {String(currentLesson.timeUntilNext.minutes).padStart(2, '0')}:
                              {String(currentLesson.timeUntilNext.seconds).padStart(2, '0')}
                            </div>
                            <div className="text-sm text-white/80">До начала</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </motion.div>
          )}

          {/* Quick Subject Access Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* СОР Button */}
              <motion.div
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/student-sor')}
                className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border border-gray-100 p-6 md:p-8"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="bg-gradient-to-br from-green-100 to-emerald-100 w-14 h-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <BookOpen className="w-7 h-7 text-green-600" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-green-600 transition-colors transform group-hover:translate-x-1" />
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">{t('dashboard.sor')}</h3>
                    <p className="text-gray-600 text-sm">{t('dashboard.sorDesc')}</p>
                  </div>

                  {getCurrentSubjectInfo() && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                      <p className="text-xs text-green-600 font-medium">СЕЙЧАС</p>
                      <p className="font-semibold text-green-900">{getCurrentSubjectInfo()!.subject}</p>
                      <p className="text-xs text-green-700">{getCurrentSubjectInfo()!.timeRange}</p>
                    </div>
                  )}
                  {!getCurrentSubjectInfo() && getNextSubjectInfo() && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                      <p className="text-xs text-gray-500 font-medium">СЛЕДУЮЩИЙ</p>
                      <p className="font-semibold text-gray-900">{getNextSubjectInfo()!.subject}</p>
                      <p className="text-xs text-gray-600">{getNextSubjectInfo()!.timeRange}</p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* СОЧ Button */}
              <motion.div
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/student-soch')}
                className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border border-gray-100 p-6 md:p-8"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="bg-gradient-to-br from-amber-100 to-orange-100 w-14 h-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FileText className="w-7 h-7 text-orange-600" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-orange-600 transition-colors transform group-hover:translate-x-1" />
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">{t('dashboard.soch')}</h3>
                    <p className="text-gray-600 text-sm">{t('dashboard.sochDesc')}</p>
                  </div>

                  {getCurrentSubjectInfo() && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                      <p className="text-xs text-orange-600 font-medium">СЕЙЧАС</p>
                      <p className="font-semibold text-orange-900">{getCurrentSubjectInfo()!.subject}</p>
                      <p className="text-xs text-orange-700">{getCurrentSubjectInfo()!.timeRange}</p>
                    </div>
                  )}
                  {!getCurrentSubjectInfo() && getNextSubjectInfo() && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                      <p className="text-xs text-gray-500 font-medium">СЛЕДУЮЩИЙ</p>
                      <p className="font-semibold text-gray-900">{getNextSubjectInfo()!.subject}</p>
                      <p className="text-xs text-gray-600">{getNextSubjectInfo()!.timeRange}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Info Banner */}
          {preloadedData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-4 flex items-center space-x-3"
            >
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <div>
                <p className="text-sm font-medium text-blue-900">Данные готовы к использованию</p>
                <p className="text-xs text-blue-700">Быстрая навигация активна</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}