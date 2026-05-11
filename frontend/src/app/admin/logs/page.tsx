import { LogsTable } from '@/components/logs/LogsTable';
import { Pagination } from '@/components/ui/Pagination';
import { apiGet, ApiError } from '@/lib/api';
import type { PaginatedLogs } from '@/lib/types';

export const dynamic = 'force-dynamic';

const PER_PAGE = 50;

function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export default async function LogsPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = parsePage(searchParams.page);

  let data: PaginatedLogs | null = null;
  let error: string | null = null;
  try {
    data = await apiGet<PaginatedLogs>(`/api/logs?page=${page}&per_page=${PER_PAGE}`);
  } catch (e) {
    error =
      e instanceof ApiError
        ? `API error ${e.status}: ${e.message}`
        : e instanceof Error
          ? e.message
          : 'Unknown error';
  }

  const totalPages = data ? Math.max(Math.ceil(data.total / data.per_page), 1) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Request logs</h2>
          <p className="mt-1 text-sm text-gray-600">
            {data ? `${data.total.toLocaleString()} total requests` : 'Loading…'}
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">Could not load logs</p>
          <p className="mt-1 font-mono text-xs">{error}</p>
        </div>
      ) : data ? (
        <>
          <LogsTable logs={data.logs} />
          <Pagination page={page} totalPages={totalPages} basePath="/admin/logs" />
        </>
      ) : null}
    </div>
  );
}
