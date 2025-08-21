import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, User, Key, Lock, ArrowLeft, Eye, EyeOff, CheckCircle, Loader2, LogOut } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { 
  getClasses, 
  getStudentsByClass, 
  validateKey, 
  validatePassword, 
  createPassword,
  getStudent
} from '../lib/api';
import { getStudent as getStudentService } from '../services/student';
import type { Class, Student } from '../lib/supabase';

type Step = 'classes' | 'students' | 'auth';
type AuthStep = 'key' | 'password' | 'create-password';

interface HomePageProps {
  onShowAdminModal: () => void;
  onStudentLogin: (student: Student, className: string) => void;
}

export default function HomePage({ onShowAdminModal, onStudentLogin }: HomePageProps) {
  const { t } = useLanguage();
  
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

  // Проверяем сохраненные данные входа при загрузке
  useEffect(() => {
    autoLoginWithSavedData();
  }, []);

  const autoLoginWithSavedData = async () => {
    try {
      const savedId = localStorage.getItem('studentId');
      const savedTime = localStorage.getItem('createdAt');

      if (!savedId || !savedTime) return;

      const now = Date.now();
      const diff = now - parseInt(savedTime, 10);

      // 3 дня = 259200000 мс
      if (diff > 259200000) {
        localStorage.removeItem('studentId');
        localStorage.removeItem('createdAt');
        localStorage.removeItem('studentDashboardData');
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
        }
      }
    } catch (err) {
      console.error('Auto login failed:', err);
      localStorage.removeItem('studentId');
      localStorage.removeItem('createdAt');
      localStorage.removeItem('studentDashboardData');
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
    } catch (err) {
      setError(t('error.loadingStudents'));
    } finally {
      setLoading(false);
    }
  };

  const selectStudent = (student: Student) => {
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
    localStorage.removeItem('studentId');
    localStorage.removeItem('createdAt');
    localStorage.removeItem('studentDashboardData');
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

  const handleBack = () => {
    setSuccessMessage(t('common.returnedToPrevious'));
    setTimeout(() => setSuccessMessage(null), 2000);
    
    setSuccessMessage(t('common.returnedToPrevious'));
    setTimeout(() => setSuccessMessage(null), 2000);
    
    if (step === 'auth') {
      setStep('students');
      setSelectedStudent(null);
      setKeyValue('');
      setPassword('');
      setConfirmPassword('');
      setError(null);
    } else if (step === 'students') {
      setStep('classes');
      setSelectedClass(null);
      setStudents([]);
    }
  };

  const formatKeyInput = (value: string) => {
    const clean = value.replace(/[^A-Z0-9]/g, '');
    const formatted = clean.match(/.{1,4}/g)?.join('-') || clean;
    return formatted.slice(0, 14);
  };

  // Если есть активная сессия и происходит автоматический вход, показываем загрузку
  if (savedLogin && step === 'classes' && !loading) {
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
        showBackButton={step !== 'classes'} 
        onBack={handleBack}
      />
      
      <div className="container mx-auto px-4 py-12">
        {/* Logout Button */}
        {savedLogin && (
          <motion.button
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleLogout}
            className="fixed top-4 right-4 z-50 flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-colors shadow-lg"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('auth.logout')}</span>
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

        {/* Classes Selection */}
        {step === 'classes' && (
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
                    onClick={() => loadStudents(classItem)}
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
        )}

        {/* Students Selection */}
        {step === 'students' && selectedClass && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {t('home.selectStudent')} {selectedClass.name}
              </h2>
            </div>

            {loading ? (
              <LoadingSpinner />
            ) : (
              <div className="space-y-3">
                {students.map((student, index) => (
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
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mr-4">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{student.name}</h3>
                        <p className="text-sm text-gray-500">
                          {savedLogin && savedLogin.studentId === student.id 
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
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Authentication */}
        {step === 'auth' && selectedStudent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto"
          >
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-indigo-600 font-bold text-lg">
                    {selectedStudent.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedStudent.name}</h2>
                <p className="text-gray-600">
                  {authStep === 'key' && t('auth.enterKey')}
                  {authStep === 'password' && t('auth.enterPassword')}
                  {authStep === 'create-password' && t('auth.createPassword')}
                </p>
              </div>

              <AnimatePresence mode="wait">
                {/* Key Input */}
                {authStep === 'key' && (
                  <motion.form
                    key="key-form"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 20, opacity: 0 }}
                    onSubmit={handleKeySubmit}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('auth.enterKey')}
                      </label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={keyValue}
                          onChange={(e) => setKeyValue(formatKeyInput(e.target.value.toUpperCase()))}
                          placeholder={t('auth.keyPlaceholder')}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-center tracking-wider"
                          maxLength={14}
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isProcessing || keyValue.length < 14}
                      className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : t('auth.continue')}
                    </button>
                  </motion.form>
                )}

                {/* Password Input */}
                {authStep === 'password' && (
                  <motion.form
                    key="password-form"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 20, opacity: 0 }}
                    onSubmit={handlePasswordSubmit}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('auth.enterPassword')}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={t('auth.passwordPlaceholder')}
                          className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Eye className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <button
                        type="submit"
                        disabled={isProcessing || !password}
                        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : t('auth.login')}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setAuthStep('key')}
                        className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                      >
                        {t('auth.enterKey')}
                      </button>
                    </div>
                  </motion.form>
                )}

                {/* Create Password */}
                {authStep === 'create-password' && (
                  <motion.form
                    key="create-password-form"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 20, opacity: 0 }}
                    onSubmit={handleCreatePasswordSubmit}
                    className="space-y-4"
                  >
                    <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm mb-4">
                      <div className="flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {t('auth.keyVerified')}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('auth.newPasswordPlaceholder')}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={t('auth.newPasswordPlaceholder')}
                          className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          required
                          minLength={4}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Eye className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('auth.confirmPasswordPlaceholder')}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder={t('auth.confirmPasswordPlaceholder')}
                          className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Eye className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isProcessing || !password || !confirmPassword}
                      className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : t('auth.createPasswordButton')}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}