import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { uploadScheduleFile } from '../utils/scheduleHelpers';
import { getClasses } from '../lib/api';

// Функция нормализации имени файла (убирает кириллицу и спецсимволы)
function normalizeFileName(fileName: string): string {
  return fileName
    .normalize("NFD") // убираем диакритику
    .replace(/[\u0400-\u04FF]/g, "") // убираем все кириллические символы
    .replace(/\s+/g, "_") // заменяем пробелы на "_"
    .replace(/[^a-zA-Z0-9._-]/g, ""); // оставляем только латиницу, цифры, "_", "-", "."
}

interface ScheduleUploadTestProps {
  className: string;
  onSuccess?: (result: { publicUrl: string }) => void;
  onError?: (error: string) => void;
}

export default function ScheduleUploadTest({ className, onSuccess, onError }: ScheduleUploadTestProps) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ publicUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(null);

  // Загружаем ID класса по названию
  React.useEffect(() => {
    const loadClassId = async () => {
      try {
        const classes = await getClasses();
        const targetClass = classes.find(c => c.name === className);
        if (targetClass) {
          setClassId(targetClass.id);
        } else {
          setError(`Класс "${className}" не найден`);
        }
      } catch (err) {
        setError('Ошибка загрузки данных класса');
      }
    };
    
    loadClassId();
  }, [className]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !classId) return;

    // Проверяем тип файла
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xls|xlsx)$/i)) {
      const errorMsg = 'Пожалуйста, выберите файл Excel (.xls или .xlsx)';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setResult(null);

      console.log('=== ТЕСТ ЗАГРУЗКИ РАСПИСАНИЯ ===');
      console.log('Класс:', className);
      console.log('Файл:', file.name);
      console.log('Размер:', file.size, 'байт');
      console.log('Нормализованное имя файла:', normalizeFileName(`${className}_${Date.now()}_${file.name}`));

      const publicUrl = await uploadScheduleFile(classId, className, file);
      
      console.log('=== РЕЗУЛЬТАТ ЗАГРУЗКИ ===');
      console.log('Public URL:', publicUrl);
      console.log('=== КОНЕЦ ТЕСТА ===');

      const uploadResult = { publicUrl };
      setResult(uploadResult);
      onSuccess?.(uploadResult);
    } catch (err: any) {
      console.error('=== ОШИБКА ЗАГРУЗКИ ===');
      console.error('Error:', err);
      console.error('Message:', err.message);
      console.error('=== КОНЕЦ ОШИБКИ ===');
      
      const errorMsg = err.message || 'Ошибка загрузки расписания';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setUploading(false);
      // Сбрасываем значение input
      event.target.value = '';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
        <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
        <span>Тест загрузки для класса {className}</span>
      </h3>

      {/* Upload Area */}
      <div className="space-y-4">
        <label className="block">
          <input
            type="file"
            accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all duration-300 cursor-pointer border-2 border-dashed ${
              uploading
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300'
                : 'bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 text-indigo-700 border-indigo-300 hover:border-indigo-400'
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Загрузка...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Выбрать файл Excel</span>
              </>
            )}
          </motion.div>
        </label>

        {/* Results */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 rounded-lg p-4"
          >
            <div className="flex items-center space-x-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-800">Успешно загружено!</span>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-green-800">Public URL:</span>
                <a 
                  href={result.publicUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-2 text-green-600 hover:text-green-800 underline text-xs break-all"
                >
                  {result.publicUrl}
                </a>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4"
          >
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="font-semibold text-red-800">Ошибка загрузки</span>
            </div>
            <p className="text-red-700 text-sm mt-2">{error}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}