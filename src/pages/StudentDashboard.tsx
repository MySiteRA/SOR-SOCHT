import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, FileText, Users } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import SubjectCard from '../components/SubjectCard';
import MaterialCard from '../components/MaterialCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  getSubjects,
  getMaterialsByGradeAndType,
  extractGradeFromClassName
} from '../lib/api';
import type { Student, Subject, Material } from '../lib/supabase';

type DashboardView = 'main' | 'sor' | 'soch' | 'materials';

interface StudentDashboardProps {
  student: Student;
  className: string;
  onLogout: () => void;
}

export default function StudentDashboard({ student, className, onLogout }: StudentDashboardProps) {
  const { t } = useLanguage();
  const [view, setView] = useState<DashboardView>('main');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [currentCategory, setCurrentCategory] = useState<'SOR' | 'SOCH'>('SOR');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (view === 'sor' || view === 'soch') {
      loadSubjects();
    }
  }, [view]);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const subjectData = await getSubjects();
      setSubjects(subjectData);
    } catch (err) {
      setError('Ошибка загрузки предметов');
    } finally {
      setLoading(false);
    }
  };

  const loadSubjectMaterials = async (subject: Subject, category: 'SOR' | 'SOCH') => {
    try {
      setLoading(true);
      // Извлекаем grade из названия класса студента
      const grade = extractGradeFromClassName(className);
      const materialData = await getMaterialsBySubjectAndGrade(subject.id, grade, category);
      setMaterials(materialData);
      setSelectedSubject(subject);
      setCurrentCategory(category);
      setView('materials');
    } catch (err) {
      setError('Ошибка загрузки материалов');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (view === 'materials') {
      setView(currentCategory.toLowerCase() as 'sor' | 'soch');
      setSelectedSubject(null);
      setMaterials([]);
    } else if (view === 'sor' || view === 'soch') {
      setView('main');
      setSubjects([]);
    }
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
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          {view === 'main' && (
            <>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {t('home.welcome')}, {getStudentName()}!
              </h1>
              <p className="text-xl text-gray-600">{t('home.class')} {className}</p>
            </>
          )}
          {view === 'sor' && (
            <>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('dashboard.sor')}</h1>
              <p className="text-xl text-gray-600">{t('dashboard.sorDesc')}</p>
            </>
          )}
          {view === 'soch' && (
            <>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('dashboard.soch')}</h1>
              <p className="text-xl text-gray-600">{t('dashboard.sochDesc')}</p>
            </>
          )}
          {view === 'materials' && selectedSubject && (
            <>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {selectedSubject.name} - {currentCategory}
              </h1>
              <p className="text-xl text-gray-600">
                {currentCategory === 'SOR' ? t('dashboard.sorDesc') : t('dashboard.sochDesc')}
              </p>
            </>
          )}
        </motion.div>

        {/* Back Button */}
        {view !== 'main' && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={handleBack}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-6 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t('common.back')}</span>
          </motion.button>
        )}

        {/* Logout Button */}
        <div className="absolute top-4 right-4">
          <button
            onClick={onLogout}
            className="text-gray-600 hover:text-gray-800 font-medium"
          >
            {t('admin.logout')}
          </button>
        </div>

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
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">СОР</h2>
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
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">СОЧ</h2>
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
              {subjects.map((subject, index) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  onClick={() => loadSubjectMaterials(subject, view.toUpperCase() as 'SOR' | 'SOCH')}
                  index={index}
                />
              ))}
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
                  <h3 className="text-xl font-medium text-gray-600 mb-2">{t('materials.noMaterials')}</h3>
                  <p className="text-gray-500">{t('dashboard.noMaterialsForSubject')}</p>
                </div>
              ) : (
                materials.map((material, index) => (
                  <MaterialCard
                    key={material.id}
                    material={material}
                    index={index}
                  />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}