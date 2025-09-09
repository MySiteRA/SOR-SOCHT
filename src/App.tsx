import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import AdminStudentsPage from './pages/AdminStudentsPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import StudentProfilePage from './pages/StudentProfilePage';
import ClassSelectionPage from './pages/ClassSelectionPage';
import StudentSelectionPage from './pages/StudentSelectionPage';
import AuthPage from './pages/AuthPage';
import StudentSorPage from './pages/StudentSorPage';
import StudentSochPage from './pages/StudentSochPage';
import StudentMaterialsPage from './pages/StudentMaterialsPage';
import ProtectedRoute from './components/ProtectedRoute';
import Modal from './components/Modal';
import { validateAdminCredentials } from './lib/api';
import { Lock } from 'lucide-react';
import { useLanguage } from './contexts/LanguageContext';

function AppContent() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return localStorage.getItem('adminLoggedIn') === 'true';
  });
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showStudentsPage, setShowStudentsPage] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);

  // Управление историей браузера для корректной работы кнопки "Назад"
  React.useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Если пользователь на главной странице и нажал "Назад", закрываем приложение
      if (location.pathname === '/' && window.history.length <= 1) {
        window.close();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [location.pathname]);

  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    localStorage.setItem('adminLoggedIn', 'true');
    setShowAdminModal(false);
    setAdminUsername('');
    setAdminPassword('');
    setAdminError(null);
    navigate('/admin');
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    localStorage.removeItem('adminLoggedIn');
    // Очищаем историю и перенаправляем на главную
    window.history.replaceState(null, '', '/');
    navigate('/');
  };

  const handleStudentLogout = () => {
    // Очищаем все данные сессии
    localStorage.removeItem('studentDashboardData');
    localStorage.setItem('skipAutoLogin', 'true');
    // Очищаем историю и перенаправляем на главную
    window.history.replaceState(null, '', '/');
    navigate('/', { replace: true });
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateAdminCredentials(adminUsername, adminPassword)) {
      handleAdminLoginSuccess();
    } else {
      setAdminError(t('admin.invalidCredentials'));
    }
  };

  const closeAdminModal = () => {
    setShowAdminModal(false);
    setAdminUsername('');
    setAdminPassword('');
    setAdminError(null);
  };

  return (
    <>
      <Routes>
        {/* Публичные страницы */}
        <Route path="/" element={<ClassSelectionPage onShowAdminModal={() => setShowAdminModal(true)} />} />
        <Route path="/class/:classId" element={<StudentSelectionPage />} />
        <Route path="/auth/:studentId" element={<AuthPage />} />
        
        {/* Студенческие страницы */}
        <Route 
          path="/student-dashboard" 
          element={
            <ProtectedRoute requiresStudentSession>
              <StudentDashboardPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/student-profile" 
          element={
            <ProtectedRoute requiresStudentSession>
              <StudentProfilePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/student-sor" 
          element={
            <ProtectedRoute requiresStudentSession>
              <StudentSorPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/student-soch" 
          element={
            <ProtectedRoute requiresStudentSession>
              <StudentSochPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/student-sor-materials/:subjectId" 
          element={
            <ProtectedRoute requiresStudentSession>
              <StudentMaterialsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/student-soch-materials/:subjectId" 
          element={
            <ProtectedRoute requiresStudentSession>
              <StudentMaterialsPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Админские страницы */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requiresAdminSession>
              showStudentsPage ? (
                <AdminStudentsPage onBack={() => setShowStudentsPage(false)} />
              ) : (
                <AdminPage
                  onLogout={handleAdminLogout} 
                  onShowStudents={() => setShowStudentsPage(true)}
                />
              )
            </ProtectedRoute>
          } 
        />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Admin Login Modal */}
      <Modal
        isOpen={showAdminModal}
        onClose={closeAdminModal}
        title={t('admin.login')}
      >
        <div className="space-y-6">
          <div className="text-center">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <p className="text-gray-600">{t('admin.login')}</p>
          </div>

          {adminError && (
            <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {adminError}
            </div>
          )}

          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin.username')}
              </label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin.password')}
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 font-medium"
            >
              {t('auth.login')}
            </button>
          </form>
        </div>
      </Modal>
    </>
  );
}

function App() {
  return (
    <LanguageProvider>
      <Router>
        <AppContent />
      </Router>
    </LanguageProvider>
  );
}

export default App;