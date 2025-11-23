"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { X, Download, FileText, Image as ImageIcon, File } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilePreviewerProps {
  files: {
    id: number;
    url: string;
    name: string;
    size: number;
  }[];
}

function getFileType(name: string) {
  const extension = name.split(".").pop()?.toLowerCase();
  if (!extension) return "unknown";
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp"].includes(extension)) return "image";
  if (["pdf"].includes(extension)) return "pdf";
  if (["doc", "docx"].includes(extension)) return "word";
  if (["xls", "xlsx"].includes(extension)) return "excel";
  if (["txt", "md"].includes(extension)) return "text";
  return "other";
}

function getFileIcon(type: string) {
  switch (type) {
    case "image":
      return ImageIcon;
    case "pdf":
    case "word":
    case "excel":
      return FileText;
    default:
      return File;
  }
}

export function FilePreviewer({ files }: FilePreviewerProps) {
  const [activeFileId, setActiveFileId] = useState<number | null>(null);
  const activeFile = useMemo(() => files.find((file) => file.id === activeFileId) ?? null, [files, activeFileId]);

  return (
    <>
      <div className="space-y-2">
        {files.map((file) => {
          const fileType = getFileType(file.name);
          const Icon = getFileIcon(fileType);
          return (
            <button
              key={file.id}
              type="button"
              onClick={() => setActiveFileId(file.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-left transition hover:border-emerald-500 hover:bg-slate-800"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                <Icon className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} КБ</p>
              </div>
              <span className="text-xs text-emerald-400">Открыть</span>
            </button>
          );
        })}
      </div>

      {activeFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setActiveFileId(null)} />
          <div className="relative z-10 flex h-[90vh] w-[90vw] max-w-6xl flex-col rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div>
                <p className="text-base font-semibold text-white">{activeFile.name}</p>
                <p className="text-xs text-slate-400">{(activeFile.size / 1024).toFixed(1)} КБ</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-slate-400 hover:text-white"
                >
                  <a href={activeFile.url} download={activeFile.name}>
                    <Download className="mr-2 h-4 w-4" />
                    Скачать
                  </a>
                </Button>
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                  onClick={() => setActiveFileId(null)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-slate-900/50 p-6">
              <FilePreviewContent file={activeFile} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FilePreviewContent({ file }: { file: { url: string; name: string } }) {
  const type = getFileType(file.name);

  if (type === "image") {
    return (
      <div className="flex h-full items-center justify-center">
        <Image 
          src={file.url} 
          alt={file.name} 
          width={1200} 
          height={800} 
          className="max-h-full max-w-full object-contain rounded-lg" 
        />
      </div>
    );
  }

  if (type === "pdf") {
    return (
      <iframe 
        src={`${file.url}#toolbar=0`} 
        className="h-full w-full rounded-lg border border-slate-800" 
        title={file.name} 
      />
    );
  }

  if (type === "word" || type === "excel") {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <FileText className="mb-4 h-16 w-16 text-slate-600" />
        <p className="mb-2 text-lg font-medium text-slate-300">
          {type === "word" ? "Word документ" : "Excel таблица"}
        </p>
        <p className="mb-4 text-sm text-slate-500">
          Предварительный просмотр Office документов недоступен
        </p>
        <Button
          asChild
          className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700"
        >
          <a href={file.url} download={file.name}>
            <Download className="mr-2 h-4 w-4" />
            Скачать {file.name}
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <File className="mb-4 h-16 w-16 text-slate-600" />
      <p className="mb-2 text-lg font-medium text-slate-300">
        Предварительный просмотр недоступен
      </p>
      <p className="mb-4 text-sm text-slate-500">
        Формат файла не поддерживается для просмотра
      </p>
      <Button
        asChild
        className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700"
      >
        <a href={file.url} download={file.name}>
          <Download className="mr-2 h-4 w-4" />
          Скачать {file.name}
        </a>
      </Button>
    </div>
  );
}
