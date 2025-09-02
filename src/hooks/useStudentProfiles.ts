import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { StudentProfile } from '../lib/supabase';

// Кэш для профилей студентов
const profilesCache = new Map<string, StudentProfile | null>();

// Слушаем обновления профилей
if (typeof window !== 'undefined') {
  window.addEventListener('profileUpdated', (event: any) => {
    const { studentId, avatarUrl } = event.detail;
    const existingProfile = profilesCache.get(studentId);
    if (existingProfile) {
      profilesCache.set(studentId, { ...existingProfile, avatar_url: avatarUrl });
    } else {
      profilesCache.set(studentId, {
        id: '',
        student_id: studentId,
        avatar_url: avatarUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  });
}

export function useStudentProfiles(studentIds: string[]) {
  const [profiles, setProfiles] = useState<Map<string, StudentProfile | null>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (studentIds.length === 0) return;

    const loadProfiles = async () => {
      // Проверяем, какие профили уже есть в кэше
      const uncachedIds = studentIds.filter(id => !profilesCache.has(id));
      
      if (uncachedIds.length === 0) {
        // Все профили уже в кэше
        const cachedProfiles = new Map<string, StudentProfile | null>();
        studentIds.forEach(id => {
          cachedProfiles.set(id, profilesCache.get(id) || null);
        });
        setProfiles(cachedProfiles);
        return;
      }

      try {
        setLoading(true);
        
        // Загружаем только недостающие профили
        const { data, error } = await supabase
          .from('student_profiles')
          .select('*')
          .in('student_id', uncachedIds);

        if (error) throw error;

        // Обновляем кэш
        uncachedIds.forEach(id => {
          const profile = data?.find(p => p.student_id === id) || null;
          profilesCache.set(id, profile);
        });

        // Создаем итоговую карту профилей
        const allProfiles = new Map<string, StudentProfile | null>();
        studentIds.forEach(id => {
          allProfiles.set(id, profilesCache.get(id) || null);
        });
        
        setProfiles(allProfiles);
      } catch (error) {
        console.error('Error loading student profiles:', error);
        
        // Проверяем тип ошибки для более информативного сообщения
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          console.error('Network error: Unable to connect to Supabase. Please check your internet connection and Supabase configuration.');
        }
        
        // В случае ошибки устанавливаем null для всех студентов
        const errorProfiles = new Map<string, StudentProfile | null>();
        studentIds.forEach(id => {
          errorProfiles.set(id, null);
        });
        setProfiles(errorProfiles);
      } finally {
        setLoading(false);
      }
    };

    loadProfiles();
  }, [studentIds.join(',')]);

  // Функция для обновления профиля в кэше
  const updateProfile = (studentId: string, profile: StudentProfile | null) => {
    profilesCache.set(studentId, profile);
    setProfiles(prev => new Map(prev.set(studentId, profile)));
  };

  return { profiles, loading, updateProfile };
}

// Хук для одного профиля
export function useStudentProfile(studentId: string) {
  const { profiles, loading, updateProfile } = useStudentProfiles([studentId]);
  return { 
    profile: profiles.get(studentId) || null, 
    loading, 
    updateProfile: (profile: StudentProfile | null) => updateProfile(studentId, profile)
  };
}