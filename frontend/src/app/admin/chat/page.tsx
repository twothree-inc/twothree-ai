'use client';

import { useEffect, useRef, useState } from 'react';

import { apiPost, ApiError } from '@/lib/api';

interface Attachment {
  id: number;
  file: File;
  previewUrl: string | null; // object URL for images, null for non-images
}

interface ChatMessage {
  id: number;
  role: 'user' | 'bot';
  text: string;
  attachments?: Attachment[]; // shown locally only — not yet sent to backend
}

interface ChatApiResponse {
  response: string;
}

const MAX_ATTACHMENTS = 3;
const ACCEPT =
  'image/*,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(0);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, pending]);

  // Revoke object URLs on unmount to avoid leaks.
  useEffect(() => {
    return () => {
      attachments.forEach((a) => {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nextId = () => ++idRef.current;

  const addFiles = (files: FileList | File[]) => {
    setAttachments((prev) => {
      const room = MAX_ATTACHMENTS - prev.length;
      if (room <= 0) {
        setError(`添付できるファイルは最大 ${MAX_ATTACHMENTS} 件までです`);
        return prev;
      }
      setError(null);
      const additions: Attachment[] = Array.from(files)
        .slice(0, room)
        .map((file) => ({
          id: nextId(),
          file,
          previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        }));
      return [...prev, ...additions];
    });
  };

  const removeAttachment = (id: number) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  };

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.files);
    if (files.length === 0) return;
    e.preventDefault();
    addFiles(files);
  };

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) addFiles(e.target.files);
    e.target.value = ''; // allow re-picking the same file
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && attachments.length === 0) || pending) return;

    setError(null);
    // Snapshot the attachments into the bubble; clear them from the input area.
    const messageAttachments = attachments;
    setMessages((m) => [
      ...m,
      { id: nextId(), role: 'user', text, attachments: messageAttachments },
    ]);
    setInput('');
    setAttachments([]);
    setPending(true);

    try {
      // For now we only send text — backend file analysis is a separate task.
      const data = await apiPost<ChatApiResponse>('/api/chat', { message: text });
      setMessages((m) => [...m, { id: nextId(), role: 'bot', text: data.response }]);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? `API エラー ${e.status}: ${e.message}`
          : e instanceof Error
            ? e.message
            : '不明なエラー';
      setError(msg);
    } finally {
      setPending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const canSend = !pending && (input.trim().length > 0 || attachments.length > 0);

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4"
      >
        {messages.length === 0 && !pending ? (
          <p className="py-12 text-center text-sm text-gray-400">
            メッセージを入力して送信してください
          </p>
        ) : null}

        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[80%] space-y-2">
                {m.attachments && m.attachments.length > 0 ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    {m.attachments.map((a) => (
                      <AttachmentBubble key={a.id} attachment={a} />
                    ))}
                  </div>
                ) : null}
                {m.text ? (
                  <div className="whitespace-pre-wrap rounded-2xl bg-blue-500 px-4 py-2 text-sm text-white">
                    {m.text}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex justify-start">
              <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-900">
                {m.text}
              </div>
            </div>
          ),
        )}

        {pending ? (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-1.5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            {error}
          </div>
        ) : null}
      </div>

      <div className="mt-3 rounded-lg border border-gray-300 bg-white p-2">
        {attachments.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2 border-b border-gray-100 pb-2">
            {attachments.map((a) => (
              <AttachmentChip key={a.id} attachment={a} onRemove={() => removeAttachment(a.id)} />
            ))}
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={pending || attachments.length >= MAX_ATTACHMENTS}
            title={`ファイルを添付 (最大 ${MAX_ATTACHMENTS} 件)`}
            aria-label="ファイルを添付"
            className="shrink-0 rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.98 8.83l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            multiple
            onChange={onPickFiles}
            className="hidden"
          />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            rows={2}
            placeholder="メッセージを入力 (Enter で送信、Shift+Enter で改行、ファイルは貼り付け可)"
            className="flex-1 resize-none border-0 bg-transparent px-1 py-2 text-sm focus:outline-none focus:ring-0"
            disabled={pending}
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={!canSend}
            className="shrink-0 rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
}

function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove: () => void;
}) {
  const { file, previewUrl } = attachment;
  return (
    <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 py-1 pl-1 pr-2">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt={file.name} className="h-10 w-10 rounded object-cover" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded bg-white text-gray-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
      )}
      <div className="min-w-0 max-w-[160px]">
        <p className="truncate text-xs font-medium text-gray-700" title={file.name}>
          {file.name}
        </p>
        <p className="text-[10px] text-gray-500">{formatBytes(file.size)}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${file.name} を削除`}
        className="ml-1 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

function AttachmentBubble({ attachment }: { attachment: Attachment }) {
  const { file, previewUrl } = attachment;
  if (previewUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={previewUrl}
        alt={file.name}
        className="max-h-48 max-w-full rounded-xl border border-gray-200 object-contain"
      />
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-gray-400"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-gray-700" title={file.name}>
          {file.name}
        </p>
        <p className="text-[10px] text-gray-500">{formatBytes(file.size)}</p>
      </div>
    </div>
  );
}
