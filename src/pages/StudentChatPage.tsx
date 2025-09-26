import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MoreVertical, LogOut, Trash2, User as UserIcon, Calendar, MessageCircle, Gamepad2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import ClassChat from '../components/ClassChat';
import { checkStudentKeyValidity } from '../lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import type { Student } from '../lib/supabase';

export default function StudentChatPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<{student: Student, className: string} | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('studentDashboardData');
    if (saved) {
      const data = JSON.parse(saved);
      setStudentData(data);
      
      // Проверяем валидность ключа студента
      validateStudentKey(data.student.id);
    } else {
      navigate('/', { replace: true });
    }
  }, []);

  const validateStudentKey = async (studentId: string) => {
    try {
      const isValid = await checkStudentKeyValidity(studentId);
      
      if (!isValid) {
        // Ключ больше не валиден, принудительно разлогиниваем
        localStorage.removeItem('studentDashboardData');
        localStorage.removeItem('studentId');
        localStorage.removeItem('createdAt');
        localStorage.setItem('skipAutoLogin', 'true');
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error('Error validating student key:', error);
      // В случае ошибки проверки, не разлогиниваем
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('studentDashboardData');
    navigate('/', { replace: true });
  };

  const handleForgetSession = () => {
    localStorage.removeItem('studentId');
    localStorage.removeItem('createdAt');
    localStorage.removeItem('studentDashboardData');
    localStorage.setItem('skipAutoLogin', 'true');
    navigate('/', { replace: true });
  };

  const handleProfileClick = () => {
    navigate('/student-profile');
  };

  const handleScheduleClick = () => {
    navigate('/student-schedule');
  };

  const handleGamesClick = () => {
    navigate('/student-games');
  };

  if (!studentData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/student-dashboard')}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>{t('common.back')}</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                  <MessageCircle className="w-6 h-6 text-indigo-600" />
                  <span>Чат класса</span>
                </h1>
                <p className="text-gray-600">{studentData.className}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Session Indicator */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-3 h-3 bg-green-500 rounded-full shadow-lg animate-pulse"
                title="Активный сеанс"
              />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center justify-center w-10 h-10 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-600" />
                  </motion.button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent align="end" className="w-48 mt-2" asChild>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    <div>
                      <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer">
                        <UserIcon className="w-4 h-4 mr-3 text-indigo-500" />
                        <span className="text-gray-700">Профиль</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem onClick={handleScheduleClick} className="cursor-pointer">
                        <Calendar className="w-4 h-4 mr-3 text-blue-500" />
                        <span className="text-gray-700">Расписание</span>
                      </DropdownMenuItem>
                      
                     <DropdownMenuItem onClick={handleGamesClick} className="cursor-pointer">
                       <Gamepad2 className="w-4 h-4 mr-3 text-purple-500" />
                       <span className="text-gray-700">Игры с классом</span>
                     </DropdownMenuItem>
                     
                      <DropdownMenuItem onClick={handleForgetSession} className="cursor-pointer">
                        <Trash2 className="w-4 h-4 mr-3 text-orange-500" />
                        <span className="text-gray-700">Забыть сеанс (полный выход)</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                        <LogOut className="w-4 h-4 mr-3 text-red-500" />
                        <span className="text-gray-700">Выйти (сеанс сохранится)</span>
                      </DropdownMenuItem>
                    </div>
                  </motion.div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 mx-4 mt-4 rounded-lg"
        >
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Chat Component */}
      <div className="flex-1 overflow-hidden">
        {studentData && (
          <ClassChat
            classId={studentData.student.class_id}
            user={studentData.student.name}
            userId={studentData.student.id}
            className={studentData.className}
          />
        )}
      </div>
    </div>
  );
}