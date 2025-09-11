import { useState, useEffect } from 'react';
import { avatarPreloader } from '../services/avatarPreloader';

interface UseAvatarPreloaderReturn {
  getAvatar: (studentId: string) => string | null;
  preloadAvatars: (studentIds: string[]) => Promise<void>;
  isLoading: boolean;
}

export function useAvatarPreloader(): UseAvatarPreloaderReturn {
  const [avatarMap, setAvatarMap] = useState<Map<string, string | null>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Слушаем обновления аватарок
    const handleAvatarUpdate = (event: CustomEvent) => {
      const { studentId, avatarUrl } = event.detail;
      setAvatarMap(prev => new Map(prev.set(studentId, avatarUrl)));
    };

    window.addEventListener('avatarUpdated', handleAvatarUpdate as EventListener);

    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
    };
  }, []);

  const getAvatar = (studentId: string): string | null => {
    // Сначала проверяем локальное состояние
    if (avatarMap.has(studentId)) {
      return avatarMap.get(studentId) || null;
    }

    // Затем проверяем кэш
    const cachedAvatar = avatarPreloader.getCachedAvatar(studentId);
    if (cachedAvatar !== null) {
      // Обновляем локальное состояние
      setAvatarMap(prev => new Map(prev.set(studentId, cachedAvatar)));
      return cachedAvatar;
    }

    // Запускаем загрузку в фоне
    avatarPreloader.loadStudentAvatar(studentId).catch(console.error);
    
    return null;
  };

  const preloadAvatars = async (studentIds: string[]): Promise<void> => {
    if (studentIds.length === 0) return;

    setIsLoading(true);
    
    try {
      // Сначала загружаем из кэша
      const initialAvatars = new Map<string, string | null>();
      studentIds.forEach(studentId => {
        const cached = avatarPreloader.getCachedAvatar(studentId);
        if (cached !== null) {
          initialAvatars.set(studentId, cached);
        }
      });

      if (initialAvatars.size > 0) {
        setAvatarMap(prev => {
          const newMap = new Map(prev);
          initialAvatars.forEach((avatarUrl, studentId) => {
            newMap.set(studentId, avatarUrl);
          });
          return newMap;
        });
      }

      // Затем запускаем фоновую загрузку
      await avatarPreloader.preloadAvatars(studentIds);
    } catch (error) {
      console.error('Error preloading avatars:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getAvatar,
    preloadAvatars,
    isLoading
  };
}