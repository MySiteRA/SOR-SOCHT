import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, User, Shield, Camera, Upload, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, Monitor, Smartphone, Calendar, Clock, Trash2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  getStudentProfile, 
  updateStudentAvatar, 
  getStudentLoginSessions,
  resetStudentPassword,
  changeStudentPassword
} from '../lib/api';
import type { Student, StudentProfile, LoginSession } from '../lib/supabase';

type ProfileTab = 'settings' | 'security';

export default function StudentProfilePage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [className, setClassName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ProfileTab>('settings');
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loginSessions, setLoginSessions] = useState<LoginSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    loadStudentData();
  }, []);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      const dashboardData = localStorage.getItem('studentDashboardData');
      
      if (!dashboardData) {
        navigate('/', { replace: true });
        return;
      }
      
      const parsed = JSON.parse(dashboardData);
      setStudent(parsed.student);
      setClassName(parsed.className);
      
      // Загружаем данные профиля
      await loadProfileData(parsed.student.id);
    } catch (err) {
      navigate('/', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const loadProfileData = async (studentId: string) => {
    try {
      setError(null);
      
      // Загружаем профиль
      const profileData = await getStudentProfile(studentId);
      setProfile(profileData);
      
      if (profileData?.avatar_url) {
        setAvatarPreview(profileData.avatar_url);
      }
      
      // Загружаем сессии входа
      const sessionsData = await getStudentLoginSessions(studentId, 5);
      setLoginSessions(sessionsData);
    } catch (err) {
      setError('Ошибка загрузки данных профиля');
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!student) return;
    
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

      await updateStudentAvatar(student.id, dataUrl);
      await loadProfileData(student.id); // Перезагружаем данные
      
      setSuccess('Аватар успешно обновлен');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Ошибка загрузки аватара');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!student) return;
    
    if (!confirm('Вы уверены, что хотите сбросить пароль? После сброса вам потребуется новый ключ для входа.')) {
      return;
    }

    try {
      setPasswordLoading(true);
      setError(null);
      
      await resetStudentPassword(student.id);
      
      setSuccess('Пароль успешно сброшен. Теперь вам потребуется новый ключ для входа.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError('Ошибка сброса пароля');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    if (!student) return;
    
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
      
      await changeStudentPassword(student.id, oldPassword, newPassword);
      
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
    if (!student) return '';
    const nameParts = student.name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0]} ${nameParts[1]}`;
    }
    return student.name;
  };

  const getStudentInitials = () => {
    if (!student) return '';
    return student.name.split(' ').map(n => n[0]).slice(0, 2).join('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!student) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Session Indicator */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-3 h-3 bg-green-500 rounded-full shadow-lg animate-pulse"
                title="Активный сеанс"
              />
              
              <button
                onClick={() => navigate('/student-dashboard')}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>{t('common.back')}</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Профиль</h1>
                <p className="text-gray-600">{getStudentName()} • {t('home.class')} {className}</p>
              </div>
            </div>
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
              className="bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6 max-w-2xl mx-auto text-center"
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
              className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 max-w-2xl mx-auto text-center"
            >
              <div className="flex items-center justify-center space-x-2">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-2 text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-4xl mx-auto">
          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg mb-8 overflow-hidden"
          >
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors flex-1 ${
                  activeTab === 'settings'
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                    : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Настройки профиля</span>
              </button>
              
              <button
                onClick={() => setActiveTab('security')}
                className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors flex-1 ${
                  activeTab === 'security'
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                    : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Безопасность</span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6">
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
                      <h3 className="text-lg font-semibold text-gray-900 mb-6">Аватар профиля</h3>
                      
                      <div className="relative inline-block">
                        <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                          {avatarPreview ? (
                            <img
                              src={avatarPreview}
                              alt="Аватар"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-bold text-3xl">
                              {getStudentInitials()}
                            </span>
                          )}
                        </div>
                        
                        {avatarLoading && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <label className="inline-block">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                            disabled={avatarLoading}
                          />
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer shadow-lg"
                          >
                            <Upload className="w-4 h-4" />
                            <span>Загрузить аватар</span>
                          </motion.div>
                        </label>
                        
                        {(avatarPreview || profile?.avatar_url) && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={async () => {
                              try {
                                setAvatarLoading(true);
                                await updateStudentAvatar(student.id, '');
                                setAvatarPreview(null);
                                await loadProfileData(student.id);
                                setSuccess('Аватар удален');
                                setTimeout(() => setSuccess(null), 3000);
                              } catch (err) {
                                setError('Ошибка удаления аватара');
                              } finally {
                                setAvatarLoading(false);
                              }
                            }}
                            disabled={avatarLoading}
                            className="inline-flex items-center space-x-2 bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Удалить аватар</span>
                          </motion.button>
                        )}
                        
                        <p className="text-sm text-gray-500">
                          Поддерживаются форматы: JPG, PNG, GIF. Максимальный размер: 5MB
                        </p>
                      </div>
                    </div>

                    {/* Profile Info */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Информация о профиле</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Имя:</span>
                          <span className="font-medium text-gray-900">{student.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Класс:</span>
                          <span className="font-medium text-gray-900">{className}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Дата регистрации:</span>
                          <span className="font-medium text-gray-900">
                            {student.registration_date 
                              ? formatDateTime(student.registration_date)
                              : 'Не указана'
                            }
                          </span>
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
                    <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Текущая сессия</h4>
                      {student.last_login ? (
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <Clock className="w-5 h-5 text-blue-600" />
                            <div>
                              <p className="font-medium text-gray-900">
                                Последний вход: {formatDateTime(student.last_login)}
                              </p>
                              <p className="text-sm text-gray-600">
                                Устройство: {formatDeviceInfo(student.device_info)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-600">Информация о сессии недоступна</p>
                      )}
                    </div>

                    {/* Login History */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">История входов</h4>
                      {loginSessions.length === 0 ? (
                        <div className="text-center py-6">
                          <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600">История входов пуста</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {loginSessions.map((session, index) => (
                            <motion.div
                              key={session.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100"
                            >
                              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                {formatDeviceInfo(session.device_info).includes('Мобильное') ? (
                                  <Smartphone className="w-4 h-4 text-indigo-600" />
                                ) : (
                                  <Monitor className="w-4 h-4 text-indigo-600" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">
                                  {formatDateTime(session.login_time)}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {formatDeviceInfo(session.device_info)}
                                </p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                            
                    {/* Password Management */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Управление паролем</h4>
                      
                      {!showPasswordForm ? (
                        <div className="space-y-4">
                          <p className="text-gray-600 mb-4">
                            Вы можете изменить свой пароль или сбросить его для получения нового ключа доступа.
                          </p>
                          
                          <div className="flex space-x-3">
                            <button
                              onClick={() => setShowPasswordForm(true)}
                              className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                            >
                              Изменить пароль
                            </button>
                            
                            <button
                              onClick={handlePasswordReset}
                              disabled={passwordLoading}
                              className="w-full bg-red-600 text-white px-4 py-3 rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
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
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Старый пароль
                            </label>
                            <div className="relative">
                              <input
                                type={showOldPassword ? 'text' : 'password'}
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowOldPassword(!showOldPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                              >
                                {showOldPassword ? (
                                  <EyeOff className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <Eye className="w-4 h-4 text-gray-400" />
                                )}
                              </button>
                            </div>
                          </div>




                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Новый пароль
                            </label>
                            <div className="relative">
                              <input
                                type={showNewPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                required
                                minLength={4}
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                              >
                                {showNewPassword ? (
                                  <EyeOff className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <Eye className="w-4 h-4 text-gray-400" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Подтвердите новый пароль
                            </label>
                            <div className="relative">
                              <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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

                          <div className="flex space-x-3">
                            <button
                              type="submit"
                              disabled={passwordLoading || !oldPassword || !newPassword || !confirmPassword}
                              className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                            >
                              {passwordLoading ? (
                                <div className="flex items-center justify-center space-x-2">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Изменение...</span>
                                </div>
                              ) : (
                                'Изменить пароль'
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
                              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
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