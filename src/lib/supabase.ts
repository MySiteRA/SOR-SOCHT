import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Class {
  id: string;
  name: string;
  created_at: string;
}

export interface Student {
  id: string;
  class_id: string;
  name: string;
  password_hash: string | null;
  url: string | null;
  created_at: string;
}

export interface Key {
  id: string;
  student_id: string;
  key_value: string;
  status: 'active' | 'revoked';
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
}

export interface Log {
  id: string;
  action: string;
  details: string | null;
  created_at: string;
}

export interface Subject {
  id: string;
  class_id: string;
  name: string;
  created_at: string;
}

export interface FileRecord {
  id: string;
  class_id: string;
  subject_id: string;
  category: 'SOR' | 'SOCH';
  filename: string;
  file_url: string;
  file_size: number;
  uploaded_at: string;
  subject?: Subject;
}

export interface Download {
  id: string;
  student_id: string;
  file_id: string;
  downloaded_at: string;
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  created_at: string;
}

export interface Material {
  id: string;
  subject_id: string;
  title: string;
  type: 'SOR' | 'SOCH';
  content_type: 'text' | 'image' | 'file' | 'link';
  content_value: string;
  created_at: string;
  subject?: Subject;
}