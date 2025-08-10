import React from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import type { Student } from '../lib/supabase';

interface StudentCardProps {
  student: Student;
  onClick: () => void;
  index: number;
}

export default function StudentCard({ student, onClick, index }: StudentCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-100 p-4"
    >
      <div className="flex items-center space-x-3">
        <div className="bg-blue-100 p-2 rounded-lg">
          <User className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900">{student.name}</h3>
          <p className="text-sm text-gray-500">
            {student.password_hash ? 'Пароль установлен' : 'Требуется ключ'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}