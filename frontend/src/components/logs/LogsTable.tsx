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

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
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
        <p className="text-sm text-gray-500">No logs yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <th className="px-4 py-3">Timestamp</th>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Route</th>
            <th className="px-4 py-3">Message</th>
            <th className="px-4 py-3">Model</th>
            <th className="px-4 py-3 text-right">Input tokens</th>
            <th className="px-4 py-3 text-right">Output tokens</th>
            <th className="px-4 py-3 text-right">Cost</th>
            <th className="px-4 py-3 text-right">Time</th>
            <th className="px-4 py-3">Status</th>
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
                        <span className="h-2 w-2 rounded-full bg-red-500" /> Error
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm text-green-700">
                        <span className="h-2 w-2 rounded-full bg-green-500" /> OK
                      </span>
                    )}
                  </td>
                </tr>
                {isOpen ? (
                  <tr className="bg-gray-50">
                    <td colSpan={10} className="px-4 py-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase text-gray-500">Message</p>
                          <pre className="mt-1 whitespace-pre-wrap rounded border border-gray-200 bg-white p-3 text-xs text-gray-800">
                            {log.message_text || '(empty)'}
                          </pre>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase text-gray-500">Response</p>
                          <pre className="mt-1 whitespace-pre-wrap rounded border border-gray-200 bg-white p-3 text-xs text-gray-800">
                            {log.error ?? log.response_text ?? '(empty)'}
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
