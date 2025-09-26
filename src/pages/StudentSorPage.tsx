import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, MoreVertical, LogOut, Trash2, User as UserIcon, Calendar, MessageCircle, Gamepad2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import MaterialCard from '../components/MaterialCard';
import MaterialModal from '../components/MaterialModal';
import StudentAvatar from '../components/StudentAvatar';
import { usePreloadedData } from '../hooks/usePreloadedData';
import { checkStudentKeyValidity } from '../lib/api';
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

export default function StudentSorPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<{student: Student, className: string} | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialMetadata | null>(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Используем предзагруженные данные
  const { data: preloadedData, loading } = usePreloadedData();
  
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/student-dashboard')}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>{t('common.back')}</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {t('dashboard.sor')}
                </h1>
                <p className="text-gray-600">
                  {t('dashboard.sorDesc')}
                </p>
              </div>
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
        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6"
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
        
        {/* Показываем индикатор загрузки только если нет предзагруженных данных */}
        {loading && preloadedData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-4"
          >
            <div className="inline-flex items-center space-x-2 text-gray-600">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Обновление данных...</span>
            </div>
          </motion.div>
        )}

        {/* Subjects List */}
        {(subjects.length > 0 || !loading) && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {subjects.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-600 mb-2">Нет предметов</h3>
                <p className="text-gray-500">Предметы для этого класса пока не добавлены</p>
              </div>
            ) : (
              subjects.map((subject, index) => (
                <motion.div
                  key={subject.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.01, y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => loadSubjectMaterials(subject)}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-100 p-4"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <BookOpen className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{subject.name}</h3>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}