import React from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';

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

interface CurrentLessonBannerProps {
  currentLesson: ScheduleItem | null;
  timeLeft: {
    hours: number;
    minutes: number;
    seconds: number;
  };
  isFinished: boolean;
  isBreak: boolean;
  timeUntilNext?: {
    hours: number;
    minutes: number;
    seconds: number;
  };
}

export default function CurrentLessonBanner({
  currentLesson,
  timeLeft,
  isFinished,
  isBreak,
  timeUntilNext,
}: CurrentLessonBannerProps) {
  const formatTime = (time: { hours: number; minutes: number; seconds: number }) => {
    if (time.hours > 0) {
      return `${time.hours}ч ${time.minutes}м`;
    }
    return `${time.minutes}м ${time.seconds}с`;
  };

  if (isFinished) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-6 mb-8"
      >
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-emerald-900">Уроки закончились</h3>
            <p className="text-emerald-700 text-sm">Хорошего дня!</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!currentLesson && isBreak) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 mb-8"
      >
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <h3 className="text-lg font-semibold text-amber-900">Перемена</h3>
          </div>
          <p className="text-amber-700 text-sm">Следующий урок начнется через {formatTime(timeUntilNext || { hours: 0, minutes: 0, seconds: 0 })}</p>
        </div>
      </motion.div>
    );
  }

  if (!currentLesson) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-300 rounded-2xl p-6 mb-8 shadow-lg"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
              <h3 className="text-xl font-bold text-emerald-900">
                Сейчас идет урок: {currentLesson.subject}
              </h3>
            </div>
            <div className="space-y-2 text-emerald-700">
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span>{currentLesson.start_time} - {currentLesson.end_time}</span>
              </div>
              <div className="text-sm">
                <span className="font-semibold">Учитель:</span> {currentLesson.teacher}
              </div>
              <div className="text-sm">
                <span className="font-semibold">Аудитория:</span> {currentLesson.room}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center bg-white/60 backdrop-blur rounded-xl px-6 py-4 flex-shrink-0">
            <div className="text-3xl font-bold text-emerald-600">
              {formatTime(timeLeft)}
            </div>
            <div className="text-xs text-emerald-600 font-medium">осталось</div>
          </div>
        </div>
        <div className="pt-3 border-t border-emerald-200">
          <p className="text-xs text-emerald-600 font-medium">Для просмотра материалов нажмите на предмет ниже</p>
        </div>
      </div>
    </motion.div>
  );
}
