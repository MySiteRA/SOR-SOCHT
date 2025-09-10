import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, ExternalLink, Image, Download, Calendar, BookOpen } from 'lucide-react';
import type { Material } from '../lib/supabase';

interface MaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: Material;
}

export default function MaterialModal({ isOpen, onClose, material }: MaterialModalProps) {
  const [activeTab, setActiveTab] = useState<string>('');

  // Парсим JSON контент
  const contentItems = useMemo(() => {
    try {
      const parsed = Array.isArray(material.content_value)
        ? material.content_value
        : JSON.parse(material.content_value as string) as Array<{type: string, value: string}>;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [material.content_value]);

  // Группируем контент по типам
  const groupedContent = useMemo(() => {
    const groups: Record<string, Array<{type: string, value: string}>> = {};
    contentItems.forEach(item => {
      if (!groups[item.type]) {
        groups[item.type] = [];
      }
      groups[item.type].push(item);
    });
    return groups;
  }, [contentItems]);

  // Доступные вкладки
  const availableTabs = useMemo(() => {
    const tabs = [];
    if (groupedContent.text?.length) tabs.push({ key: 'text', label: 'Текст', icon: FileText });
    if (groupedContent.link?.length) tabs.push({ key: 'link', label: 'Ссылки', icon: ExternalLink });
    if (groupedContent.image?.length) tabs.push({ key: 'image', label: 'Фото', icon: Image });
    if (groupedContent.file?.length) tabs.push({ key: 'file', label: 'Файлы', icon: Download });
    return tabs;
  }, [groupedContent]);

  // Устанавливаем активную вкладку при открытии
  React.useEffect(() => {
    if (isOpen && availableTabs.length > 0 && !activeTab) {
      setActiveTab(availableTabs[0].key);
    }
  }, [isOpen, availableTabs, activeTab]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownload = (url: string, filename?: string) => {
    const link = document.createElement('a');
    link.href = url;
    if (filename) {
      link.download = filename;
    }
    link.target = '_blank';
    link.click();
  };


  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-100"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-gray-900 mb-2 truncate">
                  {material.title}
                </h2>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <BookOpen className="w-4 h-4" />
                    <span>{material.subject?.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(material.created_at)}</span>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    material.type === 'SOR' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {material.type}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/70 rounded-xl transition-colors ml-4"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          {availableTabs.length > 0 && (
            <div className="border-b border-gray-100">
              <div className="flex overflow-x-auto">
                {availableTabs.map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                        activeTab === tab.key
                          ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                          : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                      <span>{tab.label}</span>
                      <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                        {groupedContent[tab.key]?.length || 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {availableTabs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-600 mb-2">Нет содержимого</h3>
                <p className="text-gray-500">Этот материал не содержит данных</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {/* Текст */}
                {activeTab === 'text' && groupedContent.text && (
                  <motion.div
                    key="text"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {groupedContent.text.map((item, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div 
                          className="text-gray-800 font-sans leading-relaxed"
                          style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}
                        >
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* Ссылки */}
                {activeTab === 'link' && groupedContent.link && (
                  <motion.div
                    key="link"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    {groupedContent.link.map((item, index) => (
                      <motion.button
                        key={index}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => window.open(item.value, '_blank')}
                        className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <ExternalLink className="w-5 h-5 text-blue-600" />
                          <span className="text-blue-800 font-medium truncate">
                            {item.value.length > 50 ? `${item.value.substring(0, 50)}...` : item.value}
                          </span>
                        </div>
                        <span className="text-blue-600 text-sm font-medium">Открыть</span>
                      </motion.button>
                    ))}
                  </motion.div>
                )}

                {/* Фото */}
                {activeTab === 'image' && groupedContent.image && (
                  <motion.div
                    key="image"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    {groupedContent.image.map((item, index) => (
                      <ZoomableImage
                        key={index}
                        src={item.value}
                        alt={`Изображение ${index + 1}`}
                        index={index}
                      />
                    ))}
                  </motion.div>
                )}

                {/* Файлы */}
                {activeTab === 'file' && groupedContent.file && (
                  <motion.div
                    key="file"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    {groupedContent.file.map((item, index) => {
                      const fileName = item.value.split('/').pop() || `Файл ${index + 1}`;
                      return (
                        <motion.button
                          key={index}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleDownload(item.value, fileName)}
                          className="w-full flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <Download className="w-5 h-5 text-green-600" />
                            <span className="text-green-800 font-medium truncate">
                              {fileName}
                            </span>
                          </div>
                          <span className="text-green-600 text-sm font-medium">Скачать</span>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </motion.div>

    </AnimatePresence>
  );
}

// Компонент для масштабируемого изображения
interface ZoomableImageProps {
  src: string;
  alt: string;
  index: number;
}

function ZoomableImage({ src, alt, index }: ZoomableImageProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = React.useRef<HTMLImageElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Сброс масштаба и позиции
  const resetTransform = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Получение расстояния между двумя точками касания
  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  // Получение центра между двумя точками касания
  const getTouchCenter = (touches: TouchList) => {
    if (touches.length < 2) return { x: 0, y: 0 };
    const touch1 = touches[0];
    const touch2 = touches[1];
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  // Ограничение позиции изображения в пределах контейнера
  const constrainPosition = (newPosition: { x: number; y: number }, newScale: number) => {
    if (!imageRef.current || !containerRef.current) return newPosition;

    const container = containerRef.current.getBoundingClientRect();
    const image = imageRef.current.getBoundingClientRect();
    
    const scaledWidth = image.width * newScale;
    const scaledHeight = image.height * newScale;
    
    const maxX = Math.max(0, (scaledWidth - container.width) / 2);
    const maxY = Math.max(0, (scaledHeight - container.height) / 2);
    
    return {
      x: Math.max(-maxX, Math.min(maxX, newPosition.x)),
      y: Math.max(-maxY, Math.min(maxY, newPosition.y))
    };
  };

  // Обработка начала касания
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 2) {
      // Начало жеста pinch-to-zoom
      const distance = getTouchDistance(e.touches);
      setLastTouchDistance(distance);
    } else if (e.touches.length === 1 && scale > 1) {
      // Начало перетаскивания (только если изображение увеличено)
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y
      });
    }
  };

  // Обработка движения касания
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 2) {
      // Обработка pinch-to-zoom
      const distance = getTouchDistance(e.touches);
      if (lastTouchDistance > 0) {
        const scaleChange = distance / lastTouchDistance;
        const newScale = Math.max(1, Math.min(4, scale * scaleChange));
        
        // Масштабирование относительно центра жеста
        const center = getTouchCenter(e.touches);
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
          const centerX = center.x - containerRect.left - containerRect.width / 2;
          const centerY = center.y - containerRect.top - containerRect.height / 2;
          
          const scaleRatio = newScale / scale;
          const newPosition = {
            x: position.x * scaleRatio + centerX * (1 - scaleRatio),
            y: position.y * scaleRatio + centerY * (1 - scaleRatio)
          };
          
          setScale(newScale);
          setPosition(constrainPosition(newPosition, newScale));
        }
      }
      setLastTouchDistance(distance);
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      // Обработка перетаскивания
      const touch = e.touches[0];
      const newPosition = {
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      };
      setPosition(constrainPosition(newPosition, scale));
    }
  };

  // Обработка окончания касания
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 0) {
      setIsDragging(false);
      setLastTouchDistance(0);
    } else if (e.touches.length === 1) {
      setLastTouchDistance(0);
    }
  };

  // Обработка двойного касания для сброса масштаба
  const handleDoubleClick = () => {
    if (scale > 1) {
      resetTransform();
    } else {
      setScale(2);
      setPosition({ x: 0, y: 0 });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-gray-50 rounded-lg overflow-hidden"
    >
      <div
        ref={containerRef}
        className="relative w-full h-auto max-h-[600px] overflow-hidden rounded-lg touch-none select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
        style={{ cursor: scale > 1 ? 'grab' : 'zoom-in' }}
      >
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          className="w-full max-h-[600px] object-contain transition-transform duration-200 ease-out"
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            imageRendering: 'high-quality',
            transformOrigin: 'center center',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            pointerEvents: 'none'
          }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `
                <div class="flex items-center justify-center h-32 bg-gray-100 rounded-lg">
                  <span class="text-gray-500">Не удалось загрузить изображение</span>
                </div>
              `;
            }
          }}
          onLoad={() => {
            // Сброс трансформации при загрузке нового изображения
            resetTransform();
          }}
        />
        
        {/* Индикатор масштаба */}
        {scale > 1 && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs font-medium">
            {Math.round(scale * 100)}%
          </div>
        )}
      </div>
      
      <div className="p-3 text-center">
        <p className="text-xs text-gray-500">
          {scale > 1 
            ? 'Двойное касание для сброса • Перетаскивание для перемещения'
            : 'Двойное касание или жест двумя пальцами для увеличения'
          }
        </p>
      </div>
    </motion.div>
  );
}