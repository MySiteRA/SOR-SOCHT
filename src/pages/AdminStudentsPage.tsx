import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Download, Copy, Users, CheckCircle, XCircle, 
  ExternalLink, ArrowLeft, RefreshCw, Loader2, ChevronDown, ChevronRight
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import LoadingSpinner from '../components/LoadingSpinner';
import { getClasses, getStudentsByClass } from '../lib/api';
import type { Class, Student } from '../lib/supabase';

interface AdminStudentsPageProps {
  onBack: () => void;
}

interface StudentWithClass extends Student {
  class_name?: string;
}

export default function AdminStudentsPage({ onBack }: AdminStudentsPageProps) {
  const { t } = useLanguage();
  const [classes, setClasses] = useState<Class[]>([]);
  const [allStudents, setAllStudents] = useState<StudentWithClass[]>([]);
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  // Фильтры
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [onlyRegistered, setOnlyRegistered] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const classesData = await getClasses();
      setClasses(classesData);

      // Загружаем всех студентов
      const studentsPromises = classesData.map(async (classItem) => {
        const students = await getStudentsByClass(classItem.id);
        return students.map(student => ({
          ...student,
          class_name: classItem.name
        }));
      });

      const studentsArrays = await Promise.all(studentsPromises);
      const allStudentsData = studentsArrays.flat();
      setAllStudents(allStudentsData);
    } catch (err) {
      setError(t('error.loadingClasses'));
    } finally {
      setLoading(false);
    }
  };

  // Получаем уникальные параллели
  const grades = useMemo(() => {
    const gradeSet = new Set<string>();
    classes.forEach(cls => {
      const grade = cls.name.split('-')[0];
      gradeSet.add(grade);
    });
    return Array.from(gradeSet).sort((a, b) => parseInt(a) - parseInt(b));
  }, [classes]);

  // Фильтрация классов
  const filteredClasses = useMemo(() => {
    return classes.filter(cls => {
      const grade = cls.name.split('-')[0];
      const matchesGrade = selectedGrade === 'all' || grade === selectedGrade;
      const matchesSearch = searchQuery === '' || 
        cls.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesGrade && matchesSearch;
    });
  }, [classes, selectedGrade, searchQuery]);

  // Фильтрация студентов для каждого класса
  const getFilteredStudents = (classId: string) => {
    const classStudents = allStudents.filter(student => student.class_id === classId);
    
    return classStudents.filter(student => {
      const matchesSearch = searchQuery === '' || 
        student.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRegistration = !onlyRegistered || student.password_hash !== null;
      
      return matchesSearch && matchesRegistration;
    });
  };

  // Подсчет зарегистрированных студентов
  const getRegisteredCount = (classId: string) => {
    const classStudents = allStudents.filter(student => student.class_id === classId);
    const registered = classStudents.filter(student => student.password_hash !== null).length;
    return { registered, total: classStudents.length };
  };

  const toggleClassExpansion = (classId: string) => {
    const newExpanded = new Set(expandedClasses);
    if (newExpanded.has(classId)) {
      newExpanded.delete(classId);
    } else {
      newExpanded.add(classId);
    }
    setExpandedClasses(newExpanded);
  };

  const copyStudentLink = (student: Student) => {
    if (student.url) {
      navigator.clipboard.writeText(student.url);
      setSuccess(t('common.copied'));
      setTimeout(() => setSuccess(null), 2000);
    }
  };

  const exportClassCSV = (classItem: Class) => {
    const students = getFilteredStudents(classItem.id);
    setExportLoading(true);
    
    const csvContent = [
      [t('classes.name'), t('classes.class'), t('classes.registered'), 'URL'].join(','),
      ...students.map(student => [
        `"${student.name}"`,
        `"${classItem.name}"`,
        student.password_hash ? t('common.yes') : t('common.no'),
        `"${student.url || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${classItem.name}_students.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    setExportLoading(false);
    setSuccess(t('classes.exportSuccess'));
    setTimeout(() => setSuccess(null), 3000);
  };

  const exportAllCSV = () => {
    setExportLoading(true);
    
    const csvContent = [
      [t('classes.name'), t('classes.class'), t('classes.registered'), 'URL'].join(','),
      ...allStudents
        .filter(student => {
          const cls = classes.find(c => c.id === student.class_id);
          if (!cls) return false;
          
          const grade = cls.name.split('-')[0];
          const matchesGrade = selectedGrade === 'all' || grade === selectedGrade;
          const matchesSearch = searchQuery === '' || 
            student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cls.name.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesRegistration = !onlyRegistered || student.password_hash !== null;
          
          return matchesGrade && matchesSearch && matchesRegistration;
        })
        .map(student => [
          `"${student.name}"`,
          `"${student.class_name || ''}"`,
          student.password_hash ? t('common.yes') : t('common.no'),
          `"${student.url || ''}"`
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'all_students.csv';
    a.click();
    URL.revokeObjectURL(url);
    
    setExportLoading(false);
    setSuccess(t('classes.exportSuccess'));
    setTimeout(() => setSuccess(null), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <LanguageSwitcher showBackButton={true} onBack={onBack} />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {t('classes.title')}
              </h1>
              <p className="text-gray-600">
                {t('admin.selectSection')}
              </p>
            </div>
            
            <button
              onClick={loadData}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{t('common.refresh')}</span>
            </button>
          </div>
        </motion.div>

        {/* Notifications */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6"
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
          
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6"
            >
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                {t('common.filter')}
              </h3>
              
              {/* Search */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('common.search')}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('classes.searchPlaceholder')}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Grade Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('classes.grade')}
                </label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">{t('classes.allGrades')}</option>
                  {grades.map(grade => (
                    <option key={grade} value={grade}>{grade} {t('classes.grade')}</option>
                  ))}
                </select>
              </div>

              {/* Registration Filter */}
              <div className="mb-6">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyRegistered}
                    onChange={(e) => setOnlyRegistered(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {t('classes.onlyRegistered')}
                  </span>
                </label>
              </div>

              {/* Export Actions */}
              <div className="space-y-3">
                <button
                  onClick={exportAllCSV}
                  disabled={exportLoading}
                  className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-3 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {exportLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{exportLoading ? t('common.loading') : t('classes.exportAll')}</span>
                </button>
              </div>
            </div>
          </motion.div>

          {/* Classes List */}
          <div className="lg:col-span-3">
            {filteredClasses.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl shadow-lg p-12 text-center"
              >
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-600 mb-2">
                  {t('classes.noStudents')}
                </h3>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {filteredClasses.map((classItem, index) => {
                  const { registered, total } = getRegisteredCount(classItem.id);
                  const filteredStudents = getFilteredStudents(classItem.id);
                  const isExpanded = expandedClasses.has(classItem.id);

                  return (
                    <motion.div
                      key={classItem.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white rounded-2xl shadow-lg overflow-hidden"
                    >
                      {/* Class Header */}
                      <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => toggleClassExpansion(classItem.id)}
                            className="flex items-center space-x-4 flex-1 text-left hover:bg-gray-50 -m-2 p-2 rounded-xl transition-colors"
                          >
                            <motion.div
                              animate={{ rotate: isExpanded ? 90 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronRight className="w-5 h-5 text-gray-400" />
                            </motion.div>
                            
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                                <Users className="w-6 h-6 text-indigo-600" />
                              </div>
                              
                              <div>
                                <h3 className="text-xl font-bold text-gray-900">
                                  {classItem.name}
                                </h3>
                                <p className="text-gray-600">
                                  {registered} {t('classes.registered')} / {total} {t('classes.total')}
                                </p>
                              </div>
                            </div>
                          </button>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => exportClassCSV(classItem)}
                              disabled={exportLoading}
                              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {exportLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                              <span className="hidden sm:inline">
                                {exportLoading ? t('common.loading') : t('classes.exportClass')}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Students List */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="p-6 pt-0">
                              {filteredStudents.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                  {t('classes.noStudents')}
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {filteredStudents.map((student, studentIndex) => (
                                    <motion.div
                                      key={student.id}
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: studentIndex * 0.05 }}
                                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                                    >
                                      <div className="flex items-center space-x-4">
                                        <div className="flex items-center space-x-2">
                                          {student.password_hash ? (
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                          ) : (
                                            <XCircle className="w-5 h-5 text-red-500" />
                                          )}
                                          <span className="font-medium text-gray-900">
                                            {student.name}
                                          </span>
                                        </div>
                                        
                                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                                          <span>
                                            {student.password_hash 
                                              ? t('classes.registered') 
                                              : t('classes.notRegistered')
                                            }
                                          </span>
                                          {student.url && (
                                            <span className="text-indigo-600">
                                              • {t('classes.hasUrl')}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center space-x-2">
                                        {student.url && (
                                          <>
                                            <button
                                              onClick={() => copyStudentLink(student)}
                                              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                              title={t('classes.copyLink')}
                                            >
                                              <Copy className="w-4 h-4" />
                                            </button>
                                            <a
                                              href={student.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                              title={student.url}
                                            >
                                              <ExternalLink className="w-4 h-4" />
                                            </a>
                                          </>
                                        )}
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}