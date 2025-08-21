import { supabase } from '../lib/supabase';
import type { Student } from '../lib/supabase';

export async function getStudent(studentId: string): Promise<Student | null> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Студент не найден
      return null;
    }
    throw error;
  }
  
  return data;
}