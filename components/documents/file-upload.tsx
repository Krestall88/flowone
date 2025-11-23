"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number;
}

export function FileUpload({
  files,
  onFilesChange,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024,
}: FileUploadProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError(null);

      if (rejectedFiles.length > 0) {
        const reason = rejectedFiles[0].errors[0]?.code;
        if (reason === "file-too-large") {
          setError(`Файл слишком большой. Максимум ${maxSize / 1024 / 1024} МБ`);
        } else if (reason === "too-many-files") {
          setError(`Максимум ${maxFiles} файлов`);
        } else {
          setError("Ошибка загрузки файла");
        }
        return;
      }

      const newFiles = [...files, ...acceptedFiles].slice(0, maxFiles);
      onFilesChange(newFiles);
    },
    [files, maxFiles, maxSize, onFilesChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    maxSize,
    multiple: true,
  });

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 transition hover:border-primary hover:bg-slate-100",
          isDragActive && "border-primary bg-primary/5",
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mb-3 h-10 w-10 text-slate-400" />
        <p className="text-sm font-medium text-slate-700">
          {isDragActive ? "Отпустите файлы здесь" : "Перетащите файлы или нажмите для выбора"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          До {maxFiles} файлов, максимум {maxSize / 1024 / 1024} МБ каждый
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {(file.size / 1024).toFixed(1)} КБ
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
