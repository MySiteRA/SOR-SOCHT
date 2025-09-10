import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, FileText, MoreVertical, LogOut, Trash2, User as UserIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import MaterialCard from '../components/MaterialCard';
import MaterialModal from '../components/MaterialModal';
import StudentAvatar from '../components/StudentAvatar';
import { useStudentProfile } from '../hooks/useStudentProfiles';
import { supabase } from '../lib/supabase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { extractGradeFromClassName } from '../lib/api';
import type { Student, Subject, Material } from '../lib/supabase';

export default function StudentMaterialsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { subjectId } = useParams<{ subjectId: string }>();
  const location = useLocation();
  
  // Получаем данные из state
  const { student, className, subject, type } = location.state || {};
  
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Загружаем профиль студента
  const { profile: studentProfile } = useStudentProfile(student?.id);

  useEffect(() => {
    if (student && subject && type && subjectId) {
      loadMaterials();
    } else {
      // Если нет данных в state, перенаправляем на дашборд
      navigate('/student-dashboard');
    }
  }, [student, subject, type, subjectId]);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      
      const grade = extractGradeFromClassName(className);
      
      const { data: materialData, error } = await supabase
        .from("materials")
        .select("*, subject:subjects(*)")
        .eq("grade", grade)
        .eq("subject_id", subjectId)
        .eq("type", type)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setMaterials(materialData || []);
    } catch (err) {
      setError('Ошибка загрузки материалов');
    } finally {
      setLoading(false);
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

  const handleMaterialClick = (material: Material) => {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>{t('common.back')}</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {subject.name} - {type}
                </h1>
                <p className="text-gray-600">
                  {type === 'SOR' ? t('dashboard.sorDesc') : t('dashboard.sochDesc')}
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
        {loading && <LoadingSpinner />}

        {/* Materials List */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {materials.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-600 mb-2">Нет материалов</h3>
                <p className="text-gray-500">Материалы для этого предмета и класса пока не добавлены</p>
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