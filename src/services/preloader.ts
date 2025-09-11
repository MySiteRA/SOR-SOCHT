import { supabase } from '../lib/supabase';
import { getStudentProfile, getStudentLoginSessions } from '../lib/api';
import { extractGradeFromClassName } from '../lib/api';
import { avatarPreloader } from './avatarPreloader';
import type { Student, Material, StudentProfile, LoginSession, Subject } from '../lib/supabase';

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
  // Убираем content_value для экономии места
}

// Интерфейс для полных данных материала
interface MaterialFullData extends MaterialMetadata {
  content_value: Array<{type: string, value: string}>;
}

interface PreloadedData {
  profile: StudentProfile | null;
  loginSessions: LoginSession[];
  subjects: Subject[];
  sorMaterials: MaterialMetadata[]; // Только метаданные
  sochMaterials: MaterialMetadata[]; // Только метаданные
  timestamp: number;
}

interface CachedData extends PreloadedData {
  isValid: boolean;
}

// Настройки кэширования
const CACHE_DURATION = 10 * 60 * 1000; // 10 минут
const CACHE_KEY = 'preloaded_data';
const MATERIAL_CACHE_KEY = 'material_full_data';
const BACKGROUND_UPDATE_KEY = 'background_update_in_progress';
const MAX_CACHE_SIZE = 2 * 1024 * 1024; // 2MB лимит для localStorage
const MAX_MATERIALS_COUNT = 75; // Максимум материалов в кэше
const MATERIAL_CACHE_LIMIT = 50; // Максимум полных материалов в кэше

class DataPreloader {
  private isLoading = false;
  private loadingPromise: Promise<PreloadedData | null> = Promise.resolve(null);
  private backgroundUpdatePromise: Promise<void> | null = null;

  /**
   * Проверяет размер данных в байтах
   */
  private getDataSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  /**
   * Проверяет, не превышает ли размер кэша лимит
   */
  private checkCacheSize(): boolean {
    try {
      let totalSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length;
        }
      }
      return totalSize < MAX_CACHE_SIZE;
    } catch (error) {
      console.warn('Error checking cache size:', error);
      return false;
    }
  }

  /**
   * Очищает старые записи из кэша материалов (LRU)
   */
  private cleanupMaterialCache(): void {
    try {
      const cacheData = localStorage.getItem(MATERIAL_CACHE_KEY);
      if (!cacheData) return;

      const cache: Record<string, {data: MaterialFullData, timestamp: number}> = JSON.parse(cacheData);
      const entries = Object.entries(cache);
      
      // Если превышен лимит, удаляем самые старые записи
      if (entries.length > MATERIAL_CACHE_LIMIT) {
        // Сортируем по времени доступа (самые старые первыми)
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        // Оставляем только последние MATERIAL_CACHE_LIMIT записей
        const keepEntries = entries.slice(-MATERIAL_CACHE_LIMIT);
        const newCache: Record<string, {data: MaterialFullData, timestamp: number}> = {};
        
        keepEntries.forEach(([key, value]) => {
          newCache[key] = value;
        });
        
        localStorage.setItem(MATERIAL_CACHE_KEY, JSON.stringify(newCache));
      }
    } catch (error) {
      console.error('Error cleaning up material cache:', error);
      localStorage.removeItem(MATERIAL_CACHE_KEY);
    }
  }

  /**
   * Безопасно сохраняет данные в localStorage с проверкой размера
   */
  private safeSetItem(key: string, data: any): boolean {
    try {
      const dataString = JSON.stringify(data);
      const dataSize = new Blob([dataString]).size;
      
      // Если данные слишком большие, не сохраняем
      if (dataSize > MAX_CACHE_SIZE / 2) {
        console.warn('Data too large for cache:', key, dataSize);
        return false;
      }
      
      // Проверяем общий размер кэша
      if (!this.checkCacheSize()) {
        // Очищаем старые данные
        this.clearOldCache();
      }
      
      localStorage.setItem(key, dataString);
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('LocalStorage quota exceeded, clearing cache');
        this.clearOldCache();
        
        // Пытаемся сохранить еще раз после очистки
        try {
          localStorage.setItem(key, JSON.stringify(data));
          return true;
        } catch (retryError) {
          console.error('Failed to save after cache cleanup:', retryError);
          return false;
        }
      } else {
        console.error('Error saving to localStorage:', error);
        return false;
      }
    }
  }

  /**
   * Очищает старые данные из кэша
   */
  private clearOldCache(): void {
    try {
      // Удаляем самые старые записи материалов
      this.cleanupMaterialCache();
      
      // Если все еще превышен лимит, удаляем весь кэш материалов
      if (!this.checkCacheSize()) {
        localStorage.removeItem(MATERIAL_CACHE_KEY);
      }
      
      // В крайнем случае удаляем основной кэш
      if (!this.checkCacheSize()) {
        localStorage.removeItem(CACHE_KEY);
      }
    } catch (error) {
      console.error('Error clearing old cache:', error);
      // В крайнем случае очищаем весь localStorage
      try {
        localStorage.clear();
      } catch (clearError) {
        console.error('Failed to clear localStorage:', clearError);
      }
    }
  }

  /**
   * Получает данные из кэша
   */
  getCachedData(): CachedData | null {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const data: PreloadedData = JSON.parse(cached);
      const isValid = Date.now() - data.timestamp < CACHE_DURATION;

      return { ...data, isValid };
    } catch (error) {
      console.error('Error reading cached data:', error);
      this.clearCache();
      return null;
    }
  }

  /**
   * Сохраняет данные в кэш
   */
  private setCachedData(data: PreloadedData): void {
    this.safeSetItem(CACHE_KEY, data);
  }

  /**
   * Получает полные данные материала из кэша или загружает их
   */
  async getMaterialFullData(materialId: string): Promise<MaterialFullData | null> {
    try {
      // Сначала проверяем кэш
      const cacheData = localStorage.getItem(MATERIAL_CACHE_KEY);
      if (cacheData) {
        const cache: Record<string, {data: MaterialFullData, timestamp: number}> = JSON.parse(cacheData);
        if (cache[materialId]) {
          // Обновляем timestamp для LRU
          cache[materialId].timestamp = Date.now();
          this.safeSetItem(MATERIAL_CACHE_KEY, cache);
          return cache[materialId].data;
        }
      }

      // Загружаем из базы данных
      const { data, error } = await supabase
        .from('materials')
        .select('*, subject:subjects(*)')
        .eq('id', materialId)
        .single();

      if (error) throw error;

      const fullMaterial: MaterialFullData = {
        ...data,
        content_value: Array.isArray(data.content_value) ? data.content_value : []
      };

      // Сохраняем в кэш
      this.cacheMaterialFullData(materialId, fullMaterial);

      return fullMaterial;
    } catch (error) {
      console.error('Error loading material full data:', error);
      return null;
    }
  }

  /**
   * Сохраняет полные данные материала в кэш
   */
  private cacheMaterialFullData(materialId: string, material: MaterialFullData): void {
    try {
      const cacheData = localStorage.getItem(MATERIAL_CACHE_KEY);
      const cache: Record<string, {data: MaterialFullData, timestamp: number}> = cacheData ? JSON.parse(cacheData) : {};
      
      cache[materialId] = {
        data: material,
        timestamp: Date.now()
      };

      // Очищаем старые записи перед сохранением
      this.cleanupMaterialCache();
      
      this.safeSetItem(MATERIAL_CACHE_KEY, cache);
    } catch (error) {
      console.error('Error caching material full data:', error);
    }
  }

  /**
   * Очищает кэш
   */
  clearCache(): void {
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(MATERIAL_CACHE_KEY);
      localStorage.removeItem(BACKGROUND_UPDATE_KEY);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Проверяет, есть ли активная сессия студента
   */
  private getStudentSession(): { student: Student; className: string } | null {
    try {
      const dashboardData = localStorage.getItem('studentDashboardData');
      if (!dashboardData) return null;

      const parsed = JSON.parse(dashboardData);
      if (!parsed.student || !parsed.className) return null;

      return parsed;
    } catch (error) {
      console.error('Error parsing student session:', error);
      return null;
    }
  }

  /**
   * Загружает профиль студента
   */
  private async loadStudentProfile(studentId: string): Promise<{
    profile: StudentProfile | null;
    loginSessions: LoginSession[];
  }> {
    try {
      const [profile, loginSessions] = await Promise.all([
        getStudentProfile(studentId),
        getStudentLoginSessions(studentId, 5)
      ]);

      return { profile, loginSessions };
    } catch (error) {
      console.error('Error loading student profile:', error);
      return { profile: null, loginSessions: [] };
    }
  }

  /**
   * Загружает предметы
   */
  private async loadSubjects(): Promise<Subject[]> {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading subjects:', error);
      return [];
    }
  }

  /**
   * Загружает метаданные материалов (без тяжелого контента)
   */
  private async loadMaterialsMetadata(grade: number): Promise<{
    sorMaterials: MaterialMetadata[];
    sochMaterials: MaterialMetadata[];
  }> {
    try {
      const [sorData, sochData] = await Promise.all([
        supabase
          .from('materials')
          .select('id, subject_id, title, type, created_at, grade, language, quarter, subject:subjects(*)')
          .eq('grade', grade)
          .eq('type', 'SOR')
          .order('created_at', { ascending: false })
          .limit(MAX_MATERIALS_COUNT),
        supabase
          .from('materials')
          .select('id, subject_id, title, type, created_at, grade, language, quarter, subject:subjects(*)')
          .eq('grade', grade)
          .eq('type', 'SOCH')
          .order('created_at', { ascending: false })
          .limit(MAX_MATERIALS_COUNT)
      ]);

      const sorMaterials: MaterialMetadata[] = sorData.error ? [] : (sorData.data || []);
      const sochMaterials: MaterialMetadata[] = sochData.error ? [] : (sochData.data || []);

      return { sorMaterials, sochMaterials };
    } catch (error) {
      console.error('Error loading materials metadata:', error);
      return { sorMaterials: [], sochMaterials: [] };
    }
  }

  /**
   * Загружает все данные для студента
   */
  private async loadAllData(student: Student, className: string): Promise<PreloadedData> {
    const grade = extractGradeFromClassName(className);

    try {
      // Параллельная загрузка всех данных
      const [profileData, subjects, materialsData] = await Promise.all([
        this.loadStudentProfile(student.id),
        this.loadSubjects(),
        this.loadMaterialsMetadata(grade)
      ]);

      return {
        profile: profileData.profile,
        loginSessions: profileData.loginSessions,
        subjects,
        sorMaterials: materialsData.sorMaterials,
        sochMaterials: materialsData.sochMaterials,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error loading all data:', error);
      // Возвращаем пустые данные в случае ошибки
      return {
        profile: null,
        loginSessions: [],
        subjects: [],
        sorMaterials: [],
        sochMaterials: [],
        timestamp: Date.now()
      };
    }
  }

  /**
   * Инициализирует предзагрузку при старте приложения
   */
  async initializePreloading(): Promise<void> {
    const session = this.getStudentSession();
    if (!session) return;

    // Проверяем кэш
    const cached = this.getCachedData();
    if (cached && cached.isValid) {
      // Данные в кэше актуальны, запускаем фоновое обновление
      this.startBackgroundUpdate(session.student, session.className);
      return;
    }

    // Кэш пуст или устарел, загружаем данные
    try {
      const data = await this.loadAllData(session.student, session.className);
      this.setCachedData(data);
      this.notifyDataLoaded(data);
    } catch (error) {
      console.error('Error initializing preloading:', error);
    }
  }

  /**
   * Запускает фоновое обновление данных
   */
  private startBackgroundUpdate(student: Student, className: string): void {
    // Проверяем, не идет ли уже фоновое обновление
    const updateInProgress = localStorage.getItem(BACKGROUND_UPDATE_KEY);
    if (updateInProgress) {
      const updateTime = parseInt(updateInProgress, 10);
      // Если обновление идет меньше 30 секунд, не запускаем новое
      if (Date.now() - updateTime < 30000) {
        return;
      }
    }

    // Отмечаем начало фонового обновления
    localStorage.setItem(BACKGROUND_UPDATE_KEY, Date.now().toString());

    this.backgroundUpdatePromise = this.performBackgroundUpdate(student, className);
  }

  /**
   * Выполняет фоновое обновление данных
   */
  private async performBackgroundUpdate(student: Student, className: string): Promise<void> {
    try {
      const data = await this.loadAllData(student, className);
      this.setCachedData(data);
      this.notifyDataLoaded(data);
    } catch (error) {
      console.error('Error in background update:', error);
    } finally {
      localStorage.removeItem(BACKGROUND_UPDATE_KEY);
      this.backgroundUpdatePromise = null;
    }
  }

  /**
   * Уведомляет компоненты об обновлении данных
   */
  private notifyDataLoaded(data: PreloadedData): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dataPreloaded', { detail: data }));
    }
  }

  /**
   * Запускает предзагрузку данных
   */
  async preloadData(force = false): Promise<PreloadedData | null> {
    const session = this.getStudentSession();
    if (!session) {
      return null;
    }

    // Если уже загружаем и не принудительное обновление, возвращаем текущий промис
    if (this.isLoading && !force) {
      return this.loadingPromise;
    }

    // Проверяем кэш
    const cached = this.getCachedData();
    if (cached && cached.isValid && !force) {
      // Запускаем фоновое обновление
      this.startBackgroundUpdate(session.student, session.className);
      return cached;
    }

    try {
      this.isLoading = true;
      this.loadingPromise = this.loadAllData(session.student, session.className);

      const data = await this.loadingPromise;
      
      // Сохраняем в кэш
      this.setCachedData(data);
      this.notifyDataLoaded(data);
      
      return data;
    } catch (error) {
      console.error('Error preloading data:', error);
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Получает данные (из кэша или загружает)
   */
  async getData(): Promise<PreloadedData | null> {
    const cached = this.getCachedData();
    
    if (cached && cached.isValid) {
      // Запускаем фоновое обновление если нужно
      const session = this.getStudentSession();
      if (session && !this.backgroundUpdatePromise) {
        this.startBackgroundUpdate(session.student, session.className);
      }
      return cached;
    }

    return this.preloadData();
  }

  /**
   * Инвалидирует кэш при изменении данных
   */
  invalidateCache(): void {
    this.clearCache();
    
    // Также очищаем кэш аватарок при инвалидации основного кэша
    avatarPreloader.clearCache();
    
    // Перезапускаем предзагрузку
    const session = this.getStudentSession();
    if (session) {
      this.preloadData(true);
    }
  }

  /**
   * Проверяет, есть ли данные в кэше
   */
  hasCachedData(): boolean {
    const cached = this.getCachedData();
    return cached !== null;
  }

  /**
   * Ожидает завершения фонового обновления
   */
  async waitForBackgroundUpdate(): Promise<void> {
    if (this.backgroundUpdatePromise) {
      await this.backgroundUpdatePromise;
    }
  }
}

// Создаем единственный экземпляр
export const dataPreloader = new DataPreloader();

// Хук для использования предзагруженных данных
export function usePreloadedData() {
  const [data, setData] = React.useState<PreloadedData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = async (force = false) => {
    try {
      setLoading(true);
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
    await loadData(true);
  };

  React.useEffect(() => {
    // Сначала проверяем кэш
    const cached = dataPreloader.getCachedData();
    if (cached) {
      setData(cached);
      setLoading(false);
    }

    // Затем загружаем актуальные данные
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

  return { data, loading, error, invalidate, refresh };
}

// Экспортируем React для использования в хуке
import React from 'react';