import type { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="px-6 py-4">
          <h1 className="text-base font-semibold text-gray-900">LINE Bot Admin</h1>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
