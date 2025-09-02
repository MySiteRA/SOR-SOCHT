import React from 'react';
import { User } from 'lucide-react';

interface StudentAvatarProps {
  student: {
    id: string;
    name: string;
  };
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-32 h-32 text-3xl'
};

export default function StudentAvatar({ student, avatarUrl, size = 'md', className = '' }: StudentAvatarProps) {
  const getStudentInitials = () => {
    return student.name.split(' ').map(n => n[0]).slice(0, 2).join('');
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg ${className}`}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`Аватар ${student.name}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Если изображение не загрузилось, показываем инициалы
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `<span class="text-white font-bold">${getStudentInitials()}</span>`;
            }
          }}
        />
      ) : (
        <span className="text-white font-bold">
          {getStudentInitials()}
        </span>
      )}
    </div>
  );
}