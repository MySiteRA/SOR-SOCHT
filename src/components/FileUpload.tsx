import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, File, Image as ImageIcon, Loader2, Check, Plus, Camera, Folder, Smartphone, Monitor } from 'lucide-react';
import { dataURLtoBlob } from '../utils/fileUtils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onUrlAdd: (url: string) => void;
  accept: string;
  type: 'image' | 'file';
  placeholder: string;
  multiple?: boolean;
  hasFiles?: boolean;
}

export default function FileUpload({ 
  onFileSelect, 
  onUrlAdd, 
  accept, 
  type, 
  placeholder,
  multiple = false,
  hasFiles = false
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showSourceOptions, setShowSourceOptions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showUploadArea, setShowUploadArea] = useState(!hasFiles);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Определяем, мобильное ли устройство
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Обновляем видимость области загрузки при изменении hasFiles
  React.useEffect(() => {
    setShowUploadArea(!hasFiles);
  }, [hasFiles]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const createHighQualityDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (file.type.startsWith('image/')) {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              resolve(e.target?.result as string);
              return;
            }
            
            // Сохраняем оригинальные размеры для максимального качества
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            
            // Настройки для максимального качества
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Рисуем изображение в оригинальном размере
            ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
            
            // Экспортируем с максимальным качеством (1.0 = 100%)
            let dataUrl;
            if (file.type === 'image/png') {
              dataUrl = canvas.toDataURL('image/png');
            } else if (file.type === 'image/webp') {
              dataUrl = canvas.toDataURL('image/webp', 1.0);
            } else {
              // Для JPEG используем максимальное качество
              dataUrl = canvas.toDataURL('image/jpeg', 1.0);
            }
            
            resolve(dataUrl);
          };
          img.onerror = () => resolve(e.target?.result as string);
          img.src = e.target?.result as string;
        } else {
          resolve(e.target?.result as string);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const dataURLtoBlob = (dataURL: string): Blob => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || '';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setUploadSuccess(false);
    
    try {
      let processedFile = file;
      
      // Для изображений создаем высококачественную версию
      if (type === 'image' && file.type.startsWith('image/')) {
        const highQualityDataUrl = await createHighQualityDataUrl(file);
        const blob = dataURLtoBlob(highQualityDataUrl);
        processedFile = new window.File([blob], file.name, { type: file.type });
      }
      
      // Симуляция загрузки файла
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onFileSelect(processedFile);
      setUploadSuccess(true);
      
      // Скрываем область загрузки после успешной загрузки
      setTimeout(() => {
        setUploadSuccess(false);
        setShowUploadArea(false);
        setShowSourceOptions(false);
      }, 1000);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onUrlAdd(urlInput.trim());
      setUrlInput('');
      setShowUrlInput(false);
      setShowUploadArea(false);
      setShowSourceOptions(false);
    }
  };

  const handleShowUploadArea = () => {
    setShowUploadArea(true);
    setShowUrlInput(false);
    setShowSourceOptions(false);
  };

  const handleSourceSelect = (source: 'gallery' | 'camera' | 'files') => {
    setShowSourceOptions(false);
    
    if (source === 'camera' && type === 'image') {
      // Открываем камеру (только для изображений)
      cameraInputRef.current?.click();
    } else {
      // Открываем файловый менеджер
      fileInputRef.current?.click();
    }
  };

  const IconComponent = type === 'image' ? ImageIcon : File;

  return (
    <div className="space-y-4">
      {/* Source Selection Modal */}
      <AnimatePresence>
        {showSourceOptions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowSourceOptions(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Выберите источник {type === 'image' ? 'изображения' : 'файла'}
                  </h3>
                  <button
                    onClick={() => setShowSourceOptions(false)}
                    className="p-1 hover:bg-white/70 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Options */}
              <div className="p-6 space-y-3">
                {/* Галерея/Файлы */}
                <motion.button
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSourceSelect('gallery')}
                  className="w-full flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl border border-blue-200 transition-all duration-200"
                >
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                    {isMobile ? (
                      <Smartphone className="w-6 h-6 text-white" />
                    ) : (
                      <Folder className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div className="text-left">
                    <h4 className="font-semibold text-gray-900">
                      {isMobile ? 'Галерея' : 'Файлы'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {isMobile 
                        ? 'Выбрать из галереи устройства' 
                        : 'Выбрать файл с компьютера'
                      }
                    </p>
                  </div>
                </motion.button>

                {/* Камера (только для изображений и мобильных) */}
                {type === 'image' && isMobile && (
                  <motion.button
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSourceSelect('camera')}
                    className="w-full flex items-center space-x-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-xl border border-green-200 transition-all duration-200"
                  >
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-gray-900">Камера</h4>
                      <p className="text-sm text-gray-600">Сделать новое фото</p>
                    </div>
                  </motion.button>
                )}

                {/* Drag & Drop (только для ПК) */}
                {!isMobile && (
                  <motion.button
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setShowSourceOptions(false);
                      setShowUploadArea(true);
                    }}
                    className="w-full flex items-center space-x-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-xl border border-purple-200 transition-all duration-200"
                  >
                    <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-gray-900">Перетащить</h4>
                      <p className="text-sm text-gray-600">Перетащите файл в область</p>
                    </div>
                  </motion.button>
                )}

                {/* URL Input */}
                <motion.button
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowSourceOptions(false);
                    setShowUrlInput(true);
                    setShowUploadArea(true);
                  }}
                  className="w-full flex items-center space-x-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 rounded-xl border border-orange-200 transition-all duration-200"
                >
                  <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-semibold text-gray-900">По ссылке</h4>
                    <p className="text-sm text-gray-600">Добавить URL изображения</p>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Upload Area */}
      <AnimatePresence>
        {showUploadArea && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              multiple={multiple}
              onChange={handleFileInputChange}
              className="hidden"
            />
            
            {/* Camera input (только для изображений) */}
            {type === 'image' && (
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileInputChange}
                className="hidden"
              />
            )}

            {!showUrlInput && (
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 ${
                  dragActive 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="text-center">
                  <motion.div
                    animate={uploading ? { rotate: 360 } : {}}
                    transition={{ duration: 1, repeat: uploading ? Infinity : 0, ease: "linear" }}
                    className={`w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center ${
                      uploadSuccess 
                        ? 'bg-green-100' 
                        : uploading 
                          ? 'bg-indigo-100' 
                          : 'bg-gray-100'
                    }`}
                  >
                    {uploadSuccess ? (
                      <Check className="w-8 h-8 text-green-600" />
                    ) : uploading ? (
                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    ) : (
                      <IconComponent className="w-8 h-8 text-gray-600" />
                    )}
                  </motion.div>
                  
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {uploading 
                      ? 'Загрузка...' 
                      : uploadSuccess 
                        ? 'Успешно загружено!' 
                        : `Загрузить ${type === 'image' ? 'изображение' : 'файл'}`
                    }
                  </h3>
                  
                  <p className="text-gray-600 mb-6">
                    {!isMobile && `Перетащите ${type === 'image' ? 'изображение' : 'файл'} сюда или`}
                  </p>
                  
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowSourceOptions(true)}
                    disabled={uploading}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium shadow-lg hover:shadow-xl"
                  >
                    <div className="flex items-center space-x-2">
                      {isMobile ? (
                        <Smartphone className="w-5 h-5" />
                      ) : (
                        <Monitor className="w-5 h-5" />
                      )}
                      <span>
                        Выбрать {type === 'image' ? 'изображение' : 'файл'}
                      </span>
                    </div>
                  </motion.button>
                  
                  {type === 'image' && (
                    <p className="text-xs text-gray-500 mt-4">
                      Максимальное качество сохраняется автоматически
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* URL Input */}
            <AnimatePresence>
              {showUrlInput && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      Добавить по ссылке
                    </h4>
                    <div className="space-y-4">
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder={placeholder}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={handleUrlSubmit}
                          disabled={!urlInput.trim()}
                          className="flex-1 bg-orange-600 text-white px-4 py-3 rounded-xl hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                          Добавить ссылку
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowUrlInput(false)}
                          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Cancel Button */}
            {!showUrlInput && (
              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadArea(false);
                    setShowSourceOptions(false);
                    setShowUrlInput(false);
                    setUrlInput('');
                  }}
                  className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
                >
                  Отмена
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Button (when no upload area is shown) */}
    </div>
  );
}