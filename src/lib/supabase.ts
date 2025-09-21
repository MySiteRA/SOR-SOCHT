import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl ? 'present' : 'missing',
    key: supabaseAnonKey ? 'present' : 'missing'
  });
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
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

export interface StudentProfile {
  id: string;
  student_id: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoginSession {
  id: string;
  student_id: string;
  login_time: string;
  device_info: any;
  ip_address: string | null;
  user_agent: string | null;
}

export interface Game {
  id: string;
  class_id: string;
  game_type: 'truth_or_dare' | 'quiz' | 'mafia';
  status: 'waiting' | 'started' | 'finished';
  created_by: string;
  max_players: number;
  current_round: number;
  settings: {
    mafia?: number;
    doctor?: number;
    detective?: number;
  };
  created_at: string;
  started_at?: string;
  finished_at?: string;
}

export interface GamePlayer {
  id: string;
  game_id: string;
  player_id: string;
  player_name: string;
  role: string;
  score: number;
  is_alive: boolean;
  joined_at: string;
}

export interface GameEvent {
  id: string;
  game_id: string;
  player_id?: string;
  player_name?: string;
  event_type: 'join' | 'leave' | 'question' | 'answer' | 'vote' | 'action' | 'system' | 'chat';
  content: string;
  metadata?: any;
  created_at: string;
}

export interface Material {
  id: string;
  subject_id: string;
  title: string;
  type: 'SOR' | 'SOCH';
  content_type: 'bundle';
  content_value: MaterialContentItem[];
  created_at: string;
  grade: number;
  language: string;
  quarter: number;
  subject?: Subject;
}

export type MaterialContentItem =
  | { type: 'text'; value: string }
  | { type: 'link'; value: string }
  | { type: 'file'; value: string }
  | { type: 'image'; value: string };

export type MaterialPayload = {
  title: string;
  type: 'SOR' | 'SOCH';
  grade: number;
  subject_id: string;
  quarter?: number | null;
  language?: 'ru' | 'uz' | 'en' | null;
  content_value: MaterialContentItem[];
}