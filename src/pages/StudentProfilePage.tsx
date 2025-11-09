import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, User, Shield, Camera, Upload, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, Monitor, Smartphone, Calendar, Clock, Trash2, MessageCircle, Gamepad2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  getStudentProfile, 
  updateStudentAvatar, 
  getStudentLoginSessions,
  resetStudentPassword,
  changeStudentPassword,
  checkStudentKeyValidity
} from '../lib/api';
import { usePreloadedData } from '../hooks/usePreloadedData';
import { dataPreloader } from '../services/preloader';
import type { Student, StudentProfile, LoginSession } from '../lib/supabase';

type ProfileTab = 'settings' | 'security';

export default function StudentProfilePage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<{student: Student, className: string} | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('settings');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Используем предзагруженные данные
  const { data: preloadedData, refresh: refreshPreloadedData } = usePreloadedData();
  
  // Локальное состояние для данных профиля (может отличаться от предзагруженных)
  const [localProfile, setLocalProfile] = useState<StudentProfile | null>(null);
  const [localLoginSessions, setLocalLoginSessions] = useState<LoginSession[]>([]);
  // Avatar state
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('studentDashboardData');
    if (saved) {
      const data = JSON.parse(saved);
      setStudentData(data);
      
      // Проверяем валидность ключа студента
      validateStudentKey(data.student.id);
    } else {
      navigate('/', { replace: true });
      return;
    }
    
    loadProfileData();
  }, []);

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

  // Синхронизируем с предзагруженными данными
  useEffect(() => {
    if (preloadedData) {
      setLocalProfile(preloadedData.profile);
      setLocalLoginSessions(preloadedData.loginSessions);
      setLoading(false);
    }
  }, [preloadedData]);

  const loadProfileData = async () => {
    if (!studentData) return;
    
    try {
      setError(null);
      
      // Если есть предзагруженные данные, используем их сразу
      if (preloadedData) {
        setLocalProfile(preloadedData.profile);
        setLocalLoginSessions(preloadedData.loginSessions);
        setLoading(false);
        
        if (preloadedData.profile?.avatar_url) {
          setAvatarPreview(preloadedData.profile.avatar_url);
        }
      } else {
        setLoading(true);
      }
      
      // Загружаем профиль
      const profileData = await getStudentProfile(studentData.student.id);
      setLocalProfile(profileData);
      
      if (profileData?.avatar_url) {
        setAvatarPreview(profileData.avatar_url);
      }
      
      // Загружаем сессии входа
      const sessionsData = await getStudentLoginSessions(studentData.student.id, 5);
      setLocalLoginSessions(sessionsData);
      
      // Инвалидируем кэш для обновления предзагруженных данных
      dataPreloader.invalidateCache();
      refreshPreloadedData();
    } catch (err) {
      setError('Ошибка загрузки данных профиля');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!studentData) return;
    
    const file = event.target.files?.[0];
    if (!file) return;

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите изображение');
      return;
    }

    // Проверяем размер файла (максимум 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Размер файла не должен превышать 5MB');
      return;
    }

    try {
      setAvatarLoading(true);
      setError(null);

      // Создаем превью
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Здесь в реальном приложении был бы upload в Supabase Storage
      // Для демонстрации используем data URL
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      await updateStudentAvatar(studentData.student.id, dataUrl);
      await loadProfileData(); // Перезагружаем данные
      
      setSuccess('Аватар успешно обновлен');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Ошибка загрузки аватара');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!studentData) return;
    
    if (!confirm('Вы уверены, что хотите сбросить пароль? После сброса вам потребуется новый ключ для входа.')) {
      return;
    }

    try {
      setPasswordLoading(true);
      setError(null);
      
      await resetStudentPassword(studentData.student.id);
      
      setSuccess('Пароль успешно сброшен. Теперь вам потребуется новый ключ для входа.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError('Ошибка сброса пароля');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    if (!studentData) return;
    
    e.preventDefault();
    
    if (newPassword.length < 4) {
      setError('Новый пароль должен содержать минимум 4 символа');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Новые пароли не совпадают');
      return;
    }

    try {
      setPasswordLoading(true);
      setError(null);
      
      await changeStudentPassword(studentData.student.id, oldPassword, newPassword);
      
      setSuccess('Пароль успешно изменен');
      setShowPasswordForm(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Ошибка изменения пароля');
    } finally {
      setPasswordLoading(false);
    }
  };
  const handleChatClick = () => {
    navigate('/student-chat');
  };

  const formatDeviceInfo = (deviceInfo: any) => {
    if (!deviceInfo || typeof deviceInfo !== 'object') {
      return 'Неизвестное устройство';
    }

    const userAgent = deviceInfo.userAgent || '';
    const platform = deviceInfo.platform || '';
    
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      return 'Мобильное устройство';
    } else if (userAgent.includes('Windows')) {
      return 'Windows компьютер';
    } else if (userAgent.includes('Mac')) {
      return 'Mac компьютер';
    } else if (userAgent.includes('Linux')) {
      return 'Linux компьютер';
    }
    
    return platform || 'Неизвестное устройство';
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStudentName = () => {
    if (!studentData) return '';
    const nameParts = studentData.student.name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0]} ${nameParts[1]}`;
    }
    return studentData.student.name;
  };

  const getStudentInitials = () => {
    if (!studentData) return '';
    return studentData.student.name.split(' ').map(n => n[0]).slice(0, 2).join('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!studentData) {
    return null;
  }

  const { student, className } = studentData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 backdrop-blur-md bg-opacity-80 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/student-dashboard')}
              className="flex items-center space-x-2 text-slate-300 hover:text-white font-medium transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>{t('common.back')}</span>
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold text-white">Профиль</h1>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-3 h-3 bg-emerald-500 rounded-full shadow-lg animate-pulse"
              title="Активный сеанс"
            />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Messages */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-emerald-900 border border-emerald-700 text-emerald-100 px-4 py-3 rounded-lg mb-6 max-w-2xl mx-auto text-center shadow-lg"
            >
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>{success}</span>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg mb-6 max-w-2xl mx-auto text-center shadow-lg"
            >
              <div className="flex items-center justify-center space-x-2">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-5xl mx-auto">
          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 rounded-xl shadow-2xl mb-8 overflow-hidden border border-slate-700"
          >
            <div className="flex flex-wrap border-b border-slate-700">
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center space-x-2 px-6 py-4 font-medium transition-all ${
                  activeTab === 'settings'
                    ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-700/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Профиль</span>
              </button>

              <button
                onClick={() => setActiveTab('security')}
                className={`flex items-center space-x-2 px-6 py-4 font-medium transition-all ${
                  activeTab === 'security'
                    ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-700/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Безопасность</span>
              </button>

              <button
                onClick={() => navigate('/student-chat')}
                className="flex items-center space-x-2 px-6 py-4 font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700/30 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Чат класса</span>
              </button>

              <button
                onClick={() => navigate('/student-games')}
                className="flex items-center space-x-2 px-6 py-4 font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700/30 transition-all"
              >
                <Gamepad2 className="w-4 h-4" />
                <span>Игры</span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-8">
              <AnimatePresence mode="wait">
                {/* Settings Tab */}
                {activeTab === 'settings' && (
                  <motion.div
                    key="settings"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    {/* Avatar Section */}
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-white mb-8">Аватар профиля</h3>

                      <div className="relative inline-block">
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="w-40 h-40 rounded-2xl overflow-hidden bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-6 shadow-2xl"
                        >
                          {avatarPreview ? (
                            <img
                              src={avatarPreview}
                              alt="Аватар"
                              className="w-full h-full object-cover"
                            />
                          ) : localProfile?.avatar_url ? (
                            <img
                              src={localProfile.avatar_url}
                              alt="Аватар"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-bold text-5xl">
                              {getStudentInitials()}
                            </span>
                          )}
                        </motion.div>

                        {avatarLoading && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-2xl flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                          </div>
                        )}
                      </div>

                      <p className="text-slate-300 text-sm mt-4 mb-6">
                        {getStudentName()} • Класс {className}
                      </p>

                      <div className="flex justify-center gap-4">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                            disabled={avatarLoading}
                          />
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg transition-colors cursor-pointer shadow-lg font-medium"
                          >
                            <Upload className="w-4 h-4" />
                            <span>Изменить</span>
                          </motion.div>
                        </label>

                        {(avatarPreview || localProfile?.avatar_url) && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={async () => {
                              if (!studentData) return;
                              try {
                                setAvatarLoading(true);
                                await updateStudentAvatar(studentData.student.id, '');
                                setAvatarPreview(null);
                                await loadProfileData();
                                setSuccess('Аватар удален');
                                setTimeout(() => setSuccess(null), 3000);
                              } catch (err) {
                                setError('Ошибка удаления аватара');
                              } finally {
                                setAvatarLoading(false);
                              }
                            }}
                            disabled={avatarLoading}
                            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg font-medium"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Удалить</span>
                          </motion.button>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 mt-4">
                        JPG, PNG, GIF • Макс 5MB
                      </p>
                    </div>

                    {/* Profile Info */}
                    <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
                      <h4 className="text-lg font-bold text-white mb-6">Информация о профиле</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-800/50 rounded-lg p-4">
                          <p className="text-slate-400 text-sm mb-1">Имя</p>
                          <p className="font-medium text-white">{student.name}</p>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-4">
                          <p className="text-slate-400 text-sm mb-1">Класс</p>
                          <p className="font-medium text-white">{className}</p>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-4">
                          <p className="text-slate-400 text-sm mb-1">Регистрация</p>
                          <p className="font-medium text-white text-sm">
                            {student.registration_date
                              ? formatDateTime(student.registration_date).split(',')[0]
                              : 'Не указана'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                  <motion.div
                    key="security"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    {/* Current Session Info */}
                    <div className="bg-cyan-900/30 rounded-lg p-6 border border-cyan-700/50">
                      <div className="flex items-center space-x-3 mb-4">
                        <Clock className="w-5 h-5 text-cyan-400" />
                        <h4 className="text-lg font-bold text-white">Текущая сессия</h4>
                      </div>
                      {student.last_login ? (
                        <div className="space-y-2">
                          <p className="text-slate-300">
                            <span className="text-slate-400">Последний вход:</span> {formatDateTime(student.last_login)}
                          </p>
                          <p className="text-slate-300">
                            <span className="text-slate-400">Устройство:</span> {formatDeviceInfo(student.device_info)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-slate-400">Информация о сессии недоступна</p>
                      )}
                    </div>

                    {/* Login History */}
                    <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
                      <h4 className="text-lg font-bold text-white mb-6">История входов</h4>
                      {localLoginSessions.length === 0 ? (
                        <div className="text-center py-8">
                          <Monitor className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                          <p className="text-slate-400">История входов пуста</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {localLoginSessions.map((session, index) => (
                            <motion.div
                              key={session.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="flex items-center space-x-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors"
                            >
                              <div className="w-10 h-10 bg-cyan-900/50 rounded-lg flex items-center justify-center">
                                {formatDeviceInfo(session.device_info).includes('Мобильное') ? (
                                  <Smartphone className="w-5 h-5 text-cyan-400" />
                                ) : (
                                  <Monitor className="w-5 h-5 text-cyan-400" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-white text-sm">
                                  {formatDateTime(session.login_time)}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {formatDeviceInfo(session.device_info)}
                                </p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Password Management */}
                    <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
                      <h4 className="text-lg font-bold text-white mb-6">Управление паролем</h4>

                      {!showPasswordForm ? (
                        <div className="space-y-4">
                          <p className="text-slate-300 mb-6">
                            Изменяйте пароль для повышения безопасности или сбросьте его для получения новой ссылки доступа.
                          </p>

                          <div className="flex flex-col sm:flex-row gap-3">
                            <button
                              onClick={() => setShowPasswordForm(true)}
                              className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-3 rounded-lg transition-colors font-medium"
                            >
                              Изменить пароль
                            </button>

                            <button
                              onClick={handlePasswordReset}
                              disabled={passwordLoading}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                            >
                              {passwordLoading ? (
                                <div className="flex items-center justify-center space-x-2">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Сброс...</span>
                                </div>
                              ) : (
                                'Сбросить пароль'
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <form onSubmit={handlePasswordChange} className="space-y-5">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Старый пароль
                            </label>
                            <div className="relative">
                              <input
                                type={showOldPassword ? 'text' : 'password'}
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-slate-500"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowOldPassword(!showOldPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-slate-700 rounded text-slate-400"
                              >
                                {showOldPassword ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Новый пароль
                            </label>
                            <div className="relative">
                              <input
                                type={showNewPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-slate-500"
                                required
                                minLength={4}
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-slate-700 rounded text-slate-400"
                              >
                                {showNewPassword ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Подтверждение пароля
                            </label>
                            <div className="relative">
                              <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-slate-500"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-slate-700 rounded text-slate-400"
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <button
                              type="submit"
                              disabled={passwordLoading || !oldPassword || !newPassword || !confirmPassword}
                              className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                            >
                              {passwordLoading ? (
                                <div className="flex items-center justify-center space-x-2">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Изменение...</span>
                                </div>
                              ) : (
                                'Сохранить'
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setShowPasswordForm(false);
                                setOldPassword('');
                                setNewPassword('');
                                setConfirmPassword('');
                                setError(null);
                              }}
                              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors font-medium"
                            >
                              Отмена
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}