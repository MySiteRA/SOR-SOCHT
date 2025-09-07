import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import StudentAvatar from '../components/StudentAvatar';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useStudentProfiles } from '../hooks/useStudentProfiles';
import { getStudentsByClass } from '../lib/api';
import type { Student } from '../lib/supabase';

export default function StudentSelectionPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { classId } = useParams<{ classId: string }>();
  const location = useLocation();
  
  // Получаем данные класса из state или URL
  const { className } = location.state || {};
  
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Загружаем профили студентов
  const studentIds = students.map(s => s.id);
  const { profiles } = useStudentProfiles(studentIds);

  // Проверяем сохраненные данные входа при загрузке
  useEffect(() => {
    const savedId = localStorage.getItem('studentId');
    const savedTime = localStorage.getItem('createdAt');

    if (savedId && savedTime) {
      const now = Date.now();
      const diff = now - parseInt(savedTime, 10);

      // 3 дня = 259200000 мс
      if (diff <= 259200000) {
        // Есть активная сессия, показываем сообщение
        setSuccessMessage('У вас есть активная сессия. Выберите ученика для быстрого входа.');
      }
    }
  }, []);

  useEffect(() => {
    if (classId) {
      loadStudents();
    } else {
      navigate('/');
    }
  }, [classId]);

  const loadStudents = async () => {
    if (!classId) return;
    
    try {
      setLoading(true);
      setError(null);
      const studentData = await getStudentsByClass(classId);
      setStudents(studentData);
    } catch (err) {
      setError(t('error.loadingStudents'));
    } finally {
      setLoading(false);
    }
  };

  const selectStudent = (student: Student) => {
    // Очищаем флаг пропуска автологина при новом выборе студента
    localStorage.removeItem('skipAutoLogin');
    
    navigate(`/auth/${student.id}`, {
      state: { 
        student,
        classId,
        className
      },
      replace: false
    });
  };

  const handleBack = () => {
    navigate('/', { replace: false });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100">
      <LanguageSwitcher showBackButton={true} onBack={handleBack} />
      
      <div className="container mx-auto px-4 py-12">
        {/* Messages */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6 max-w-2xl mx-auto text-center"
            >
              {successMessage}
            </motion.div>
          )}
          
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 max-w-2xl mx-auto text-center"
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
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {t('home.selectStudent')} {className}
            </h2>
          </div>

          <div className="space-y-3">
            {students.map((student, index) => {
              const savedId = localStorage.getItem('studentId');
              const isQuickLogin = savedId === student.id;
              
              return (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ x: 8 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => selectStudent(student)}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-100 hover:border-indigo-300 p-6"
                >
                  <div className="flex items-center">
                    <div className="mr-4">
                      <StudentAvatar 
                        student={student} 
                        avatarUrl={profiles.get(student.id)?.avatar_url}
                        size="md"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{student.name}</h3>
                      <p className="text-sm text-gray-500">
                        {isQuickLogin
                          ? t('auth.quickLogin') 
                          : student.password_hash 
                            ? t('auth.passwordSet') 
                            : t('auth.noPassword')
                        }
                      </p>
                    </div>
                    <div className="w-6 h-6 border-2 border-gray-300 rounded-full group-hover:border-indigo-500 transition-colors" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}