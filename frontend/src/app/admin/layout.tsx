import Link from 'next/link';
import type { ReactNode } from 'react';

import { HealthStatus } from '@/components/admin/HealthStatus';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-6 py-4">
          <Link href="/admin/logs" className="text-base font-semibold text-gray-900">
            LINE Bot 管理画面
          </Link>
          <div className="flex items-center gap-5">
            <HealthStatus />
            <Link
              href="/admin/chat"
              title="チャット"
              aria-label="チャット"
              className="rounded-md p-1.5 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
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
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </Link>
          </div>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
