import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, MapPin, User, MoreVertical, LogOut, Trash2, User as UserIcon, MessageCircle, CheckCircle, Gamepad2, Timer } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { supabase } from '../lib/supabase';
import { getLatestScheduleForClass } from '../lib/api';
import { checkStudentKeyValidity } from '../lib/api';
import { useRealtimeLessonTimer } from '../hooks/useRealtimeLessonTimer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import type { Student } from '../lib/supabase';

interface ScheduleItem {
  id: string;
  class_id: string;
  day_of_week: string;
  lesson_number: number;
  subject: string;
  teacher: string;
  room: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export default function StudentSchedulePage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<{student: Student, className: string} | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [scheduleFileUrl, setScheduleFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Используем хук для реального времени урока
  const currentLesson = useRealtimeLessonTimer({
    classId: studentData?.student.class_id || '',
    schedule
  });

  const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

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
  }, []);

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
      setLoading(true);
      setError(null);

      const { data, error: scheduleError } = await supabase
        .from('schedule')
        .select('*')
        .eq('class_id', classId)
        .order('day_of_week')
        .order('lesson_number');

      if (scheduleError) throw scheduleError;

      setSchedule(data || []);

      // Fetch the latest schedule file URL
      try {
        const scheduleFile = await getLatestScheduleForClass(classId);
        setScheduleFileUrl(scheduleFile?.public_url || null);
      } catch (err) {
        console.warn('Could not load schedule file URL:', err);
        setScheduleFileUrl(null);
      }
    } catch (err) {
      setError('Ошибка загрузки расписания');
    } finally {
      setLoading(false);
    }
  };

  const getScheduleForDay = (day: string) => {
    return schedule
      .filter(item => item.day_of_week === day)
      .sort((a, b) => a.lesson_number - b.lesson_number);
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5); // Убираем секунды
  };

  const handleLogout = () => {
    localStorage.removeItem('studentDashboardData');
    navigate('/', { replace: true });
  };

  const handleForgetSession = () => {
    localStorage.removeItem('studentId');
    localStorage.removeItem('createdAt');
    localStorage.removeItem('studentDashboardData');
    localStorage.setItem('skipAutoLogin', 'true');
    navigate('/', { replace: true });
  };

  const handleProfileClick = () => {
    navigate('/student-profile');
  };

  const handleChatClick = () => {
    navigate('/student-chat');
  };

  const handleGamesClick = () => {
    navigate('/student-games');
  };

  if (!studentData) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/student-dashboard')}
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>{t('common.back')}</span>
            </button>

            <div className="text-center">
              <h1 className="text-xl font-bold text-slate-900">Расписание</h1>
              <p className="text-sm text-slate-600">{studentData.className}</p>
            </div>

            <div className="flex items-center space-x-3">
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-3 h-3 bg-emerald-500 rounded-full shadow-lg animate-pulse"
                title="Активный сеанс"
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center justify-center w-10 h-10 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-all duration-200"
                  >
                    <MoreVertical className="w-5 h-5 text-slate-600" />
                  </motion.button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-48 mt-2" asChild>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    <div>
                      <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer">
                        <UserIcon className="w-4 h-4 mr-3 text-blue-500" />
                        <span className="text-slate-700">Профиль</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={handleChatClick} className="cursor-pointer">
                        <MessageCircle className="w-4 h-4 mr-3 text-emerald-500" />
                        <span className="text-slate-700">Чат класса</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={handleGamesClick} className="cursor-pointer">
                        <Gamepad2 className="w-4 h-4 mr-3 text-cyan-500" />
                        <span className="text-slate-700">Игры</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={handleForgetSession} className="cursor-pointer">
                        <Trash2 className="w-4 h-4 mr-3 text-orange-500" />
                        <span className="text-slate-700">Забыть сеанс</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                        <LogOut className="w-4 h-4 mr-3 text-red-500" />
                        <span className="text-slate-700">Выйти</span>
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
        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6"
          >
            {error}
          </motion.div>
        )}

        {/* Current Lesson Status */}
        {schedule.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg border border-slate-200 p-6 mb-8 shadow-sm"
          >
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center space-x-2">
              <Timer className="w-5 h-5 text-blue-600" />
              <span>Текущий урок</span>
            </h2>
            
            {currentLesson.isFinished ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Занятия закончились</h3>
                <p className="text-slate-600">Хорошего дня!</p>
              </div>
            ) : currentLesson.isBreak ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Перемена</h3>
                {currentLesson.next && (
                  <>
                    <p className="text-slate-600 mb-4 text-sm">Следующий урок:</p>
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 inline-block">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-blue-900 font-semibold">{currentLesson.next.subject}</span>
                        <span className="text-sm text-blue-700 ml-4">
                          {formatTime(currentLesson.next.start_time)} - {formatTime(currentLesson.next.end_time)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-sm text-blue-700 mb-3">
                        <span>{currentLesson.next.teacher}</span>
                        <span>•</span>
                        <span>{currentLesson.next.room}</span>
                      </div>
                      <div className="text-center">
                        <div className="bg-blue-600 text-white px-4 py-2 rounded-lg inline-flex items-center space-x-2 text-sm">
                          <Timer className="w-4 h-4" />
                          <span className="font-mono font-bold">
                            {String(currentLesson.timeUntilNext.hours).padStart(2, '0')}:
                            {String(currentLesson.timeUntilNext.minutes).padStart(2, '0')}:
                            {String(currentLesson.timeUntilNext.seconds).padStart(2, '0')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : currentLesson.current ? (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-5 border border-blue-200">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-bold text-blue-900">
                      {currentLesson.current.subject}
                    </h3>
                    <span className="text-sm font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                      Урок {currentLesson.current.lesson_number}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center space-x-2 text-blue-800">
                      <User className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">{currentLesson.current.teacher}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-blue-800">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">{currentLesson.current.room}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-blue-800">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">
                        {formatTime(currentLesson.current.start_time)} - {formatTime(currentLesson.current.end_time)}
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="bg-blue-600 text-white px-6 py-3 rounded-lg inline-flex items-center space-x-2">
                      <Timer className="w-5 h-5" />
                      <div className="text-center">
                        <div className="font-mono text-xl font-bold">
                          {String(currentLesson.timeLeft.hours).padStart(2, '0')}:
                          {String(currentLesson.timeLeft.minutes).padStart(2, '0')}:
                          {String(currentLesson.timeLeft.seconds).padStart(2, '0')}
                        </div>
                        <div className="text-xs text-blue-100">осталось</div>
                      </div>
                    </div>
                  </div>
                </div>

                {currentLesson.next && (
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Следующий урок:</h4>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-800 font-medium text-sm">{currentLesson.next.subject}</span>
                      <span className="text-xs text-slate-600">
                        {formatTime(currentLesson.next.start_time)} - {formatTime(currentLesson.next.end_time)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-slate-600">
                      <span>{currentLesson.next.teacher}</span>
                      <span>•</span>
                      <span>{currentLesson.next.room}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Сегодня уроков нет</h3>
                <p className="text-slate-600 text-sm">Расписание не загружено или выходной</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Weekly Schedule */}
        {schedule.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg border border-slate-200 p-12 text-center shadow-sm"
          >
            <Calendar className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Расписание не загружено</h3>
            <p className="text-slate-600 text-sm">Обратитесь к администратору</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm"
          >
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Расписание на неделю</h2>

                {scheduleFileUrl && (
                  <motion.a
                    href={scheduleFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Скачать</span>
                  </motion.a>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-900 border-r border-slate-200 min-w-[60px] text-sm">
                      №
                    </th>
                    {days.map(day => (
                      <th key={day} className="px-4 py-3 text-left font-semibold text-slate-900 border-r border-slate-200 min-w-[180px] text-sm">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(lessonNumber => (
                    <tr key={lessonNumber} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-4 font-semibold text-slate-700 border-r border-slate-200 text-center text-sm bg-slate-50/30">
                        {lessonNumber}
                      </td>
                      {days.map(day => {
                        const daySchedule = getScheduleForDay(day);
                        const lesson = daySchedule.find(item => item.lesson_number === lessonNumber);

                        return (
                          <td key={`${day}-${lessonNumber}`} className="px-4 py-4 border-r border-slate-200">
                            {lesson ? (
                              <div className="space-y-1">
                                <div className="font-semibold text-slate-900 text-sm">
                                  {lesson.subject}
                                </div>
                                <div className="text-xs text-slate-700">
                                  {lesson.teacher}
                                </div>
                                <div className="text-xs text-slate-600">
                                  {lesson.room}
                                </div>
                                <div className="text-xs text-blue-600 font-medium mt-1">
                                  {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
                                </div>
                              </div>
                            ) : (
                              <div className="text-slate-400 text-center text-sm">—</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}