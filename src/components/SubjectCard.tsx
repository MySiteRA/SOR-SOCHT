import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import type { Subject } from '../lib/supabase';

interface SubjectCardProps {
  subject: Subject;
  onClick: () => void;
  index: number;
}

export default function SubjectCard({ subject, onClick, index }: SubjectCardProps) {
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
        <div className="bg-indigo-100 p-2 rounded-lg">
          <BookOpen className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900">{subject.name}</h3>
        </div>
      </div>
    </motion.div>
  );
}