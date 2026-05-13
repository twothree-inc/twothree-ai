import { DateRangePicker } from '@/components/logs/DateRangePicker';
import { LogsTable } from '@/components/logs/LogsTable';
import { Pagination } from '@/components/ui/Pagination';
import { apiGet, ApiError } from '@/lib/api';
import type { PaginatedLogs } from '@/lib/types';

export const dynamic = 'force-dynamic';

const PER_PAGE = 50;

function firstParam(raw: string | string[] | undefined): string {
  return Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');
}

function parsePage(raw: string | string[] | undefined): number {
  const n = Number.parseInt(firstParam(raw) || '1', 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

// Accept YYYY-MM-DD only; drop anything else so a bad URL param can't
// break the query downstream.
function parseDate(raw: string | string[] | undefined): string {
  const v = firstParam(raw);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
}

function buildBasePath(from: string, to: string): string {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString();
  return qs ? `/admin/logs?${qs}` : '/admin/logs';
}

// Defaults are computed in JST (Asia/Tokyo) so they match the
// timezone the backend uses to interpret /api/logs date filters.
// sv-SE locale formats as YYYY-MM-DD natively.
function jstTodayISO(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
}

function jstFirstOfMonthISO(): string {
  return `${jstTodayISO().slice(0, 7)}-01`;
}

export default async function LogsPage({
  searchParams,
}: {
  searchParams: { page?: string; from?: string; to?: string };
}) {
  const page = parsePage(searchParams.page);
  // Each field defaults independently so a partial filter
  // (e.g. ?from=...) still gets a sensible upper bound.
  const from = parseDate(searchParams.from) || jstFirstOfMonthISO();
  const to = parseDate(searchParams.to) || jstTodayISO();

  const apiParams = new URLSearchParams();
  apiParams.set('page', String(page));
  apiParams.set('per_page', String(PER_PAGE));
  if (from) apiParams.set('from', from);
  if (to) apiParams.set('to', to);

  let data: PaginatedLogs | null = null;
  let error: string | null = null;
  try {
    data = await apiGet<PaginatedLogs>(`/api/logs?${apiParams.toString()}`);
  } catch (e) {
    error =
      e instanceof ApiError
        ? `API エラー ${e.status}: ${e.message}`
        : e instanceof Error
          ? e.message
          : '不明なエラー';
  }

  const totalPages = data ? Math.max(Math.ceil(data.total / data.per_page), 1) : 1;
  const basePath = buildBasePath(from, to);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">リクエストログ</h2>
          <p className="mt-1 text-sm text-gray-600">
            {data ? `全 ${data.total.toLocaleString()} 件` : '読み込み中…'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <DateRangePicker initialFrom={from} initialTo={to} />
          {data ? (
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-right">
              <p className="text-xs text-gray-500">合計利用料</p>
              <p className="font-mono text-lg font-semibold text-gray-900">
                ${data.total_cost_usd.toFixed(4)}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">ログを読み込めませんでした</p>
          <p className="mt-1 font-mono text-xs">{error}</p>
        </div>
      ) : data ? (
        <>
          <LogsTable logs={data.logs} />
          <Pagination page={page} totalPages={totalPages} basePath={basePath} />
        </>
      ) : null}
    </div>
  );
}
