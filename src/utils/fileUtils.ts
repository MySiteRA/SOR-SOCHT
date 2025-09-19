// Утилиты для работы с файлами

export function generateFileId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function isImageFile(filename: string): boolean {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
  return imageExtensions.includes(getFileExtension(filename));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Проверяем тип файла
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Файл должен быть изображением' };
  }

  // Проверяем размер (максимум 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'Размер изображения не должен превышать 10MB' };
  }

  return { valid: true };
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  // Проверяем размер (максимум 50MB)
  if (file.size > 50 * 1024 * 1024) {
    return { valid: false, error: 'Размер файла не должен превышать 50MB' };
  }

  return { valid: true };
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function getFileNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop() || 'file';
    return decodeURIComponent(filename);
  } catch {
    return 'file';
  }
}
export function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || '';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// Создание высококачественного data URL для изображений
export function createHighQualityImageDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        
        // Сохраняем оригинальные размеры для максимального качества
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        // Настройки для максимального качества
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Рисуем изображение в оригинальном размере
        ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
        
        // Экспортируем с максимальным качеством
        let dataUrl;
        if (file.type === 'image/png') {
          dataUrl = canvas.toDataURL('image/png');
        } else if (file.type === 'image/webp') {
          dataUrl = canvas.toDataURL('image/webp', 1.0);
        } else {
          // Для JPEG используем максимальное качество
          dataUrl = canvas.toDataURL('image/jpeg', 1.0);
        }
        
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Проверка поддержки камеры
export function isCameraSupported(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// Определение типа устройства
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Sanitize filename for safe storage key usage
export function sanitizeFilename(filename: string): string {
  const transliterationMap: { [key: string]: string } = {
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
  
  console.log('sanitizeFilename input:', filename);
  
  return filename
    .split('')
    .map(char => transliterationMap[char] || char)
    .join('')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Функция для создания безопасного ключа для названий классов
export function makeSafeKey(className: string): string {
  const translitMap: Record<string, string> = {
    // Русские буквы
    "А":"A","Б":"B","В":"V","Г":"G","Д":"D","Е":"E","Ё":"E","Ж":"Zh","З":"Z","И":"I",
    "Й":"Y","К":"K","Л":"L","М":"M","Н":"N","О":"O","П":"P","Р":"R","С":"S","Т":"T",
    "У":"U","Ф":"F","Х":"Kh","Ц":"Ts","Ч":"Ch","Ш":"Sh","Щ":"Sch","Ъ":"","Ы":"Y","Ь":"",
    "Э":"E","Ю":"Yu","Я":"Ya","а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ё":"e",
    "ж":"zh","з":"z","и":"i","й":"y","к":"k","л":"l","м":"m","н":"n","о":"o","п":"p",
    "р":"r","с":"s","т":"t","у":"u","ф":"f","х":"kh","ц":"ts","ч":"ch","ш":"sh","щ":"sch",
    "ъ":"","ы":"y","ь":"","э":"e","ю":"yu","я":"ya",
    // Узбекские буквы
    "Ў":"U","Қ":"Q","Ғ":"G","Ҳ":"H","ў":"u","қ":"q","ғ":"g","ҳ":"h"
  };
  
  console.log('makeSafeKey input:', className);
  
  return className
    .split("")
    .map(ch => translitMap[ch] || ch)
    .join("")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}