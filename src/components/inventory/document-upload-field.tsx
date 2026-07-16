"use client";

import { useId } from "react";
import { FileUp } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENTS_PER_UPLOAD,
} from "@/lib/file-attachment";

interface DocumentUploadFieldProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  label?: string;
}

export function DocumentUploadField({
  files,
  onChange,
  disabled,
  label = "Scan / photo / document",
}: DocumentUploadFieldProps) {
  const inputId = useId();

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="rounded-md border border-dashed p-3">
        <div className="flex items-start gap-3">
          <FileUp className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 space-y-2">
            <Input
              id={inputId}
              type="file"
              accept={ATTACHMENT_ACCEPT}
              capture="environment"
              multiple
              disabled={disabled}
              onChange={(event) => {
                const selected = Array.from(event.target.files ?? []);
                onChange(selected.slice(0, MAX_ATTACHMENTS_PER_UPLOAD));
              }}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              JPEG, PNG, WebP, GIF, or PDF up to 1 MB each. Max{" "}
              {MAX_ATTACHMENTS_PER_UPLOAD} files. On mobile, you can take a
              photo.
            </p>
            {files.length > 0 && (
              <ul className="space-y-1 text-xs">
                {files.map((file) => (
                  <li key={`${file.name}-${file.size}`} className="truncate">
                    {file.name}{" "}
                    <span className="text-muted-foreground">
                      ({Math.round(file.size / 1024)} KB)
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
