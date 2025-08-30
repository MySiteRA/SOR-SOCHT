import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Calendar, BookOpen, ExternalLink, Image, Download } from 'lucide-react';
import type { Material } from '../lib/supabase';

interface MaterialCardProps {
  material: Material;
  index: number;
  onClick?: () => void;
}

export default function MaterialCard({ material, index, onClick }: MaterialCardProps) {
  // Парсим JSON контент для определения типов содержимого
  const getContentTypes = () => {
    try {
      const content = Array.isArray(material.content_value) 
        ? material.content_value 
        : JSON.parse(material.content_value as string) as Array<{type: string, value: string}>;
      const types = [...new Set(content.map(item => item.type))];
      return types;
    } catch {
      return [];
    }
  };

  const contentTypes = getContentTypes();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-100 p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3 flex-1">
          <div className={`p-2 rounded-lg ${
            material.type === 'SOR' ? 'bg-green-100' : 'bg-purple-100'
          }`}>
            <FileText className={`w-5 h-5 ${
              material.type === 'SOR' ? 'text-green-600' : 'text-purple-600'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
              {material.title}
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
              <BookOpen className="w-4 h-4" />
              <span>{material.subject?.name}</span>
            </div>
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(material.created_at)}</span>
            </div>
            {/* Показываем типы контента */}
            {contentTypes.length > 0 && (
              <div className="flex items-center space-x-2 mt-2">
                {contentTypes.includes('text') && (
                  <div className="flex items-center space-x-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    <FileText className="w-3 h-3" />
                    <span>Текст</span>
                  </div>
                )}
                {contentTypes.includes('link') && (
                  <div className="flex items-center space-x-1 text-xs text-gray-500 bg-blue-100 px-2 py-1 rounded">
                    <ExternalLink className="w-3 h-3" />
                    <span>Ссылки</span>
                  </div>
                )}
                {contentTypes.includes('image') && (
                  <div className="flex items-center space-x-1 text-xs text-gray-500 bg-green-100 px-2 py-1 rounded">
                    <Image className="w-3 h-3" />
                    <span>Фото</span>
                  </div>
                )}
                {contentTypes.includes('file') && (
                  <div className="flex items-center space-x-1 text-xs text-gray-500 bg-orange-100 px-2 py-1 rounded">
                    <Download className="w-3 h-3" />
                    <span>Файлы</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          material.type === 'SOR' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-purple-100 text-purple-800'
        }`}>
          {material.type}
        </span>
      </div>
    </motion.div>
  );
}