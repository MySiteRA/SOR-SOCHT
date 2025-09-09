import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Lock, Eye, EyeOff, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import StudentAvatar from '../components/StudentAvatar';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useStudentProfile } from '../hooks/useStudentProfiles';
import { 
  validateKey, 
  validatePassword, 
  createPassword,
  getStudent
} from '../lib/api';
import { getStudent as getStudentService } from '../services/student';
import type { Student } from '../lib/supabase';

type AuthStep = 'key' | 'password' | 'create-password';

export default function AuthPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { studentId } = useParams<{ studentId: string }>();
  const location = useLocation();
  
  // Получаем данные из state
  const { student: studentFromState, classId, className } = location.state || {};
  
  const [student, setStudent] = useState<Student | null>(studentFromState);
  const [authStep, setAuthStep] = useState<AuthStep>('key');
  const [keyValue, setKeyValue] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(!studentFromState);

  // Загружаем профиль студента
  const { profile } = useStudentProfile(student?.id || '');

  useEffect(() => {
    if (!studentFromState && studentId) {
      // Если нет данных в state, загружаем студента по ID
      loadStudent();
    } else if (student) {
      // Определяем начальный шаг авторизации
      determineAuthStep();
    }
  }, [studentId, student]);

  const loadStudent = async () => {
    if (!studentId) {
      navigate('/');
      return;
    }

    try {
      setLoading(true);
      const studentData = await getStudentService(studentId);
      if (studentData) {
        setStudent(studentData);
      } else {
        navigate('/');
      }
    } catch (err) {
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const determineAuthStep = () => {
    if (!student) return;

    // Проверяем быстрый вход
    const savedId = localStorage.getItem('studentId');
    const savedTime = localStorage.getItem('createdAt');

    if (savedId === student.id && savedTime) {
      const now = Date.now();
      const diff = now - parseInt(savedTime, 10);

      // 3 дня = 259200000 мс
      if (diff <= 259200000) {
        handleSuccessfulAuth(student, true);
        return;
      }
    }

    // Определяем шаг авторизации
    if (student.password_hash) {
      setAuthStep('password');
    } else {
      setAuthStep('key');
    }
  };

  const handleKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    try {
      setIsProcessing(true);
      setError(null);
      
      const result = await validateKey(keyValue.toUpperCase(), student.id);
      
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
    if (!student) return;

    try {
      setIsProcessing(true);
      setError(null);
      
      const result = await validatePassword(student.id, password);
      
      if (result.valid && result.student) {
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
    if (!student) return;

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
      
      await createPassword(student.id, password);
      
      setSuccessMessage(t('auth.passwordCreated'));
      setTimeout(() => {
        handleSuccessfulAuth(student, false);
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
      localStorage.removeItem('skipAutoLogin');
    }
    
    // Сохраняем данные для дашборда
    const dashboardData = { 
      student, 
      className: className || classId 
    };
    localStorage.setItem('studentDashboardData', JSON.stringify(dashboardData));
    
    // Перенаправляем в личный кабинет или на URL ученика
    if (student.url) {
      setTimeout(() => {
        window.location.href = student.url!;
      }, isAutoLogin ? 500 : 1000);
    } else {
      setTimeout(() => {
        navigate('/student-dashboard');
      }, isAutoLogin ? 500 : 1000);
    }
  };

  const handleBack = () => {
    if (classId) {
      navigate(`/class/${classId}`, { 
        state: { 
          classId, 
          className 
        } 
      });
    } else {
      navigate('/');
    }
  };

  const formatKeyInput = (value: string) => {
    const clean = value.replace(/[^A-Z0-9]/g, '');
    const formatted = clean.match(/.{1,4}/g)?.join('-') || clean;
    return formatted.slice(0, 14);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Студент не найден</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            На главную
          </button>
        </div>
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
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md mx-auto"
        >
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <StudentAvatar 
                  student={student} 
                  avatarUrl={profile?.avatar_url}
                  size="lg"
                />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{student.name}</h2>
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
      </div>
    </div>
  );
}