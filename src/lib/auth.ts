import bcrypt from 'bcryptjs'
import { supabase } from './supabase'

// Генерация уникального ключа доступа
export function generateAccessKey(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 12; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
    if (i === 3 || i === 7) result += '-'
  }
  return result
}

// Хэширование пароля
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

// Проверка пароля
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Проверка ключа доступа
export async function verifyAccessKey(studentId: string, key: string) {
  const { data, error } = await supabase
    .from('keys')
    .select('*')
    .eq('student_id', studentId)
    .eq('key_value', key)
    .eq('status', 'active')
    .single()

  if (error || !data) {
    return { valid: false, keyData: null }
  }

  return { valid: true, keyData: data }
}

// Установка пароля для студента
export async function setStudentPassword(studentId: string, password: string) {
  const hashedPassword = await hashPassword(password)
  
  const { error } = await supabase
    .from('students')
    .update({ password_hash: hashedPassword })
    .eq('id', studentId)

  return !error
}

// Проверка пароля студента
export async function verifyStudentPassword(studentId: string, password: string) {
  const { data, error } = await supabase
    .from('students')
    .select('password_hash')
    .eq('id', studentId)
    .single()

  if (error || !data?.password_hash) {
    return false
  }

  return verifyPassword(password, data.password_hash)
}

// Логирование действий админа
export async function logAdminAction(action: string, details: any = {}) {
  await supabase
    .from('admin_logs')
    .insert({
      action,
      details
    })
}