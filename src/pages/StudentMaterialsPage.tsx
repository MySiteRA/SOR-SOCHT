import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, FileText, MoreVertical, LogOut, Trash2, User as UserIcon, Calendar, MessageCircle, Gamepad2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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

export default function StudentMaterialsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { subjectId } = useParams<{ subjectId: string }>();
  const location = useLocation();
  
  // Получаем данные из state
  const { student, className, subject, type } = location.state || {};
  
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialMetadata | null>(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Используем предзагруженные данные
  const { data: preloadedData, loading } = usePreloadedData();
  
  // Получаем материалы из предзагруженных данных
  const allMaterials = type === 'SOR' 
    ? (preloadedData?.sorMaterials || [])
    : (preloadedData?.sochMaterials || []);
  
  // Фильтруем материалы по предмету
  const materials = allMaterials.filter(material => material.subject_id === subjectId);

  useEffect(() => {
    if (student && subject && type && subjectId) {
      // Данные уже предзагружены, ничего дополнительно загружать не нужно
      
      // Проверяем валидность ключа студента
      validateStudentKey(student.id);
    } else {
      // Если нет данных в state, перенаправляем на дашборд
      navigate('/student-dashboard');
    }
  }, [student, subject, type, subjectId]);

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

  const handleBack = () => {
    // Используем history.back() для корректной работы системной кнопки "Назад"
    window.history.back();
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
  
  const handleMaterialClick = (material: MaterialMetadata) => {
    setSelectedMaterial(material);
    setShowMaterialModal(true);
  };

  const closeMaterialModal = () => {
    setShowMaterialModal(false);
    setSelectedMaterial(null);
  };

  // Если нет данных, показываем загрузку
  if (!student || !subject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-gray-200/50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.button
                onClick={handleBack}
                whileHover={{ x: -4 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>{t('common.back')}</span>
              </motion.button>
              <div className="hidden sm:block">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                  {subject.name}
                </h1>
                <p className="text-sm text-gray-600">
                  {type === 'SOR' ? 'Итоговое оценивание' : 'Суммативное оценивание'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="hidden sm:flex items-center space-x-2 text-xs bg-gradient-to-r from-blue-50 to-teal-50 px-3 py-1.5 rounded-full border border-gray-200"
              >
                <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full animate-pulse" />
                <span className="text-gray-700 font-medium">{type}</span>
              </motion.div>

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
        {loading && materials.length === 0 && <LoadingSpinner />}

        {/* Update Indicator */}
        {loading && materials.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-4 mb-6"
          >
            <div className="inline-flex items-center space-x-2 text-gray-600 bg-white/50 backdrop-blur px-4 py-2 rounded-full border border-gray-200">
              <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="text-sm font-medium">Обновление материалов...</span>
            </div>
          </motion.div>
        )}

        {/* Materials List */}
        {(materials.length > 0 || !loading) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {materials.length === 0 ? (
              <div className="col-span-full text-center py-20">
                <div className="bg-white/60 backdrop-blur rounded-2xl p-12 border border-gray-200 shadow-lg inline-block">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Нет материалов</h3>
                  <p className="text-gray-600">Материалы для этого предмета пока не добавлены</p>
                </div>
              </div>
            ) : (
              materials.map((material, index) => (
                <MaterialCard
                  key={material.id}
                  material={material}
                  index={index}
                  onClick={() => handleMaterialClick(material)}
                />
              ))
            )}
          </motion.div>
        )}

        {/* Material Modal */}
        {selectedMaterial && (
          <MaterialModal
            isOpen={showMaterialModal}
            onClose={closeMaterialModal}
            material={selectedMaterial}
          />
        )}
      </div>
    </div>
  );
}