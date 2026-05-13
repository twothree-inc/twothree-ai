'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DateRangePicker({
  initialFrom,
  initialTo,
}: {
  initialFrom: string;
  initialTo: string;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  // Auto-apply: fire as soon as either field changes (provided the
  // resulting range is valid). Resets to page=1 since the rows shift.
  const navigate = (nextFrom: string, nextTo: string) => {
    if (nextFrom && nextTo && nextFrom > nextTo) return;
    const params = new URLSearchParams();
    if (nextFrom) params.set('from', nextFrom);
    if (nextTo) params.set('to', nextTo);
    params.set('page', '1');
    const qs = params.toString();
    router.push(qs ? `/admin/logs?${qs}` : '/admin/logs');
  };

  const onFromChange = (v: string) => {
    setFrom(v);
    navigate(v, to);
  };

  const onToChange = (v: string) => {
    setTo(v);
    navigate(from, v);
  };

  const invalid = from && to ? from > to : false;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="date"
        value={from}
        max={to || undefined}
        onChange={(e) => onFromChange(e.target.value)}
        className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <span className="text-sm text-gray-500">〜</span>
      <input
        type="date"
        value={to}
        min={from || undefined}
        onChange={(e) => onToChange(e.target.value)}
        className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {invalid ? (
        <span className="text-xs text-red-600">開始日は終了日以前にしてください</span>
      ) : null}
    </div>
  );
}
