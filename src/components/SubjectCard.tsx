import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Calculator, Zap, FlaskRound as Flask, Leaf, Clock, Globe, Type, Languages, Monitor, ArrowRight } from 'lucide-react';
import type { Subject } from '../lib/supabase';

interface SubjectCardProps {
  subject: Subject;
  onClick: () => void;
  index: number;
}

export default function SubjectCard({ subject, onClick, index }: SubjectCardProps) {
  const getSubjectColors = () => {
    const colors: { [key: string]: { bg: string; icon: string; gradient: string; border: string } } = {
      'Math': { bg: 'from-blue-50 to-blue-100', icon: 'text-blue-700', gradient: 'from-blue-500 to-blue-600', border: 'border-blue-200' },
      'Physics': { bg: 'from-amber-50 to-amber-100', icon: 'text-amber-700', gradient: 'from-amber-500 to-amber-600', border: 'border-amber-200' },
      'Chemistry': { bg: 'from-green-50 to-green-100', icon: 'text-green-700', gradient: 'from-green-500 to-green-600', border: 'border-green-200' },
      'English': { bg: 'from-purple-50 to-purple-100', icon: 'text-purple-700', gradient: 'from-purple-500 to-purple-600', border: 'border-purple-200' },
      'Literature': { bg: 'from-red-50 to-red-100', icon: 'text-red-700', gradient: 'from-red-500 to-red-600', border: 'border-red-200' },
      'History': { bg: 'from-orange-50 to-orange-100', icon: 'text-orange-700', gradient: 'from-orange-500 to-orange-600', border: 'border-orange-200' },
      'Geography': { bg: 'from-cyan-50 to-cyan-100', icon: 'text-cyan-700', gradient: 'from-cyan-500 to-cyan-600', border: 'border-cyan-200' },
      'Biology': { bg: 'from-teal-50 to-teal-100', icon: 'text-teal-700', gradient: 'from-teal-500 to-teal-600', border: 'border-teal-200' },
    };

    const defaultColor = { bg: 'from-slate-50 to-slate-100', icon: 'text-slate-700', gradient: 'from-slate-500 to-slate-600', border: 'border-slate-200' };
    return colors[subject.name] || defaultColor;
  };

  const getIconComponent = () => {
    const icons: { [key: string]: React.ComponentType<any> } = {
      BookOpen,
      Calculator,
      Zap,
      Flask,
      Leaf,
      Clock,
      Globe,
      Type,
      Languages,
      Monitor
    };
    const IconComponent = icons[subject.icon] || BookOpen;
    return IconComponent;
  };

  const colors = getSubjectColors();
  const IconComponent = getIconComponent();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -10, scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`relative group cursor-pointer overflow-hidden rounded-2xl border-2 ${colors.border} bg-gradient-to-br ${colors.bg} shadow-xl hover:shadow-2xl transition-all duration-300`}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-5 bg-white transition-opacity duration-300" />
      <div className="absolute top-0 right-0 w-32 h-32 opacity-0 group-hover:opacity-5 bg-gradient-to-br from-white to-transparent rounded-full -mr-16 -mt-16 transition-opacity duration-300" />

      <div className="relative p-8 h-full flex flex-col justify-between">
        <div className="flex items-start justify-between mb-6">
          <motion.div
            className={`bg-gradient-to-br ${colors.gradient} p-4 rounded-xl shadow-lg group-hover:shadow-2xl transition-all duration-300`}
            whileHover={{ rotate: -5, scale: 1.1 }}
          >
            <IconComponent className="w-7 h-7 text-white" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            whileHover={{ opacity: 1, x: 0 }}
            className={`${colors.icon} opacity-0 group-hover:opacity-100 transition-all duration-300`}
          >
            <ArrowRight className="w-6 h-6" />
          </motion.div>
        </div>

        <div className="flex-1 mb-6">
          <h3 className={`text-2xl font-bold ${colors.icon} mb-2 group-hover:text-opacity-100 transition-colors duration-300`}>
            {subject.name}
          </h3>
          <p className="text-sm text-gray-700 opacity-80 line-clamp-2">
            {subject.description || 'Нажмите для просмотра материалов'}
          </p>
        </div>

        <motion.div
          className={`pt-4 border-t-2 ${colors.border} opacity-50 flex items-center justify-between`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 + 0.1 }}
        >
          <span className={`text-xs font-semibold ${colors.icon} opacity-80`}>
            Перейти
          </span>
          <motion.div
            className={`w-3 h-3 rounded-full bg-gradient-to-r ${colors.gradient} shadow-lg`}
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}