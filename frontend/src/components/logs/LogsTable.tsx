'use client';

import { Fragment, useState } from 'react';

import { Badge, type BadgeColor } from '@/components/ui/Badge';
import type { RequestLog, RouteLabel, Source } from '@/lib/types';

const ROUTE_COLORS: Record<RouteLabel, BadgeColor> = {
  SIMPLE: 'green',
  COMPLEX: 'amber',
  TOOL: 'purple',
};

const SOURCE_COLORS: Record<Source, BadgeColor> = {
  line: 'blue',
  simulation: 'gray',
};

// Use Intl with an explicit timezone so the server (UTC) and the
// browser (whatever the user's locale) render the same string —
// otherwise React hydration fails. sv-SE happens to format as
// "YYYY-MM-DD HH:mm:ss" which is what we want.
const TS_FORMATTER = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return TS_FORMATTER.format(d);
}

function truncate(text: string | null, max: number): string {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(6)}`;
}

export function LogsTable({ logs }: { logs: RequestLog[] }) {
  const [openId, setOpenId] = useState<number | null>(null);

  if (logs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="text-sm text-gray-500">ログはまだありません</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr className="text-left text-xs font-medium tracking-wide text-gray-500">
            <th className="px-4 py-3">日時</th>
            <th className="px-4 py-3">送信元</th>
            <th className="px-4 py-3">ルート</th>
            <th className="px-4 py-3">メッセージ</th>
            <th className="px-4 py-3">モデル</th>
            <th className="px-4 py-3 text-right">入力トークン</th>
            <th className="px-4 py-3 text-right">出力トークン</th>
            <th className="px-4 py-3 text-right">コスト</th>
            <th className="px-4 py-3 text-right">処理時間</th>
            <th className="px-4 py-3">ステータス</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {logs.map((log) => {
            const isOpen = openId === log.id;
            const inputTokens = log.classifier_input_tokens + log.response_input_tokens;
            const outputTokens = log.classifier_output_tokens + log.response_output_tokens;
            return (
              <Fragment key={log.id}>
                <tr
                  onClick={() => setOpenId(isOpen ? null : log.id)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-700">
                    {formatTimestamp(log.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={SOURCE_COLORS[log.source] ?? 'gray'}>{log.source}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={ROUTE_COLORS[log.route_label] ?? 'gray'}>{log.route_label}</Badge>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-gray-700">
                    {truncate(log.message_text, 60)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{log.response_model}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                    {inputTokens.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                    {outputTokens.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-gray-700">
                    {formatCost(log.total_cost_usd)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                    {log.response_time_ms} ms
                  </td>
                  <td className="px-4 py-3">
                    {log.error ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-red-700">
                        <span className="h-2 w-2 rounded-full bg-red-500" /> エラー
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm text-green-700">
                        <span className="h-2 w-2 rounded-full bg-green-500" /> 正常
                      </span>
                    )}
                  </td>
                </tr>
                {isOpen ? (
                  <tr className="bg-gray-50">
                    <td colSpan={10} className="px-4 py-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold text-gray-500">メッセージ</p>
                          <pre className="mt-1 whitespace-pre-wrap rounded border border-gray-200 bg-white p-3 text-xs text-gray-800">
                            {log.message_text || '(空)'}
                          </pre>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500">応答</p>
                          <pre className="mt-1 whitespace-pre-wrap rounded border border-gray-200 bg-white p-3 text-xs text-gray-800">
                            {log.error ?? log.response_text ?? '(空)'}
                          </pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
