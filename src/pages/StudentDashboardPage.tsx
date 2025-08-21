import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, FileText, Users, LogOut, User } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  getSubjects,
  getMaterialsByType
} from '../lib/api';
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
      const materialData = await getMaterialsByType(subject.id, category);
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

  const handleLogout = () => {
    localStorage.removeItem('studentLogin');
    navigate('/');
  };

  const getStudentName = () => {
    const nameParts = student.name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0]} ${nameParts[1]}`;
    }
    return student.name;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
                <h1 className="text-2xl font-bold text-gray-900">
                  {view === 'main' && `${t('home.welcome')}, ${getStudentName()}!`}
                  {view === 'sor' && t('dashboard.sor')}
                  {view === 'soch' && t('dashboard.soch')}
                  {view === 'materials' && selectedSubject && `${selectedSubject.name} - ${currentCategory}`}
                </h1>
                <p className="text-gray-600">
                  {view === 'main' && `${t('home.class')} ${className}`}
                  {view === 'sor' && t('dashboard.sorDesc')}
                  {view === 'soch' && t('dashboard.sochDesc')}
                  {view === 'materials' && (currentCategory === 'SOR' ? t('dashboard.sorDesc') : t('dashboard.sochDesc'))}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-gray-600">
                <User className="w-4 h-4" />
                <span className="text-sm">{getStudentName()}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('auth.logout')}</span>
              </button>
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
              {subjects.map((subject, index) => (
                <motion.div
                  key={subject.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.01, y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => loadSubjectMaterials(subject, view.toUpperCase() as 'SOR' | 'SOCH')}
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
                  <motion.div
                    key={material.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden"
                  >
                    {/* Material Header */}
                    <div className={`p-4 ${currentCategory === 'SOR' ? 'bg-green-50' : 'bg-purple-50'}`}>
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${currentCategory === 'SOR' ? 'bg-green-100' : 'bg-purple-100'}`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{material.title}</h3>
                          <p className="text-sm text-gray-600">{material.type}</p>
                        </div>
                      </div>
                    </div>

                    {/* Material Content */}
                    <div className="p-4">
                      {material.content_type === 'text' && (
                        <p className="text-gray-700 leading-relaxed">{material.content_value}</p>
                      )}
                      
                      {material.content_type === 'image' && (
                        <div className="text-center">
                          <img
                            src={material.content_value}
                            alt={material.title}
                            className="max-w-full h-auto rounded-lg shadow-md"
                          />
                        </div>
                      )}
                      
                      {(material.content_type === 'file' || material.content_type === 'link') && (
                        <div className="text-center">
                          <motion.a
                            href={material.content_value}
                            target="_blank"
                            rel="noopener noreferrer"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <FileText className="w-5 h-5" />
                            <span>
                              {material.content_type === 'file' ? 'Скачать файл' : 'Перейти по ссылке'}
                            </span>
                          </motion.a>
                        </div>
                      )}
                      
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                          Создано: {formatDate(material.created_at)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}