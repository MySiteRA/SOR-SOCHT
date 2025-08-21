import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import AdminStudentsPage from './pages/AdminStudentsPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import Modal from './components/Modal';
import { validateAdminCredentials } from './lib/api';
import { Lock } from 'lucide-react';
import { useLanguage } from './contexts/LanguageContext';

function AppContent() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return localStorage.getItem('adminLoggedIn') === 'true';
  });
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showStudentsPage, setShowStudentsPage] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);

  // Состояние для студенческого дашборда
  const [studentData, setStudentData] = useState<{student: any, className: string} | null>(() => {
    const saved = localStorage.getItem('studentDashboardData');
    return saved ? JSON.parse(saved) : null;
  });

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
    navigate('/');
  };

  const handleStudentLogin = (student: any, className: string) => {
    const dashboardData = { student, className };
    setStudentData(dashboardData);
    localStorage.setItem('studentDashboardData', JSON.stringify(dashboardData));
    navigate('/student-dashboard');
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
        <Route 
          path="/" 
          element={
            <HomePage 
              onShowAdminModal={() => setShowAdminModal(true)} 
              onStudentLogin={handleStudentLogin}
            />
          } 
        />
        <Route 
          path="/student-dashboard" 
          element={
            studentData ? (
              <StudentDashboardPage 
                student={studentData.student} 
                className={studentData.className}
              />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route 
          path="/admin" 
          element={
            isAdminLoggedIn ? (
              showStudentsPage ? (
                <AdminStudentsPage onBack={() => setShowStudentsPage(false)} />
              ) : (
                <AdminPage 
                  onLogout={handleAdminLogout} 
                  onShowStudents={() => setShowStudentsPage(true)}
                />
              )
            ) : (
              <Navigate to="/" replace />
            )
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