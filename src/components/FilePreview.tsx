import React from 'react';
import { motion } from 'framer-motion';
import { X, File, ExternalLink, Eye } from 'lucide-react';

interface FileItem {
  id: string;
  type: 'file' | 'image';
  name: string;
  url: string;
  isLocal?: boolean;
}

interface FilePreviewProps {
  files: FileItem[];
  onRemove: (id: string) => void;
  onPreview?: (file: FileItem) => void;
}

export default function FilePreview({ files, onRemove, onPreview }: FilePreviewProps) {
  if (files.length === 0) return null;

  const formatFileSize = (file: File) => {
    const bytes = file.size;
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-700">Добавленные файлы:</h4>
      <div className="space-y-2">
        {files.map((file, index) => (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                file.type === 'image' ? 'bg-green-100' : 'bg-blue-100'
              }`}>
                {file.type === 'image' ? (
                  <div className="w-6 h-6 bg-green-600 rounded-sm flex items-center justify-center">
                    <span className="text-white text-xs font-bold">IMG</span>
                  </div>
                ) : (
                  <File className="w-4 h-4 text-blue-600" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {file.isLocal ? 'Локальный файл' : 'Внешняя ссылка'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {onPreview && (
                <button
                  type="button"
                  onClick={() => onPreview(file)}
                  className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                  title="Предпросмотр"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}
              
              {!file.isLocal && (
                <button
                  type="button"
                  onClick={() => window.open(file.url, '_blank')}
                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Открыть ссылку"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}
              
              <button
                type="button"
                onClick={() => onRemove(file.id)}
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Удалить"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}