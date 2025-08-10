import React from 'react';
import { motion } from 'framer-motion';
import type { Class } from '../lib/supabase';

interface ClassCardProps {
  classItem: Class;
  onClick: () => void;
  index: number;
}

export default function ClassCard({ classItem, onClick, index }: ClassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-100 p-6"
    >
      <div className="flex items-center justify-center h-20">
        <h3 className="text-2xl font-bold text-gray-800">{classItem.name}</h3>
      </div>
    </motion.div>
  );
}