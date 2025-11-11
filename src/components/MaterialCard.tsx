import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Calendar, BookOpen, ExternalLink, Image, Download } from 'lucide-react';
import type { Subject } from '../lib/supabase';

// Интерфейс для метаданных материала
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

interface MaterialCardProps {
  material: MaterialMetadata;
  index: number;
  onClick?: () => void;
}

export default function MaterialCard({ material, index, onClick }: MaterialCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const issor = material.type === 'SOR';
  const bgColor = issor ? 'from-emerald-50 to-teal-50' : 'from-blue-50 to-cyan-50';
  const iconBg = issor ? 'bg-emerald-100' : 'bg-blue-100';
  const iconColor = issor ? 'text-emerald-600' : 'text-blue-600';
  const badgeBg = issor ? 'bg-emerald-100' : 'bg-blue-100';
  const badgeText = issor ? 'text-emerald-700' : 'text-blue-700';
  const accentGradient = issor ? 'from-emerald-500 to-teal-500' : 'from-blue-500 to-cyan-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`group cursor-pointer relative overflow-hidden rounded-xl bg-gradient-to-br ${bgColor} border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 p-6 backdrop-blur-sm`}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-3 bg-white transition-opacity duration-300" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <motion.div
            className={`${iconBg} p-3 rounded-xl shadow-md group-hover:shadow-lg transition-all duration-300`}
            whileHover={{ rotate: 10, scale: 1.1 }}
          >
            <FileText className={`w-6 h-6 ${iconColor}`} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`${badgeBg} ${badgeText} px-3 py-1 text-xs font-semibold rounded-full`}
          >
            {material.type}
          </motion.div>
        </div>

        <div className="flex-1 min-w-0 mb-4">
          <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-gray-800 transition-colors">
            {material.title}
          </h3>

          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2 text-gray-700">
              <BookOpen className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{material.subject?.name}</span>
            </div>

            <div className="flex items-center space-x-2 text-gray-600">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>{formatDate(material.created_at)}</span>
            </div>
          </div>
        </div>

        <motion.div
          className={`flex items-center justify-between pt-4 border-t border-gray-200 border-opacity-50`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 + 0.1 }}
        >
          <div className="text-xs text-gray-600 font-medium">
            Нажмите для просмотра
          </div>
          <motion.div
            className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${accentGradient}`}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}