import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Хук для управления навигацией и корректной работы кнопки "Назад"
 */
export function useNavigationGuard() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Предотвращаем случайное закрытие на важных страницах
      const protectedPaths = ['/auth/', '/student-dashboard', '/student-profile'];
      const isProtectedPath = protectedPaths.some(path => location.pathname.includes(path));
      
      if (isProtectedPath) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    const handlePopState = (event: PopStateEvent) => {
      // Обработка системной кнопки "Назад"
      const currentPath = location.pathname;
      
      // На главной странице - закрываем приложение
      if (currentPath === '/' && window.history.length <= 1) {
        window.close();
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
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
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
      window.history.replaceState(null, '', '/');
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

  return {
    navigateWithHistoryReplacement,
    validateStudentSession
  };
}