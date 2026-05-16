import SideNav from '@/app/components/SideNav'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <SideNav />
      <main className="admin-main">{children}</main>
    </div>
  )
}
