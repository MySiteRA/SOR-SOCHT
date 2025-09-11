import { supabase } from '../lib/supabase';
import type { StudentProfile } from '../lib/supabase';

// Интерфейс для кэшированной аватарки
interface CachedAvatar {
  studentId: string;
  avatarUrl: string | null;
  timestamp: number;
}

// Настройки кэширования аватарок
const AVATAR_CACHE_KEY = 'avatars_cache';
const AVATAR_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 часа
const MAX_CACHE_SIZE = 500; // Максимум аватарок в кэше

class AvatarPreloader {
  private loadingPromises = new Map<string, Promise<string | null>>();
  private isBackgroundLoading = false;

  /**
   * Получает кэшированные аватарки
   */
  private getCachedAvatars(): Map<string, CachedAvatar> {
    try {
      const cached = localStorage.getItem(AVATAR_CACHE_KEY);
      if (!cached) return new Map();

      const data: Record<string, CachedAvatar> = JSON.parse(cached);
      const avatarMap = new Map<string, CachedAvatar>();
      
      // Фильтруем устаревшие записи
      const now = Date.now();
      Object.values(data).forEach(avatar => {
        if (now - avatar.timestamp < AVATAR_CACHE_DURATION) {
          avatarMap.set(avatar.studentId, avatar);
        }
      });

      return avatarMap;
    } catch (error) {
      console.error('Error reading avatar cache:', error);
      return new Map();
    }
  }

  /**
   * Сохраняет аватарки в кэш
   */
  private setCachedAvatars(avatars: Map<string, CachedAvatar>): void {
    try {
      // Ограничиваем размер кэша
      const avatarsArray = Array.from(avatars.values());
      if (avatarsArray.length > MAX_CACHE_SIZE) {
        // Сортируем по времени и оставляем только последние
        avatarsArray.sort((a, b) => b.timestamp - a.timestamp);
        avatars.clear();
        avatarsArray.slice(0, MAX_CACHE_SIZE).forEach(avatar => {
          avatars.set(avatar.studentId, avatar);
        });
      }

      const data: Record<string, CachedAvatar> = {};
      avatars.forEach((avatar, studentId) => {
        data[studentId] = avatar;
      });

      localStorage.setItem(AVATAR_CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving avatar cache:', error);
      // В случае ошибки очищаем кэш
      this.clearCache();
    }
  }

  /**
   * Получает аватарку из кэша
   */
  getCachedAvatar(studentId: string): string | null {
    const cachedAvatars = this.getCachedAvatars();
    const cached = cachedAvatars.get(studentId);
    return cached?.avatarUrl || null;
  }

  /**
   * Загружает аватарку для конкретного студента
   */
  async loadStudentAvatar(studentId: string): Promise<string | null> {
    // Проверяем, не загружается ли уже эта аватарка
    if (this.loadingPromises.has(studentId)) {
      return this.loadingPromises.get(studentId)!;
    }

    // Создаем промис загрузки
    const loadingPromise = this.fetchStudentAvatar(studentId);
    this.loadingPromises.set(studentId, loadingPromise);

    try {
      const avatarUrl = await loadingPromise;
      
      // Обновляем кэш
      const cachedAvatars = this.getCachedAvatars();
      cachedAvatars.set(studentId, {
        studentId,
        avatarUrl,
        timestamp: Date.now()
      });
      this.setCachedAvatars(cachedAvatars);

      // Уведомляем компоненты об обновлении
      this.notifyAvatarUpdate(studentId, avatarUrl);

      return avatarUrl;
    } finally {
      this.loadingPromises.delete(studentId);
    }
  }

  /**
   * Загружает аватарку из базы данных
   */
  private async fetchStudentAvatar(studentId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .select('avatar_url')
        .eq('student_id', studentId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching student avatar:', error);
        return null;
      }

      return data?.avatar_url || null;
    } catch (error) {
      console.error('Error fetching student avatar:', error);
      return null;
    }
  }

  /**
   * Запускает фоновую загрузку аватарок для списка студентов
   */
  async preloadAvatars(studentIds: string[]): Promise<void> {
    if (this.isBackgroundLoading || studentIds.length === 0) {
      return;
    }

    this.isBackgroundLoading = true;

    try {
      const cachedAvatars = this.getCachedAvatars();
      const studentsToLoad: string[] = [];

      // Определяем, какие аватарки нужно загрузить
      studentIds.forEach(studentId => {
        const cached = cachedAvatars.get(studentId);
        if (!cached || Date.now() - cached.timestamp > AVATAR_CACHE_DURATION) {
          studentsToLoad.push(studentId);
        }
      });

      if (studentsToLoad.length === 0) {
        return;
      }

      // Загружаем аватарки пачками по 10 штук
      const batchSize = 10;
      for (let i = 0; i < studentsToLoad.length; i += batchSize) {
        const batch = studentsToLoad.slice(i, i + batchSize);
        
        // Загружаем пачку параллельно
        const promises = batch.map(studentId => 
          this.loadStudentAvatar(studentId).catch(error => {
            console.error(`Error loading avatar for student ${studentId}:`, error);
            return null;
          })
        );

        await Promise.all(promises);

        // Небольшая задержка между пачками, чтобы не перегружать сервер
        if (i + batchSize < studentsToLoad.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error('Error preloading avatars:', error);
    } finally {
      this.isBackgroundLoading = false;
    }
  }

  /**
   * Массовая загрузка аватарок из базы данных
   */
  async bulkLoadAvatars(studentIds: string[]): Promise<Map<string, string | null>> {
    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .select('student_id, avatar_url')
        .in('student_id', studentIds);

      if (error) {
        console.error('Error bulk loading avatars:', error);
        return new Map();
      }

      const avatarMap = new Map<string, string | null>();
      const cachedAvatars = this.getCachedAvatars();
      const now = Date.now();

      // Обрабатываем загруженные данные
      data?.forEach((profile: StudentProfile) => {
        const avatarUrl = profile.avatar_url;
        avatarMap.set(profile.student_id, avatarUrl);
        
        // Обновляем кэш
        cachedAvatars.set(profile.student_id, {
          studentId: profile.student_id,
          avatarUrl,
          timestamp: now
        });
      });

      // Добавляем студентов без профилей
      studentIds.forEach(studentId => {
        if (!avatarMap.has(studentId)) {
          avatarMap.set(studentId, null);
          cachedAvatars.set(studentId, {
            studentId,
            avatarUrl: null,
            timestamp: now
          });
        }
      });

      // Сохраняем обновленный кэш
      this.setCachedAvatars(cachedAvatars);

      // Уведомляем об обновлениях
      avatarMap.forEach((avatarUrl, studentId) => {
        this.notifyAvatarUpdate(studentId, avatarUrl);
      });

      return avatarMap;
    } catch (error) {
      console.error('Error bulk loading avatars:', error);
      return new Map();
    }
  }

  /**
   * Уведомляет компоненты об обновлении аватарки
   */
  private notifyAvatarUpdate(studentId: string, avatarUrl: string | null): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('avatarUpdated', {
        detail: { studentId, avatarUrl }
      }));
    }
  }

  /**
   * Инвалидирует кэш аватарки для конкретного студента
   */
  invalidateStudentAvatar(studentId: string): void {
    const cachedAvatars = this.getCachedAvatars();
    cachedAvatars.delete(studentId);
    this.setCachedAvatars(cachedAvatars);
  }

  /**
   * Очищает весь кэш аватарок
   */
  clearCache(): void {
    try {
      localStorage.removeItem(AVATAR_CACHE_KEY);
    } catch (error) {
      console.error('Error clearing avatar cache:', error);
    }
  }

  /**
   * Получает статистику кэша
   */
  getCacheStats(): { size: number; oldestTimestamp: number; newestTimestamp: number } {
    const cachedAvatars = this.getCachedAvatars();
    const avatars = Array.from(cachedAvatars.values());
    
    if (avatars.length === 0) {
      return { size: 0, oldestTimestamp: 0, newestTimestamp: 0 };
    }

    const timestamps = avatars.map(a => a.timestamp);
    return {
      size: avatars.length,
      oldestTimestamp: Math.min(...timestamps),
      newestTimestamp: Math.max(...timestamps)
    };
  }

  /**
   * Проверяет, есть ли аватарки в кэше
   */
  hasCachedAvatars(): boolean {
    return this.getCachedAvatars().size > 0;
  }
}

// Создаем единственный экземпляр
export const avatarPreloader = new AvatarPreloader();