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

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-gray-600">
        Page <span className="font-medium">{page}</span> of{' '}
        <span className="font-medium">{Math.max(totalPages, 1)}</span>
      </p>
      <div className="flex gap-2">
        {prevDisabled ? (
          <span className={linkClass(true)} aria-disabled="true">
            Previous
          </span>
        ) : (
          <Link href={`${basePath}?page=${page - 1}`} className={linkClass(false)}>
            Previous
          </Link>
        )}
        {nextDisabled ? (
          <span className={linkClass(true)} aria-disabled="true">
            Next
          </span>
        ) : (
          <Link href={`${basePath}?page=${page + 1}`} className={linkClass(false)}>
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
