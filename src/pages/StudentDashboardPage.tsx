import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, FileText, MoreVertical, LogOut, Trash2, User as UserIcon, Calendar, MessageCircle, Gamepad2, Timer, Clock } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import StudentAvatar from '../components/StudentAvatar';
import { usePreloadedData } from '../hooks/usePreloadedData';
import { useRealtimeLessonTimer } from '../hooks/useRealtimeLessonTimer';
import { supabase } from '../lib/supabase';
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
      loadSchedule(data.student.class_id);
    } else {
      navigate('/', { replace: true });
    }
  }, [navigate]);

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

  if (!studentData) {
    return null;
  }

  const { student, className } = studentData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {t('home.welcome')}, {getStudentName()}!
                </h1>
              </div>
              <p className="text-gray-600">
                {t('home.class')} {className}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Session Indicator */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-3 h-3 bg-green-500 rounded-full shadow-lg animate-pulse"
                title="Активный сеанс"
              />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center justify-center w-10 h-10 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-600" />
                  </motion.button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent 
                  align="end" 
                  className="w-48 mt-2"
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
                        onClick={handleProfileClick}
                        className="cursor-pointer"
                      >
                        <UserIcon className="w-4 h-4 mr-3 text-indigo-500" />
                        <span className="text-gray-700">Профиль</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem 
                        onClick={handleScheduleClick}
                        className="cursor-pointer"
                      >
                        <Calendar className="w-4 h-4 mr-3 text-blue-500" />
                        <span className="text-gray-700">Расписание</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem 
                        onClick={handleChatClick}
                        className="cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4 mr-3 text-green-500" />
                        <span className="text-gray-700">Чат класса</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem 
                        onClick={handleGamesClick}
                        className="cursor-pointer"
                      >
                        <Gamepad2 className="w-4 h-4 mr-3 text-purple-500" />
                        <span className="text-gray-700">Игры с классом</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem 
                        onClick={handleForgetSession}
                        className="cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 mr-3 text-orange-500" />
                        <span className="text-gray-700">Забыть сеанс (полный выход)</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem 
                        onClick={handleLogout}
                        className="cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 mr-3 text-red-500" />
                        <span className="text-gray-700">Выйти (сеанс сохранится)</span>
                      </DropdownMenuItem>
                    </div>
                  </motion.div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Индикатор предзагруженных данных */}
        {preloadedData && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 text-center"
          >
            <div className="inline-flex items-center space-x-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Данные предзагружены • Быстрая навигация активна</span>
            </div>
          </motion.div>
        )}

        {/* Main Dashboard */}
        <div className="space-y-8">
          {/* Current Lesson Widget */}
          {schedule.length > 0 && (currentLesson.current || currentLesson.isBreak) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 max-w-4xl mx-auto"
            >
              {currentLesson.current ? (
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <Timer className="w-6 h-6 text-indigo-600" />
                    <h3 className="text-xl font-bold text-gray-900">Идет урок</h3>
                  </div>
                  
                  <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200 mb-4">
                    <h4 className="text-lg font-semibold text-indigo-900 mb-2">
                      {currentLesson.current.subject}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-indigo-800 mb-4">
                      <div className="flex items-center justify-center space-x-2">
                        <User className="w-4 h-4" />
                        <span>{currentLesson.current.teacher}</span>
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <MapPin className="w-4 h-4" />
                        <span>{currentLesson.current.room}</span>
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>
                          {currentLesson.current.start_time.slice(0, 5)} - {currentLesson.current.end_time.slice(0, 5)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-indigo-600 text-white px-6 py-3 rounded-xl inline-flex items-center space-x-3">
                      <Timer className="w-5 h-5" />
                      <div className="text-center">
                        <div className="font-mono text-2xl font-bold">
                          {String(currentLesson.timeLeft.hours).padStart(2, '0')}:
                          {String(currentLesson.timeLeft.minutes).padStart(2, '0')}:
                          {String(currentLesson.timeLeft.seconds).padStart(2, '0')}
                        </div>
                        <div className="text-xs text-indigo-200 mt-1">до окончания урока</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : currentLesson.isBreak && currentLesson.next ? (
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <Clock className="w-6 h-6 text-blue-600" />
                    <h3 className="text-xl font-bold text-gray-900">Перемена</h3>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="text-md font-semibold text-gray-900 mb-2">Следующий урок:</h4>
                    <div className="flex items-center justify-center space-x-4 mb-3">
                      <span className="text-blue-800 font-medium">{currentLesson.next.subject}</span>
                      <span className="text-sm text-blue-600">
                        {currentLesson.next.start_time.slice(0, 5)} - {currentLesson.next.end_time.slice(0, 5)}
                      </span>
                    </div>
                    
                    <div className="bg-blue-600 text-white px-6 py-3 rounded-xl inline-flex items-center space-x-3">
                      <Timer className="w-5 h-5" />
                      <div className="text-center">
                        <div className="font-mono text-2xl font-bold">
                          {String(currentLesson.timeUntilNext.hours).padStart(2, '0')}:
                          {String(currentLesson.timeUntilNext.minutes).padStart(2, '0')}:
                          {String(currentLesson.timeUntilNext.seconds).padStart(2, '0')}
                        </div>
                        <div className="text-xs text-blue-200 mt-1">до начала урока</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </motion.div>
          )}

          {/* Main Dashboard Cards */}
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto"
          >
            <motion.div
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/student-sor')}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 p-8"
            >
              <div className="text-center">
                <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('dashboard.sor')}</h2>
                <p className="text-gray-600">{t('dashboard.sorDesc')}</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/student-soch')}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 p-8"
            >
              <div className="text-center">
                <div className="bg-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-10 h-10 text-purple-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('dashboard.soch')}</h2>
                <p className="text-gray-600">{t('dashboard.sochDesc')}</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}