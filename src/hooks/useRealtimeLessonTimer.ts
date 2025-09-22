import { useState, useEffect, useRef } from 'react';
import { ref, onValue, set, serverTimestamp } from 'firebase/database';
import { db } from '../firebase';

interface ScheduleItem {
  id: string;
  class_id: string;
  day_of_week: string;
  lesson_number: number;
  subject: string;
  teacher: string;
  room: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

interface CurrentLesson {
  current: ScheduleItem | null;
  next: ScheduleItem | null;
  timeLeft: {
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
  };
  isFinished: boolean;
  isBreak: boolean;
  timeUntilNext: {
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
  };
}

interface UseRealtimeLessonTimerProps {
  classId: string;
  schedule: ScheduleItem[];
}

export function useRealtimeLessonTimer({ classId, schedule }: UseRealtimeLessonTimerProps) {
  const [currentLesson, setCurrentLesson] = useState<CurrentLesson>({
    current: null,
    next: null,
    timeLeft: { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 },
    isFinished: false,
    isBreak: false,
    timeUntilNext: { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 }
  });
  
  const [serverTime, setServerTime] = useState<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Синхронизация времени с Firebase
  useEffect(() => {
    const syncTime = () => {
      const timeRef = ref(db, `server_time/${classId}`);
      set(timeRef, serverTimestamp()).then(() => {
        onValue(timeRef, (snapshot) => {
          const firebaseTime = snapshot.val();
          if (firebaseTime) {
            setServerTime(firebaseTime);
          }
        }, { onlyOnce: true });
      });
    };

    // Синхронизируем время каждые 30 секунд
    syncTime();
    syncIntervalRef.current = setInterval(syncTime, 30000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [classId]);

  // Функция для преобразования времени в секунды
  const timeToSeconds = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 3600 + minutes * 60;
  };

  // Функция для преобразования секунд в объект времени
  const secondsToTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return { hours, minutes, seconds, totalSeconds };
  };

  // Обновление текущего урока
  const updateCurrentLesson = () => {
    const now = new Date(serverTime);
    const currentDay = now.getDay(); // 0 = воскресенье, 1 = понедельник, ...
    const currentTimeInSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    // Преобразуем день недели в название
    const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const todayName = dayNames[currentDay];

    // Получаем расписание на сегодня
    const todaySchedule = schedule
      .filter(item => item.day_of_week === todayName)
      .sort((a, b) => a.lesson_number - b.lesson_number);

    if (todaySchedule.length === 0) {
      setCurrentLesson({
        current: null,
        next: null,
        timeLeft: { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 },
        isFinished: true,
        isBreak: false,
        timeUntilNext: { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 }
      });
      return;
    }

    // Находим текущий и следующий урок
    let current: ScheduleItem | null = null;
    let next: ScheduleItem | null = null;
    let timeLeft = { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };
    let timeUntilNext = { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };
    let isFinished = false;
    let isBreak = false;

    for (let i = 0; i < todaySchedule.length; i++) {
      const lesson = todaySchedule[i];
      const startTimeInSeconds = timeToSeconds(lesson.start_time);
      const endTimeInSeconds = timeToSeconds(lesson.end_time);

      if (currentTimeInSeconds >= startTimeInSeconds && currentTimeInSeconds <= endTimeInSeconds) {
        // Текущий урок
        current = lesson;
        const secondsLeft = endTimeInSeconds - currentTimeInSeconds;
        timeLeft = secondsToTime(Math.max(0, secondsLeft));
        next = todaySchedule[i + 1] || null;
        break;
      } else if (currentTimeInSeconds < startTimeInSeconds) {
        // Перемена - следующий урок еще не начался
        next = lesson;
        isBreak = true;
        const secondsUntilNext = startTimeInSeconds - currentTimeInSeconds;
        timeUntilNext = secondsToTime(Math.max(0, secondsUntilNext));
        break;
      }
    }

    // Если прошли все уроки
    if (!current && !next) {
      isFinished = true;
    }

    setCurrentLesson({ 
      current, 
      next, 
      timeLeft, 
      isFinished, 
      isBreak, 
      timeUntilNext 
    });
  };

  // Запускаем таймер обновления каждую секунду
  useEffect(() => {
    if (schedule.length > 0) {
      updateCurrentLesson();
      
      intervalRef.current = setInterval(() => {
        // Обновляем локальное время
        setServerTime(prev => prev + 1000);
        updateCurrentLesson();
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [schedule, serverTime]);

  // Отправляем обновления в Firebase для синхронизации между устройствами
  useEffect(() => {
    if (currentLesson.current || currentLesson.isBreak) {
      const lessonStatusRef = ref(db, `lesson_status/${classId}`);
      set(lessonStatusRef, {
        current: currentLesson.current,
        next: currentLesson.next,
        timeLeft: currentLesson.timeLeft,
        isFinished: currentLesson.isFinished,
        isBreak: currentLesson.isBreak,
        timeUntilNext: currentLesson.timeUntilNext,
        lastUpdate: serverTimestamp()
      }).catch(console.error);
    }
  }, [classId, currentLesson, serverTime]);

  // Подписываемся на обновления статуса урока от других устройств
  useEffect(() => {
    const lessonStatusRef = ref(db, `lesson_status/${classId}`);
    
    const unsubscribe = onValue(lessonStatusRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.lastUpdate) {
        // Проверяем, не слишком ли старые данные (больше 2 минут)
        const timeDiff = Date.now() - data.lastUpdate;
        if (timeDiff < 120000) { // 2 минуты
          setCurrentLesson({
            current: data.current,
            next: data.next,
            timeLeft: data.timeLeft || { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 },
            isFinished: data.isFinished || false,
            isBreak: data.isBreak || false,
            timeUntilNext: data.timeUntilNext || { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 }
          });
        }
      }
    });

    return () => unsubscribe();
  }, [classId]);

  return currentLesson;
}