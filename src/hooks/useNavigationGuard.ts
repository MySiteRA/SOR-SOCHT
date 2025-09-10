import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Хук для управления навигацией и корректной работы кнопки "Назад"
 */
export function useNavigationGuard() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const currentPath = location.pathname;
      
      // На главной странице - закрываем приложение
      if (currentPath === '/' && window.history.length <= 2) {
        // Пытаемся закрыть приложение (работает только если открыто через приложение)
        if (window.opener || window.history.length === 1) {
          window.close();
        }
        return;
      }
      
      // После выхода из аккаунта - предотвращаем возврат в личный кабинет
      const isStudentArea = currentPath.startsWith('/student-');
      const hasValidSession = localStorage.getItem('studentDashboardData');
      
      if (isStudentArea && !hasValidSession) {
        event.preventDefault();
        navigate('/', { replace: true });
        return;
      }
      
      // Для админских страниц проверяем сессию админа
      const isAdminArea = currentPath.startsWith('/admin');
      const hasAdminSession = localStorage.getItem('adminLoggedIn') === 'true';
      
      if (isAdminArea && !hasAdminSession) {
        event.preventDefault();
        navigate('/', { replace: true });
        return;
      }
    };

    // Добавляем обработчик только если мы не на главной странице
    if (location.pathname !== '/') {
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [location.pathname, navigate]);

  /**
   * Безопасный переход с очисткой истории
   */
  const navigateWithHistoryReplacement = (path: string, clearSession: boolean = false) => {
    if (clearSession) {
      localStorage.removeItem('studentDashboardData');
      localStorage.setItem('skipAutoLogin', 'true');
    }
    navigate(path, { replace: true });
  };

  /**
   * Проверка валидности сессии для студенческих страниц
   */
  const validateStudentSession = (): boolean => {
    const dashboardData = localStorage.getItem('studentDashboardData');
    return !!dashboardData;
  };

  /**
   * Проверка валидности сессии для админских страниц
   */
  const validateAdminSession = (): boolean => {
    return localStorage.getItem('adminLoggedIn') === 'true';
  };

  return {
    navigateWithHistoryReplacement,
    validateStudentSession,
    validateAdminSession
  };
}