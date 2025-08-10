import { supabase } from './supabase';
import bcrypt from 'bcryptjs';
import type { Class, Student, Key, Subject, FileRecord, Download } from './supabase';

// Получение всех классов
export async function getClasses(): Promise<Class[]> {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data || [];
}

// Получение учеников класса
export async function getStudentsByClass(classId: string): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('class_id', classId)
    .order('name');
  
  if (error) throw error;
  return data || [];
}

// Получение данных ученика
export async function getStudent(studentId: string): Promise<Student | null> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

// Проверка ключа
export async function validateKey(keyValue: string): Promise<{ valid: boolean; student: Student | null }> {
  const { data: keyData, error: keyError } = await supabase
    .from('keys')
    .select('*, students(*)')
    .eq('key_value', keyValue)
    .eq('status', 'active')
    .single();

  if (keyError || !keyData) {
    return { valid: false, student: null };
  }

  // Проверка срока действия
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    return { valid: false, student: null };
  }

  return { 
    valid: true, 
    student: Array.isArray(keyData.students) ? keyData.students[0] : keyData.students 
  };
}

// Проверка пароля
export async function validatePassword(studentId: string, password: string): Promise<{ valid: boolean; student: Student | null }> {
  const { data: student, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .single();

  if (error || !student || !student.password_hash) {
    return { valid: false, student: null };
  }

  const isValid = await bcrypt.compare(password, student.password_hash);
  return { valid: isValid, student: isValid ? student : null };
}

// Создание пароля
export async function createPassword(studentId: string, password: string): Promise<void> {
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const { error } = await supabase
    .from('students')
    .update({ password_hash: hashedPassword })
    .eq('id', studentId);
  
  if (error) throw error;

  // Логирование
  await logAction('PASSWORD_CREATED', `Password created for student ${studentId}`);
}

// Генерация ключа
export async function generateKey(studentId: string, expiresAt?: string): Promise<string> {
  const keyValue = Math.random().toString(36).substring(2) + Date.now().toString(36);
  
  const { error } = await supabase
    .from('keys')
    .insert({
      student_id: studentId,
      key_value: keyValue,
      status: 'active',
      expires_at: expiresAt || null
    });
  
  if (error) throw error;

  // Логирование
  await logAction('KEY_GENERATED', `Key generated for student ${studentId}`);
  
  return keyValue;
}

// Аннулирование ключа
export async function revokeKey(keyId: string): Promise<void> {
  const { error } = await supabase
    .from('keys')
    .update({ 
      status: 'revoked',
      revoked_at: new Date().toISOString()
    })
    .eq('id', keyId);
  
  if (error) throw error;

  // Логирование
  await logAction('KEY_REVOKED', `Key ${keyId} revoked`);
}

// Получение ключей ученика
export async function getStudentKeys(studentId: string): Promise<Key[]> {
  const { data, error } = await supabase
    .from('keys')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// Обновление URL ученика
export async function updateStudentUrl(studentId: string, url: string): Promise<void> {
  const { error } = await supabase
    .from('students')
    .update({ url })
    .eq('id', studentId);
  
  if (error) throw error;

  // Логирование
  await logAction('URL_UPDATED', `URL updated for student ${studentId} to ${url}`);
}

// Изменение срока действия ключа
export async function updateKeyExpiration(keyId: string, expiresAt: string | null): Promise<void> {
  const { error } = await supabase
    .from('keys')
    .update({ expires_at: expiresAt })
    .eq('id', keyId);
  
  if (error) throw error;

  // Логирование
  await logAction('KEY_EXPIRATION_UPDATED', `Key ${keyId} expiration updated`);
}

// Логирование действий
export async function logAction(action: string, details: string): Promise<void> {
  await supabase
    .from('logs')
    .insert({
      action,
      details
    });
}

// Проверка админских учетных данных
export function validateAdminCredentials(username: string, password: string): boolean {
  return username === 'admin' && password === 'frost2008791533';
}

// Получение предметов класса
export async function getSubjectsByClass(classId: string): Promise<Subject[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('class_id', classId)
    .order('name');
  
  if (error) throw error;
  return data || [];
}

// Получение файлов по классу и категории
export async function getFilesByClassAndCategory(classId: string, category: 'SOR' | 'SOCH'): Promise<FileRecord[]> {
  const { data, error } = await supabase
    .from('files')
    .select(`
      *,
      subject:subjects(*)
    `)
    .eq('class_id', classId)
    .eq('category', category)
    .order('uploaded_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// Получение файлов по предмету и категории
export async function getFilesBySubjectAndCategory(subjectId: string, category: 'SOR' | 'SOCH'): Promise<FileRecord[]> {
  const { data, error } = await supabase
    .from('files')
    .select(`
      *,
      subject:subjects(*)
    `)
    .eq('subject_id', subjectId)
    .eq('category', category)
    .order('uploaded_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// Загрузка файла
export async function uploadFile(
  file: File,
  classId: string,
  subjectId: string,
  category: 'SOR' | 'SOCH'
): Promise<FileRecord> {
  // Создаем путь для файла
  const filePath = `${classId}/${category}/${subjectId}/${Date.now()}-${file.name}`;
  
  // Загружаем файл в Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('school-files')
    .upload(filePath, file);
  
  if (uploadError) throw uploadError;
  
  // Получаем публичный URL
  const { data: urlData } = supabase.storage
    .from('school-files')
    .getPublicUrl(filePath);
  
  // Сохраняем информацию о файле в базе данных
  const { data: fileData, error: dbError } = await supabase
    .from('files')
    .insert({
      class_id: classId,
      subject_id: subjectId,
      category,
      filename: file.name,
      file_url: urlData.publicUrl,
      file_size: file.size
    })
    .select(`
      *,
      subject:subjects(*)
    `)
    .single();
  
  if (dbError) throw dbError;
  
  // Логирование
  await logAction('FILE_UPLOADED', `File ${file.name} uploaded for ${category} in subject ${subjectId}`);
  
  return fileData;
}

// Удаление файла
export async function deleteFile(fileId: string): Promise<void> {
  // Получаем информацию о файле
  const { data: fileData, error: fetchError } = await supabase
    .from('files')
    .select('*')
    .eq('id', fileId)
    .single();
  
  if (fetchError) throw fetchError;
  
  // Извлекаем путь из URL
  const url = new URL(fileData.file_url);
  const pathParts = url.pathname.split('/');
  const filePath = pathParts.slice(-4).join('/'); // Получаем последние 4 части пути
  
  // Удаляем файл из Storage
  const { error: storageError } = await supabase.storage
    .from('school-files')
    .remove([filePath]);
  
  if (storageError) throw storageError;
  
  // Удаляем запись из базы данных
  const { error: dbError } = await supabase
    .from('files')
    .delete()
    .eq('id', fileId);
  
  if (dbError) throw dbError;
  
  // Логирование
  await logAction('FILE_DELETED', `File ${fileData.filename} deleted`);
}

// Запись скачивания файла
export async function recordDownload(studentId: string, fileId: string): Promise<void> {
  const { error } = await supabase
    .from('downloads')
    .insert({
      student_id: studentId,
      file_id: fileId
    });
  
  if (error) throw error;
  
  // Логирование
  await logAction('FILE_DOWNLOADED', `File ${fileId} downloaded by student ${studentId}`);
}

// Получение статистики скачиваний
export async function getDownloadStats(fileId: string): Promise<number> {
  const { count, error } = await supabase
    .from('downloads')
    .select('*', { count: 'exact', head: true })
    .eq('file_id', fileId);
  
  if (error) throw error;
  return count || 0;
}

// Создание предмета
export async function createSubject(classId: string, name: string): Promise<Subject> {
  const { data, error } = await supabase
    .from('subjects')
    .insert({
      class_id: classId,
      name
    })
    .select('*')
    .single();
  
  if (error) throw error;
  
  // Логирование
  await logAction('SUBJECT_CREATED', `Subject ${name} created for class ${classId}`);
  
  return data;
}