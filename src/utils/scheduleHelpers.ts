import { supabase } from '../lib/supabase';

// Интерфейс для записи расписания
export interface ScheduleRecord {
  id: string;
  class_id: string;
  file_name: string;
  public_url: string;
  created_at: string;
}

/**
 * Нормализация имени класса (транслитерация кириллицы)
 */
function normalizeClassName(className: string): string {
  const translitMap: Record<string, string> = {
    // Русские буквы
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'E', 'Ж': 'Zh',
    'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O',
    'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts',
    'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    // Узбекские буквы
    'Ў': 'U', 'Қ': 'Q', 'Ғ': 'G', 'Ҳ': 'H', 'ў': 'u', 'қ': 'q', 'ғ': 'g', 'ҳ': 'h'
  };
  
  return className
    .split('')
    .map(char => translitMap[char] || char)
    .join('')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Интерфейс для записи расписания
export interface ScheduleRecord {
  id: string;
  class_id: string;
  file_name: string;
  public_url: string;
  created_at: string;
}

/**
 * Нормализация имени файла (убирает кириллицу и спецсимволы)
 */
function normalizeFileName(fileName: string): string {
  return fileName
    .normalize("NFD") // убираем диакритику
    .replace(/[\u0400-\u04FF]/g, "") // убираем все кириллические символы
    .replace(/\s+/g, "_") // заменяем пробелы на "_"
    .replace(/[^a-zA-Z0-9._-]/g, ""); // оставляем только латиницу, цифры, "_", "-", "."
}

/**
 * Нормализация входных данных в File объект
 */
function normalizeToFile(input: File | Blob | string, originalName: string): File {
  if (input instanceof File) {
    return input;
  }
  
  if (input instanceof Blob) {
    return new File([input], originalName, { type: input.type });
  }
  
  // Если это data URL или base64
  if (typeof input === 'string' && input.startsWith('data:')) {
    const [header, base64Data] = input.split(',');
    const mimeType = header.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
    
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    
    return new File([blob], originalName, { type: mimeType });
  }
  
  throw new Error('Unsupported file input type');
}

/**
 * Загрузка файла расписания в Supabase Storage
 */
export async function uploadScheduleFile(
  classId: string, 
  className: string, 
  fileInput: File | Blob | string
): Promise<string> {
  try {
    console.log('=== НАЧАЛО ЗАГРУЗКИ РАСПИСАНИЯ ===');
    console.log('Class ID:', classId);
    console.log('Class Name:', className);
    console.log('File Input Type:', typeof fileInput);
    
    // Определяем имя файла
    let originalName = 'schedule.xlsx';
    if (fileInput instanceof File) {
      originalName = fileInput.name;
    }
    
    // Нормализуем входные данные в File объект
    const file = normalizeToFile(fileInput, originalName);
    console.log('Normalized file:', file.name, file.size, 'bytes');
    
    // Создаем простой ключ файла только на основе времени
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'xlsx';
    const key = `schedule_${timestamp}.${extension}`;
    
    console.log('File key:', key);
    
    // Проверяем, существует ли файл с таким именем
    const { data: existingFile } = await supabase.storage
      .from('schedules')
      .list('', { search: key });
    
    let finalKey = key;
    
    if (existingFile && existingFile.length > 0) {
      // Файл существует, создаем уникальное имя
      const randSuffix = Math.random().toString(36).substring(2, 8);
      finalKey = `schedule_${timestamp}_${randSuffix}.${extension}`;
      console.log('File exists, using random key:', finalKey);
    }
    
    // Загружаем файл
    console.log('Uploading file with key:', finalKey);
    const { error: uploadError } = await supabase.storage
      .from('schedules')
      .upload(finalKey, file, { upsert: false });
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      
      if (uploadError.message?.includes('already exists')) {
        // Файл уже существует, пробуем с случайным суффиксом
        const randKey = `schedule_${timestamp}_${Math.random().toString(36).substring(2, 8)}.${extension}`;
        console.log('Retrying with random key:', randKey);
        
        const { error: uploadError2 } = await supabase.storage
          .from('schedules')
          .upload(randKey, file, { upsert: false });
        
        if (uploadError2) {
          throw uploadError2;
        } else {
          finalKey = randKey;
        }
      } else {
        throw uploadError;
      }
    }
    
    // Получаем публичную ссылку
    const { data } = supabase.storage.from('schedules').getPublicUrl(finalKey);
    const publicUrl = data?.publicUrl || null;
    
    console.log('Generated public URL:', publicUrl);
    
    // Сохраняем запись в таблицу schedules
    const insertRes = await supabase.from('schedules').insert([{
      class_id: classId,
      file_name: finalKey,
      public_url: publicUrl,
      created_at: new Date().toISOString()
    }]);
    
    if (insertRes.error) {
      console.warn('Warning: could not insert schedule record:', insertRes.error);
      // Не критично — всё равно возвращаем publicUrl
    } else {
      console.log('Schedule record saved successfully');
    }
    
    console.log('=== ЗАГРУЗКА ЗАВЕРШЕНА УСПЕШНО ===');
    return publicUrl;
  } catch (err) {
    console.error('uploadScheduleFile error:', err);
    throw err;
  }
}

/**
 * Получение последнего расписания для класса
 */
export async function getLatestScheduleForClass(classId: string): Promise<ScheduleRecord | null> {
  try {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error loading schedule record:', error);
      return null;
    }
    
    return data && data.length ? data[0] : null;
  } catch (err) {
    console.error('Error in getLatestScheduleForClass:', err);
    return null;
  }
}

/**
 * Получение всех расписаний для класса
 */
export async function getSchedulesForClass(classId: string): Promise<ScheduleRecord[]> {
  try {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading schedules:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Error in getSchedulesForClass:', err);
    return [];
  }
}

/**
 * Удаление файла расписания
 */
export async function deleteScheduleFile(scheduleId: string): Promise<void> {
  try {
    // Получаем информацию о файле
    const { data: scheduleData, error: fetchError } = await supabase
      .from('schedules')
      .select('*')
      .eq('id', scheduleId)
      .single();

    if (fetchError) throw fetchError;

    // Удаляем файл из Storage
    const { error: storageError } = await supabase.storage
      .from('schedules')
      .remove([scheduleData.file_name]);

    if (storageError) {
      console.warn('Warning: could not delete file from storage:', storageError);
    }

    // Удаляем запись из таблицы
    const { error: dbError } = await supabase
      .from('schedules')
      .delete()
      .eq('id', scheduleId);

    if (dbError) throw dbError;

    console.log('Schedule file deleted successfully');
  } catch (err) {
    console.error('Error deleting schedule file:', err);
    throw err;
  }
}