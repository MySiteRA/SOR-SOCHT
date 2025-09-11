import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, User, Key, Lock, ArrowLeft, Eye, EyeOff, CheckCircle, Loader2, LogOut, Trash2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import StudentAvatar from '../components/StudentAvatar';
import { useStudentProfiles } from '../hooks/useStudentProfiles';
import { useAvatarPreloader } from '../hooks/useAvatarPreloader';
import { 
  getClasses, 
  getStudentsByClass, 
  validateKey, 
  validatePassword, 
  createPassword,
  getStudent
} from '../lib/api';
import { getStudent as getStudentService } from '../services/student';
import { dataPreloader } from '../services/preloader';
import type { Class, Student } from '../lib/supabase';

type Step = 'classes' | 'students' | 'auth';
type AuthStep = 'key' | 'password' | 'create-password';

interface HomePageProps {
  onShowAdminModal: () => void;
  onStudentLogin: (student: Student, className: string) => void;
}

export default function HomePage({ onShowAdminModal, onStudentLogin }: HomePageProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  // Main state
  const [step, setStep] = useState<Step>('classes');
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth state
  const [authStep, setAuthStep] = useState<AuthStep>('key');
  const [keyValue, setKeyValue] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [savedLogin, setSavedLogin] = useState<{studentId: string, expiresAt: number} | null>(null);
  const [isAutoLoginProcessing, setIsAutoLoginProcessing] = useState(false);

  // Загружаем профили студентов
  const studentIds = students.map(s => s.id);
  const { profiles } = useStudentProfiles(studentIds);
  
  // Используем предзагрузчик аватарок
  const { getAvatar, preloadAvatars } = useAvatarPreloader();

  // Проверяем сохраненные данные входа при загрузке
  useEffect(() => {
    // Проверяем, не был ли выполнен явный выход
    const shouldSkipAutoLogin = localStorage.getItem('skipAutoLogin') === 'true';
    if (!shouldSkipAutoLogin) {
      autoLoginWithSavedData();
    } else {
      setIsAutoLoginProcessing(false);
    }
    
    // Запускаем предзагрузку данных в фоне
    dataPreloader.initializePreloading().catch(console.error);
  }, []);

  const autoLoginWithSavedData = async () => {
    try {
      setIsAutoLoginProcessing(true);
      const savedId = localStorage.getItem('studentId');
      const savedTime = localStorage.getItem('createdAt');

      if (!savedId || !savedTime) {
        setIsAutoLoginProcessing(false);
        return;
      }

      const now = Date.now();
      const diff = now - parseInt(savedTime, 10);

      // 3 дня = 259200000 мс
      if (diff > 259200000) {
        localStorage.removeItem('studentId');
        localStorage.removeItem('createdAt');
        localStorage.removeItem('studentDashboardData');
        setIsAutoLoginProcessing(false);
        return;
      }

      const student = await getStudentService(savedId);
      if (student) {
        // Загружаем классы если они еще не загружены
        let allClasses = classes;
        if (allClasses.length === 0) {
          allClasses = await getClasses();
          setClasses(allClasses);
        }
        
        const classData = allClasses.find(c => c.id === student.class_id);
        
        if (classData) {
          setSavedLogin({ studentId: savedId, expiresAt: parseInt(savedTime, 10) + 259200000 });
          // Перенаправляем в дашборд с задержкой
          setTimeout(() => {
            onStudentLogin(student, classData.name);
          }, 500);
        } else {
          setIsAutoLoginProcessing(false);
        }
      } else {
        setIsAutoLoginProcessing(false);
      }
    } catch (err) {
      console.error('Auto login failed:', err);
      localStorage.removeItem('studentId');
      localStorage.removeItem('createdAt');
      localStorage.removeItem('studentDashboardData');
      setIsAutoLoginProcessing(false);
    }
  };
  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      const classData = await getClasses();
      setClasses(classData);
    } catch (err) {
      setError(t('error.loadingClasses'));
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (classItem: Class) => {
    try {
      setLoading(true);
      setError(null);
      const studentData = await getStudentsByClass(classItem.id);
      setStudents(studentData);
      setSelectedClass(classItem);
      setStep('students');
      
      // Запускаем фоновую загрузку аватарок
      if (studentData.length > 0) {
        const studentIds = studentData.map(s => s.id);
        preloadAvatars(studentIds).catch(console.error);
      }
    } catch (err) {
      setError(t('error.loadingStudents'));
    } finally {
      setLoading(false);
    }
  };

  const selectStudent = (student: Student) => {
    // Очищаем флаг пропуска автологина при новом выборе студента
    localStorage.removeItem('skipAutoLogin');
    
    // Проверяем, есть ли сохраненный вход для этого ученика
    if (savedLogin && savedLogin.studentId === student.id) {
      handleSuccessfulAuth(student, true);
      return;
    }
    
    setSelectedStudent(student);
    // Определяем начальный шаг авторизации
    if (student.password_hash) {
      setAuthStep('password');
    } else {
      setAuthStep('key');
    }
    setStep('auth');
  };

  const handleKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      setIsProcessing(true);
      setError(null);
      
      const result = await validateKey(keyValue.toUpperCase(), selectedStudent.id);
      
      if (result.valid) {
        setAuthStep('create-password');
      } else {
        setError(t('auth.invalidOrUsedKey'));
      }
    } catch (err) {
      setError(t('error.keyValidation'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      setIsProcessing(true);
      setError(null);
      
      const result = await validatePassword(selectedStudent.id, password);
      
      if (result.valid && result.student) {
        // Показываем сообщение об успешном входе
        setSuccessMessage(t('auth.successfulLogin'));
        setTimeout(() => {
          handleSuccessfulAuth(result.student, false);
        }, 2000);
      } else {
        setError(t('auth.invalidPassword'));
      }
    } catch (err: any) {
      if (err.message === 'Пароль не установлен') {
        setError(t('auth.passwordNotSet'));
      } else {
        setError(t('error.passwordValidation'));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    if (password.length < 4) {
      setError(t('auth.passwordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      await createPassword(selectedStudent.id, password);
      
      // Показываем сообщение о создании пароля
      setSuccessMessage(t('auth.passwordCreated'));
      setTimeout(() => {
        handleSuccessfulAuth(selectedStudent, false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || t('error.passwordCreation'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuccessfulAuth = (student: Student, isAutoLogin: boolean = false) => {
    if (!isAutoLogin) {
      // Очищаем флаг пропуска автологина при успешной авторизации
      localStorage.removeItem('skipAutoLogin');
      // Сохраняем данные входа на 3 дня
      localStorage.setItem('studentId', student.id);
      localStorage.setItem('createdAt', Date.now().toString());
      setSavedLogin({ studentId: student.id, expiresAt: Date.now() + 259200000 });
    }
    
    // Получаем название класса
    const className = selectedClass?.name || classes.find(c => c.id === student.class_id)?.name || '';
    
    // Перенаправляем в личный кабинет или на URL ученика
    if (student.url) {
      // Если есть URL, перенаправляем туда
      setTimeout(() => {
        window.location.href = student.url!;
      }, isAutoLogin ? 500 : 1000);
    } else {
      // Перенаправляем в личный кабинет
      setTimeout(() => {
        onStudentLogin(student, className);
      }, isAutoLogin ? 500 : 1000);
    }
  };

  const handleLogout = () => {
    // Устанавливаем флаг, чтобы предотвратить автоматический вход
    localStorage.setItem('skipAutoLogin', 'true');
    
    // НЕ удаляем данные сеанса при обычном выходе
    setSavedLogin(null);
    setStep('classes');
    setSelectedClass(null);
    setSelectedStudent(null);
    setStudents([]);
    setKeyValue('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccessMessage(null);
  };

  const handleForgetSession = () => {
    // Полностью удаляем сеанс только при явном действии "забыть сеанс"
    localStorage.removeItem('studentId');
    localStorage.removeItem('createdAt');
    localStorage.removeItem('studentDashboardData');
    
    // Очищаем состояние
    setSavedLogin(null);
    setStep('classes');
    setSelectedClass(null);
    setSelectedStudent(null);
    setStudents([]);
    setKeyValue('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccessMessage(null);
    
    localStorage.removeItem('skipAutoLogin');
    setSavedLogin(null);
  };

  const handleBack = () => {
    if (step === 'auth') {
      // Используем history.back() для корректной работы системной кнопки "Назад"
      window.history.back();
    } else if (step === 'students') {
      // Используем history.back() для корректной работы системной кнопки "Назад"
      window.history.back();
    }
  };

  const formatKeyInput = (value: string) => {
    const clean = value.replace(/[^A-Z0-9]/g, '');
    const formatted = clean.match(/.{1,4}/g)?.join('-') || clean;
    return formatted.slice(0, 14);
  };

  // Если есть активная сессия и происходит автоматический вход, показываем загрузку
  if (isAutoLoginProcessing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center bg-white p-8 rounded-2xl shadow-xl"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Автоматический вход</h2>
          <p className="text-gray-600 mb-4">Перенаправление в личный кабинет...</p>
          <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </motion.div>
      </div>
    );
  }
  
  if (loading && step === 'classes') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100">
      <Header 
        onShowAdminModal={onShowAdminModal} 
        showBackButton={false}
        onStudentLogin={onStudentLogin}
      />
      
      <div className="container mx-auto px-4 py-12">
        {/* Session Indicator */}
        {savedLogin && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed top-4 right-20 z-40"
          >
            <div className="w-4 h-4 bg-green-500 rounded-full shadow-lg border-2 border-white animate-pulse"></div>
          </motion.div>
        )}

        {/* Logout Button */}
        {savedLogin && (
          <motion.button
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleForgetSession}
            className="fixed top-4 right-4 z-50 flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-xl hover:bg-orange-700 transition-colors shadow-lg"
          >
            <Trash2 className="w-4 h-4" />
            <span>Забыть сеанс</span>
          </motion.button>
        )}

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

        {/* Main Page Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <GraduationCap className="w-16 h-16 text-indigo-600 mr-4" />
              <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {t('home.title')}
              </h1>
            </div>
            <p className="text-xl text-gray-600">{t('home.selectClass')}</p>
          </div>

          {error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadClasses}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
              >
                {t('common.tryAgain')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {classes.map((classItem, index) => (
                <motion.div
                  key={classItem.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/class/${classItem.id}`, { 
                    state: { 
                      classId: classItem.id, 
                      className: classItem.name 
                    } 
                  })}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 hover:border-indigo-300 p-6"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <GraduationCap className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800">{classItem.name}</h3>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}