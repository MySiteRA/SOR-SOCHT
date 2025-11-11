import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, MoreVertical, LogOut, Trash2, User as UserIcon, Calendar, MessageCircle, Gamepad2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import MaterialCard from '../components/MaterialCard';
import MaterialModal from '../components/MaterialModal';
import StudentAvatar from '../components/StudentAvatar';
import SubjectCard from '../components/SubjectCard';
import CurrentLessonBanner from '../components/CurrentLessonBanner';
import { usePreloadedData } from '../hooks/usePreloadedData';
import { checkStudentKeyValidity } from '../lib/api';
import { useRealtimeLessonTimer } from '../hooks/useRealtimeLessonTimer';
import { supabase } from '../lib/supabase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { extractGradeFromClassName } from '../lib/api';
import type { Student, Subject } from '../lib/supabase';

// Интерфейс для метаданных материала
interface MaterialMetadata {
  id: string;
  subject_id: string;
  title: string;
  type: 'SOR' | 'SOCH';
  created_at: string;
  grade: number;
  language: string;
  quarter: number;
  subject?: Subject;
}

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

export default function StudentSorPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<{student: Student, className: string} | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialMetadata | null>(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

  // Используем предзагруженные данные
  const { data: preloadedData, loading } = usePreloadedData();

  // Используем хук для реального времени урока
  const currentLesson = useRealtimeLessonTimer({
    classId: studentData?.student.class_id || '',
    schedule
  });

  // Получаем предметы и материалы из предзагруженных данных
  const subjects = preloadedData?.subjects || [];
  const materials = preloadedData?.sorMaterials || [];

  useEffect(() => {
    const saved = localStorage.getItem('studentDashboardData');
    if (saved) {
      const data = JSON.parse(saved);
      setStudentData(data);

      // Проверяем валидность ключа студента
      validateStudentKey(data.student.id);

      // Загружаем расписание
      loadSchedule(data.student.class_id);
    } else {
      navigate('/', { replace: true });
      return;
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
      const { data, error: scheduleError } = await supabase
        .from('schedule')
        .select('*')
        .eq('class_id', classId)
        .order('day_of_week')
        .order('lesson_number');

      if (scheduleError) throw scheduleError;
      setSchedule(data || []);
    } catch (error) {
      console.error('Error loading schedule:', error);
    }
  };

  const loadSubjectMaterials = (subject: Subject) => {
    if (!studentData) return;
    navigate(`/student-sor-materials/${subject.id}`, { 
      state: { 
        student: studentData.student, 
        className: studentData.className, 
        subject,
        type: 'SOR'
      } 
    });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-gray-200/50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.button
                onClick={() => navigate('/student-dashboard')}
                whileHover={{ x: -4 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>{t('common.back')}</span>
              </motion.button>
              <div className="hidden sm:block">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                  {t('dashboard.sor')}
                </h1>
                <p className="text-sm text-gray-600">
                  {t('dashboard.sorDesc')}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="hidden sm:block w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50 animate-pulse"
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl hover:border-gray-300 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-700" />
                  </motion.button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-52 mt-2"
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
                        <UserIcon className="w-4 h-4 mr-3 text-blue-500" />
                        <span className="text-gray-700">Профиль</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={handleScheduleClick}
                        className="cursor-pointer"
                      >
                        <Calendar className="w-4 h-4 mr-3 text-amber-500" />
                        <span className="text-gray-700">Расписание</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={handleChatClick}
                        className="cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4 mr-3 text-emerald-500" />
                        <span className="text-gray-700">Чат класса</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={handleGamesClick}
                        className="cursor-pointer"
                      >
                        <Gamepad2 className="w-4 h-4 mr-3 text-rose-500" />
                        <span className="text-gray-700">Игры с классом</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={handleForgetSession}
                        className="cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 mr-3 text-orange-500" />
                        <span className="text-gray-700">Забыть сеанс</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 mr-3 text-red-500" />
                        <span className="text-gray-700">Выйти</span>
                      </DropdownMenuItem>
                    </div>
                  </motion.div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 backdrop-blur-sm"
          >
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </motion.div>
        )}

        {/* Loading */}
        {loading && !preloadedData && <LoadingSpinner />}

        {/* Update Indicator */}
        {loading && preloadedData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-4 mb-6"
          >
            <div className="inline-flex items-center space-x-2 text-gray-600 bg-white/50 backdrop-blur px-4 py-2 rounded-full border border-gray-200">
              <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="text-sm font-medium">Обновление данных...</span>
            </div>
          </motion.div>
        )}

        {/* Current Lesson Banner */}
        {schedule.length > 0 && currentLesson.current && (
          <CurrentLessonBanner
            currentLesson={currentLesson.current}
            timeLeft={currentLesson.timeLeft}
            isFinished={currentLesson.isFinished}
            isBreak={currentLesson.isBreak}
            timeUntilNext={currentLesson.timeUntilNext}
          />
        )}

        {/* Subjects List */}
        {(subjects.length > 0 || !loading) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {subjects.length === 0 ? (
              <motion.div
                className="text-center py-20"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="bg-white/60 backdrop-blur rounded-2xl p-12 border border-gray-200 shadow-lg">
                  <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">Нет предметов</h3>
                  <p className="text-gray-600">Предметы для этого класса пока не добавлены</p>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-6">
                {currentLesson.current && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Текущий урок</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {subjects
                        .filter(s => s.name === currentLesson.current?.subject)
                        .map((subject, index) => (
                          <SubjectCard
                            key={subject.id}
                            subject={subject}
                            onClick={() => loadSubjectMaterials(subject)}
                            index={index}
                          />
                        ))}
                    </div>
                  </div>
                )}

                {subjects.filter(s => !currentLesson.current || s.name !== currentLesson.current.subject).length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Остальные предметы</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {subjects
                        .filter(s => !currentLesson.current || s.name !== currentLesson.current.subject)
                        .map((subject, index) => (
                          <SubjectCard
                            key={subject.id}
                            subject={subject}
                            onClick={() => loadSubjectMaterials(subject)}
                            index={index}
                          />
                        ))}
                    </div>
                  </div>
                )}

                {!currentLesson.current && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subjects.map((subject, index) => (
                      <SubjectCard
                        key={subject.id}
                        subject={subject}
                        onClick={() => loadSubjectMaterials(subject)}
                        index={index}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}