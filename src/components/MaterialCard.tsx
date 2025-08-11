import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Image, Download, ExternalLink, Edit, Trash2 } from 'lucide-react';
import type { Material } from '../lib/supabase';

interface MaterialCardProps {
  material: Material;
  onEdit?: () => void;
  onDelete?: () => void;
  isAdmin?: boolean;
  index: number;
}

export default function MaterialCard({ material, onEdit, onDelete, isAdmin = false, index }: MaterialCardProps) {
  const getContentIcon = () => {
    switch (material.content_type) {
      case 'text':
        return <FileText className="w-5 h-5" />;
      case 'image':
        return <Image className="w-5 h-5" />;
      case 'file':
        return <Download className="w-5 h-5" />;
      case 'link':
        return <ExternalLink className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getTypeColor = () => {
    return material.type === 'SOR' 
      ? 'bg-gradient-to-r from-green-400 to-green-600' 
      : 'bg-gradient-to-r from-purple-400 to-purple-600';
  };

  const handleContentClick = () => {
    if (material.content_type === 'link') {
      window.open(material.content_value, '_blank');
    } else if (material.content_type === 'file') {
      window.open(material.content_value, '_blank');
    }
  };

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
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden"
    >
      {/* Header */}
      <div className={`${getTypeColor()} p-4 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 p-2 rounded-lg">
              {getContentIcon()}
            </div>
            <div>
              <h3 className="text-lg font-bold">{material.title}</h3>
              <p className="text-sm opacity-90">{material.type}</p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center space-x-2">
              <button
                onClick={onEdit}
                className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={onDelete}
                className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {material.content_type === 'text' && (
          <p className="text-gray-700 leading-relaxed">{material.content_value}</p>
        )}
        
        {material.content_type === 'image' && (
          <div className="text-center">
            <img
              src={material.content_value}
              alt={material.title}
              className="max-w-full h-auto rounded-lg shadow-md"
            />
          </div>
        )}
        
        {(material.content_type === 'file' || material.content_type === 'link') && (
          <div className="text-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleContentClick}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {getContentIcon()}
              <span>
                {material.content_type === 'file' ? 'Скачать файл' : 'Перейти по ссылке'}
              </span>
            </motion.button>
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Создано: {formatDate(material.created_at)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}