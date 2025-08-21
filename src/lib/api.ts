import { supabase } from './supabase';
import bcrypt from 'bcryptjs';
import type { Class, Student, Key, Subject, FileRecord, Download, Material } from './supabase';

// ==================== Классы ====================
export async function getClasses(): Promise<Class[]> {
  const allowedClasses = [
    '11-А', '11-Б', '11-В', '11-Д', '11-Е', '11-Ё',
    '10-А', '10-Б', '10-В', '10-Г', '10-Д', '10-Е',
    '9-А', '9-А УТ', '9-Б', '9-В', '9-Г', '9-Д', '9-Е', '9-Ё',
    '8-А', '8-Б', '8-В', '8-Г', '8-Д', '8-Е',
    '7-А', '7-Б', '7-В', '7-Г', '7-Д', '7-Е',
    '6-А', '6-Б', '6-В', '6-Г',
    '5-А', '5-Б', '5-В',
    '4-А', '4-Б', '4-В', '4-Г', '4-Д', '4-Е',
    '3-А', '3-Б', '3-В', '3-ВUT', '3-Г', '3-Д',
    '2-А', '2-Б', '2-В', '2-Г', '2-Д', '2-Е'
  ];

  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .in('name', allowedClasses);

  if (error) throw error;

  // Сортировка по нашему порядку
  const orderedData = allowedClasses
    .map(name => data.find(cls => cls.name === name))
    .filter((cls): cls is Class => Boolean(cls));

  return orderedData;
}


// ==================== Ученики ====================
export async function getStudentsByClass(classId: string): Promise<Student[]> {
  const { data, error } = await supabase.from('students').select('*').eq('class_id', classId).order('name');
  if (error) throw error;
  return data || [];
}
export async function getStudent(studentId: string): Promise<Student | null> {
  const { data, error } = await supabase.from('students').select('*').eq('id', studentId).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

// Импортируем функцию из нового сервиса
export { getStudent as getStudentById } from '../services/student';

// ==================== Ключи ====================
export async function validateKey(keyValue: string, studentId: string): Promise<{ valid: boolean; student: Student | null }> {
  const { data: keyData, error: keyError } = await supabase
    .from('keys')
    .select('*, students(*)')
    .eq('key_value', keyValue)
    .eq('student_id', studentId)
    .eq('status', 'active')
    .single();
    
  if (keyError || !keyData) return { valid: false, student: null };
  
  // Проверяем срок действия ключа
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    return { valid: false, student: null };
  }
  
  return { valid: true, student: Array.isArray(keyData.students) ? keyData.students[0] : keyData.students };
}

export async function generateKey(studentId: string, expiresAt?: string): Promise<string> {
  // Генерируем ключ в формате XXXX-XXXX-XXXX
  const generateFormattedKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) result += '-';
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  
  const keyValue = generateFormattedKey();
  
  const { error } = await supabase.from('keys').insert({
    student_id: studentId,
    key_value: keyValue,
    status: 'active',
    expires_at: expiresAt || null
  });
  
  if (error) throw error;
  await logAction('KEY_GENERATED', `Key generated for student ${studentId}`);
  return keyValue;
}

export async function revokeKey(keyId: string): Promise<void> {
  const { error } = await supabase.from('keys').update({ status: 'revoked', revoked_at: new Date().toISOString() }).eq('id', keyId);
  if (error) throw error;
  await logAction('KEY_REVOKED', `Key ${keyId} revoked`);
}

export async function updateKeyExpiration(keyId: string, expiresAt: string | null): Promise<void> {
  const { error } = await supabase.from('keys').update({ expires_at: expiresAt }).eq('id', keyId);
  if (error) throw error;
  await logAction('KEY_EXPIRATION_UPDATED', `Key ${keyId} expiration updated`);
}

export async function getStudentKeys(studentId: string): Promise<Key[]> {
  const { data, error } = await supabase.from('keys').select('*').eq('student_id', studentId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ==================== Пароли ====================
export async function validatePassword(studentId: string, password: string): Promise<{ valid: boolean; student: Student | null }> {
  const { data: student, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .single();
  
  if (error || !student) {
    return { valid: false, student: null };
  }
  
  // Проверяем, установлен ли пароль
  if (!student.password_hash) {
    throw new Error('Пароль не установлен');
  }
  
  const isValid = await bcrypt.compare(password, student.password_hash);
  
  // Обновляем время последнего входа при успешной авторизации
  if (isValid) {
    await supabase
      .from('students')
      .update({ last_login: new Date().toISOString() })
      .eq('id', studentId);
  }
  
  return { valid: isValid, student: isValid ? student : null };
}

export async function createPassword(studentId: string, password: string): Promise<void> {
  // Проверяем, что пароль не пустой
  if (!password || password.trim().length === 0) {
    throw new Error('Пароль не может быть пустым');
  }
  
  // Проверяем минимальную длину пароля
  if (password.trim().length < 4) {
    throw new Error('Пароль должен содержать минимум 4 символа');
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const { error } = await supabase
    .from('students')
    .update({ 
      password_hash: hashedPassword,
      registration_date: new Date().toISOString(),
      last_login: new Date().toISOString()
    })
    .eq('id', studentId);
    
  if (error) throw error;
  await logAction('PASSWORD_CREATED', `Password created for student ${studentId}`);
}

export async function resetStudentPassword(studentId: string): Promise<void> {
  const { error } = await supabase
    .from('students')
    .update({ password_hash: null })
    .eq('id', studentId);
    
  if (error) throw error;
  await logAction('PASSWORD_RESET', `Password reset for student ${studentId}`);
}

export async function updateStudentUrl(studentId: string, url: string): Promise<void> {
  // Обновляем только URL, не трогая password_hash
  const { error } = await supabase
    .from('students')
    .update({ url })
    .eq('id', studentId);
    
  if (error) throw error;
  await logAction('URL_UPDATED', `URL updated for student ${studentId} to ${url}`);
}

// ==================== Предметы ====================
export async function getSubjects(): Promise<Subject[]> {
  const { data, error } = await supabase.from('subjects').select('*').order('name');
  if (error) throw error;
  return data || [];
}

export async function getSubjectsByClass(classId: string): Promise<Subject[]> {
  const { data, error } = await supabase.from('subjects').select('*').eq('class_id', classId).order('name');
  if (error) throw error;
  return data || [];
}

export async function createSubject(classId: string, name: string): Promise<Subject> {
  const { data, error } = await supabase.from('subjects').insert({ class_id: classId, name }).select('*').single();
  if (error) throw error;
  await logAction('SUBJECT_CREATED', `Subject ${name} created for class ${classId}`);
  return data;
}

export async function updateSubject(id: string, name: string, icon: string): Promise<Subject> {
  const { data, error } = await supabase.from('subjects').update({ name, icon }).eq('id', id).select('*').single();
  if (error) throw error;
  await logAction('SUBJECT_UPDATED', `Subject ${id} updated`);
  return data;
}

export async function deleteSubject(id: string): Promise<void> {
  const { error } = await supabase.from('subjects').delete().eq('id', id);
  if (error) throw error;
  await logAction('SUBJECT_DELETED', `Subject ${id} deleted`);
}

// ==================== Материалы ====================
export async function getMaterialsBySubject(subjectId: string): Promise<Material[]> {
  const { data, error } = await supabase.from('materials').select(`*, subject:subjects(*)`).eq('subject_id', subjectId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getMaterialsByType(subjectId: string, type: 'SOR' | 'SOCH'): Promise<Material[]> {
  const { data, error } = await supabase.from('materials').select(`*, subject:subjects(*)`).eq('subject_id', subjectId).eq('type', type).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createMaterial(subjectId: string, title: string, type: 'SOR' | 'SOCH', contentType: 'text' | 'image' | 'file' | 'link', contentValue: string): Promise<Material> {
  const { data, error } = await supabase.from('materials').insert({
    subject_id: subjectId,
    title,
    type,
    content_type: contentType,
    content_value: contentValue
  }).select(`*, subject:subjects(*)`).single();
  if (error) throw error;
  await logAction('MATERIAL_CREATED', `Material ${title} created for subject ${subjectId}`);
  return data;
}

export async function deleteMaterial(id: string): Promise<void> {
  const { error } = await supabase.from('materials').delete().eq('id', id);
  if (error) throw error;
  await logAction('MATERIAL_DELETED', `Material ${id} deleted`);
}

export async function updateMaterial(id: string, title: string, contentType: 'text' | 'image' | 'file' | 'link', contentValue: string): Promise<Material> {
  const { data, error } = await supabase.from('materials').update({
    title,
    content_type: contentType,
    content_value: contentValue
  }).eq('id', id).select(`*, subject:subjects(*)`).single();
  if (error) throw error;
  await logAction('MATERIAL_UPDATED', `Material ${id} updated`);
  return data;
}

// ==================== Файлы ====================
export async function getFilesByClassAndCategory(classId: string, category: 'SOR' | 'SOCH'): Promise<FileRecord[]> {
  const { data, error } = await supabase.from('files').select(`*, subject:subjects(*)`).eq('class_id', classId).eq('category', category).order('uploaded_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getFilesBySubjectAndCategory(subjectId: string, category: 'SOR' | 'SOCH'): Promise<FileRecord[]> {
  const { data, error } = await supabase.from('files').select(`*, subject:subjects(*)`).eq('subject_id', subjectId).eq('category', category).order('uploaded_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function uploadFile(file: File, classId: string, subjectId: string, category: 'SOR' | 'SOCH'): Promise<FileRecord> {
  const filePath = `${classId}/${category}/${subjectId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from('school-files').upload(filePath, file);
  if (uploadError) throw uploadError;
  const { data: urlData } = supabase.storage.from('school-files').getPublicUrl(filePath);
  const { data: fileData, error: dbError } = await supabase.from('files').insert({
    class_id: classId,
    subject_id: subjectId,
    category,
    filename: file.name,
    file_url: urlData.publicUrl,
    file_size: file.size
  }).select(`*, subject:subjects(*)`).single();
  if (dbError) throw dbError;
  await logAction('FILE_UPLOADED', `File ${file.name} uploaded`);
  return fileData;
}

export async function deleteFile(fileId: string): Promise<void> {
  const { data: fileData, error: fetchError } = await supabase.from('files').select('*').eq('id', fileId).single();
  if (fetchError) throw fetchError;
  const url = new URL(fileData.file_url);
  const pathParts = url.pathname.split('/');
  const filePath = pathParts.slice(-4).join('/');
  const { error: storageError } = await supabase.storage.from('school-files').remove([filePath]);
  if (storageError) throw storageError;
  const { error: dbError } = await supabase.from('files').delete().eq('id', fileId);
  if (dbError) throw dbError;
  await logAction('FILE_DELETED', `File ${fileData.filename} deleted`);
}

// ==================== Скачивания ====================
export async function recordDownload(studentId: string, fileId: string): Promise<void> {
  const { error } = await supabase.from('downloads').insert({ student_id: studentId, file_id: fileId });
  if (error) throw error;
  await logAction('FILE_DOWNLOADED', `File ${fileId} downloaded by student ${studentId}`);
}

export async function getDownloadStats(fileId: string): Promise<number> {
  const { count, error } = await supabase.from('downloads').select('*', { count: 'exact', head: true }).eq('file_id', fileId);
  if (error) throw error;
  return count || 0;
}

// ==================== Логи и админ ====================
export async function logAction(action: string, details: string): Promise<void> {
  await supabase.from('logs').insert({ action, details });
}

export function validateAdminCredentials(username: string, password: string): boolean {
  return (username === 'admin' && password === 'frost2008791533') ||
         (username === 'admin1' && password === 'madiev2009sor');
}
