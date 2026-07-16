"use client";

import { Paperclip } from "lucide-react";

export interface AttachmentMeta {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

interface AttachmentLinksProps {
  attachments?: AttachmentMeta[];
}

export function AttachmentLinks({ attachments = [] }: AttachmentLinksProps) {
  if (attachments.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <ul className="space-y-1">
      {attachments.map((attachment) => (
        <li key={attachment.id}>
          <a
            href={`/api/attachments/${attachment.id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm hover:underline"
          >
            <Paperclip className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{attachment.filename}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
