import { useState, useEffect } from 'react';
import { dataPreloader } from '../services/preloader';
import type { StudentProfile, LoginSession, Subject } from '../lib/supabase';

// Интерфейс для метаданных материала (без тяжелого контента)
interface MaterialMetadata {
  id: string;
  subject_id: string;
  title: string;
  type: 'SOR' | 'SOCH';
  created_at: string;
  grade: number;
  language: string;
  quarter: number;
  subject?: Subject;
}

interface PreloadedData {
  profile: StudentProfile | null;
  loginSessions: LoginSession[];
  subjects: Subject[];
  sorMaterials: MaterialMetadata[];
  sochMaterials: MaterialMetadata[];
  timestamp: number;
}

interface UsePreloadedDataReturn {
  data: PreloadedData | null;
  loading: boolean;
  error: string | null;
  invalidate: () => void;
  refresh: () => Promise<void>;
  hasCachedData: boolean;
}

export function usePreloadedData(): UsePreloadedDataReturn {
  const [data, setData] = useState<PreloadedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (force = false) => {
    try {
      // Если есть кэш, сразу показываем данные
      if (!force) {
        const cached = dataPreloader.getCachedData();
        if (cached) {
          setData(cached);
          setLoading(false);
        }
      }
      
      setError(null);
      
      const preloadedData = await dataPreloader.getData();
      setData(preloadedData);
    } catch (err) {
      console.error('Error loading preloaded data:', err);
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const invalidate = () => {
    dataPreloader.invalidateCache();
    setData(null);
  };

  const refresh = async () => {
    setLoading(true);
    await loadData(true);
  };

  useEffect(() => {
    loadData();

    // Слушаем обновления данных
    const handleDataUpdate = (event: CustomEvent) => {
      setData(event.detail);
      setError(null);
      setLoading(false);
    };

    // Слушаем изменения в localStorage для синхронизации между вкладками
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'studentDashboardData') {
        if (event.newValue) {
          // Новая сессия - загружаем данные
          loadData();
        } else {
          // Сессия удалена - очищаем данные
          setData(null);
          dataPreloader.clearCache();
          setLoading(false);
        }
      }
    };

    window.addEventListener('dataPreloaded', handleDataUpdate as EventListener);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('dataPreloaded', handleDataUpdate as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return { 
    data, 
    loading, 
    error, 
    invalidate, 
    refresh,
    hasCachedData: dataPreloader.hasCachedData()
  };
}