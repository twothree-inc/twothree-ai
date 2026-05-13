'use client';

import Link from 'next/link';

export function Pagination({
  page,
  totalPages,
  basePath,
}: {
  page: number;
  totalPages: number;
  basePath: string;
}) {
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  const linkClass = (disabled: boolean) =>
    `rounded-md border px-3 py-1.5 text-sm transition ${
      disabled
        ? 'cursor-not-allowed border-gray-200 text-gray-400'
        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
    }`;

  // basePath may already contain a query string (e.g. ?from=...&to=...) —
  // use the right separator before appending page.
  const sep = basePath.includes('?') ? '&' : '?';

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium">{page}</span> /{' '}
        <span className="font-medium">{Math.max(totalPages, 1)}</span> ページ
      </p>
      <div className="flex gap-2">
        {prevDisabled ? (
          <span className={linkClass(true)} aria-disabled="true">
            前へ
          </span>
        ) : (
          <Link href={`${basePath}${sep}page=${page - 1}`} className={linkClass(false)}>
            前へ
          </Link>
        )}
        {nextDisabled ? (
          <span className={linkClass(true)} aria-disabled="true">
            次へ
          </span>
        ) : (
          <Link href={`${basePath}${sep}page=${page + 1}`} className={linkClass(false)}>
            次へ
          </Link>
        )}
      </div>
    </div>
  );
}
