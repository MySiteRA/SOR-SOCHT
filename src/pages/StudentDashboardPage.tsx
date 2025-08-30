import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, FileText, Users, MoreVertical, LogOut, Trash2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import MaterialCard from '../components/MaterialCard';
import MaterialModal from '../components/MaterialModal';
import { supabase } from '../lib/supabase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { extractGradeFromClassName } from '../lib/api';
import type { Student, Subject, Material } from '../lib/supabase';

type DashboardView = 'main' | 'sor' | 'soch' | 'materials';

interface StudentDashboardPageProps {
  student: Student;
  className: string;
}

export default function StudentDashboardPage({ student, className }: StudentDashboardPageProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [view, setView] = useState<DashboardView>('main');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [currentType, setCurrentType] = useState<'SOR' | 'SOCH'>('SOR');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (view === 'sor' || view === 'soch') {
      loadSubjects();
      // Устанавливаем currentType в зависимости от активной вкладки
      setCurrentType(view === 'sor' ? 'SOR' : 'SOCH');
      // Извлекаем grade из названия класса студента
      const grade = extractGradeFromClassName(className);
      setSelectedGrade(grade);
    }
  }, [view]);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const { data: subjects, error } = await supabase
        .from("subjects")
        .select("*")
        .order('name');
      
      if (error) throw error;
      
      setSubjects(subjects || []);
    } catch (err) {
      setError('Ошибка загрузки предметов');
    } finally {
      setLoading(false);
    }
  };

  const loadSubjectMaterials = async (subject: Subject) => {
    try {
      setLoading(true);
      
      if (!selectedGrade) {
        setError('Не удалось определить класс');
        return;
      }
      
      const { data: materialData, error } = await supabase
        .from("materials")
        .select("*, subject:subjects(*)")
        .eq("grade", selectedGrade)
        .eq("subject_id", subject.id)
        .eq("type", currentType)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setMaterials(materialData || []);
      setSelectedSubject(subject);
      setView('materials');
    } catch (err) {
      setError('Ошибка загрузки материалов');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (view === 'materials') {
      setView(currentType.toLowerCase() as 'sor' | 'soch');
      setSelectedSubject(null);
      setMaterials([]);
    } else if (view === 'sor' || view === 'soch') {
      setView('main');
      setSubjects([]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('studentLogin');
    localStorage.removeItem('studentId');
    localStorage.removeItem('createdAt');
    localStorage.removeItem('studentDashboardData');
    navigate('/');
  };

  const handleForgetSession = () => {
    localStorage.removeItem('studentId');
    localStorage.removeItem('createdAt');
    localStorage.removeItem('studentDashboardData');
    navigate('/');
  };

  const handleMaterialClick = (material: Material) => {
    setSelectedMaterial(material);
    setShowMaterialModal(true);
  };

  const closeMaterialModal = () => {
    setShowMaterialModal(false);
    setSelectedMaterial(null);
  };

  const getStudentName = () => {
    const nameParts = student.name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0]} ${nameParts[1]}`;
    }
    return student.name;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {view !== 'main' && (
                <button
                  onClick={handleBack}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>{t('common.back')}</span>
                </button>
              )}
              <div>
                <div className="flex items-center space-x-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {view === 'main' && `${t('home.welcome')}, ${getStudentName()}!`}
                  {view === 'sor' && t('dashboard.sor')}
                  {view === 'soch' && t('dashboard.soch')}
                  {view === 'materials' && selectedSubject && `${selectedSubject.name} - ${currentType}`}
                </h1>
                </div>
                <p className="text-gray-600">
                  {view === 'main' && `${t('home.class')} ${className}`}
                  {view === 'sor' && t('dashboard.sorDesc')}
                  {view === 'soch' && t('dashboard.sochDesc')}
                  {view === 'materials' && (currentType === 'SOR' ? t('dashboard.sorDesc') : t('dashboard.sochDesc'))}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
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
                        <span className="text-gray-700">{t('auth.logout')}</span>
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

        {/* Main Dashboard */}
        <AnimatePresence mode="wait">
          {view === 'main' && !loading && (
            <motion.div
              key="main"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto"
            >
              <motion.div
                whileHover={{ scale: 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setView('sor')}
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
                onClick={() => setView('soch')}
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
          )}

          {/* Subjects List */}
          {(view === 'sor' || view === 'soch') && !loading && (
            <motion.div
              key="subjects"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
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
                    <div className="bg-indigo-100 p-2 rounded-lg">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
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

          {/* Materials List */}
          {view === 'materials' && !loading && (
            <motion.div
              key="materials"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
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
        </AnimatePresence>

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