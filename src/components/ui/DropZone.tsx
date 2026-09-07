import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, AlertCircle } from 'lucide-react';

interface DropZoneProps {
  onFilesDrop: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
}

export function DropZone({ onFilesDrop, accept, multiple = true }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback(
    (files: File[]) => {
      if (accept) {
        const acceptedTypes = accept.split(',').map((t) => t.trim());
        const invalid = files.filter(
          (f) => !acceptedTypes.some((type) => f.name.toLowerCase().endsWith(type.replace('*', '')))
        );
        if (invalid.length > 0) {
          setError(`Invalid file type. Only ${accept} files are accepted.`);
          return [];
        }
      }
      setError(null);
      return files;
    },
    [accept]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      const validFiles = validateFiles(droppedFiles);
      if (validFiles.length > 0) {
        onFilesDrop(multiple ? validFiles : [validFiles[0]]);
      }
    },
    [onFilesDrop, multiple, validateFiles]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files ?? []);
      const validFiles = validateFiles(selectedFiles);
      if (validFiles.length > 0) {
        onFilesDrop(multiple ? validFiles : [validFiles[0]]);
      }
      // Reset input so re-selecting the same file triggers change
      e.target.value = '';
    },
    [onFilesDrop, multiple, validateFiles]
  );

  return (
    <div className="w-full">
      <motion.div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center gap-4 p-12 rounded-xl border-2 border-dashed cursor-pointer transition-colors
          ${isDragOver
            ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_30px_rgba(59,130,246,0.15)]'
            : error
              ? 'border-red-500/50 bg-red-500/5'
              : 'border-slate-600 bg-slate-800/30 hover:border-slate-500 hover:bg-slate-800/50'
          }
        `}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
        animate={{
          borderColor: isDragOver ? '#3b82f6' : undefined,
        }}
      >
        <motion.div
          animate={{
            y: isDragOver ? -5 : 0,
            scale: isDragOver ? 1.1 : 1,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div
            className={`
              w-16 h-16 rounded-full flex items-center justify-center
              ${isDragOver ? 'bg-blue-500/20' : 'bg-slate-700/50'}
            `}
          >
            <Upload
              className={`w-7 h-7 ${isDragOver ? 'text-blue-400' : 'text-slate-400'}`}
            />
          </div>
        </motion.div>

        <div className="text-center">
          <p className="text-base font-medium text-slate-200">
            {isDragOver ? 'Drop files here' : 'Drag & drop Excel files here'}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            or <span className="text-blue-400 underline underline-offset-2">click to browse</span>
          </p>
          <p className="text-xs text-slate-500 mt-2">Accepts .xlsx files only</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
        />
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mt-3 text-sm text-red-400"
        >
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </motion.div>
      )}
    </div>
  );
}
