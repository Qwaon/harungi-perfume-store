import type { Metadata } from 'next';
import AdminSidebar from '@/components/admin/AdminSidebar';

export const metadata: Metadata = { title: 'Админка HARUNGI', robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-cream-100 md:flex">
      <AdminSidebar />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-6 w-full">{children}</main>
    </div>
  );
}
