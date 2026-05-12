'use client';

import { useEffect, useState } from 'react';

import { apiGet } from '@/lib/api';

type Status = 'loading' | 'ok' | 'error';

interface HealthResponse {
  status: string;
}

const POLL_MS = 30_000;

export function HealthStatus() {
  const [backend, setBackend] = useState<Status>('loading');
  const [db, setDb] = useState<Status>('loading');

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const r = await apiGet<HealthResponse>('/health');
        if (!cancelled) setBackend(r.status === 'ok' ? 'ok' : 'error');
      } catch {
        if (!cancelled) setBackend('error');
      }

      try {
        const r = await apiGet<HealthResponse>('/health/db');
        if (!cancelled) setDb(r.status === 'ok' ? 'ok' : 'error');
      } catch {
        if (!cancelled) setDb('error');
      }
    };

    check();
    const id = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="flex items-center gap-4">
      <Indicator label="API" status={backend} />
      <Indicator label="DB" status={db} />
    </div>
  );
}

const STATUS_LABEL: Record<Status, string> = {
  loading: '確認中…',
  ok: '正常',
  error: 'エラー',
};

function Indicator({ label, status }: { label: string; status: Status }) {
  const color =
    status === 'ok' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : 'bg-gray-300';
  const title = `${label}: ${STATUS_LABEL[status]}`;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-gray-700" title={title}>
      <span
        className={`h-2 w-2 rounded-full ${color} ${status === 'loading' ? 'animate-pulse' : ''}`}
      />
      <span>{label}</span>
    </span>
  );
}
