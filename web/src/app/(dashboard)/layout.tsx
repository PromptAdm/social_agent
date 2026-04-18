import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { Toaster } from '@/components/shared/Toaster'
import { AuthGuard } from '@/components/providers/AuthGuard'
// import { OperationFeedback } from '@/components/shared/OperationFeedback'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="flex h-screen bg-[#F5F4FB] overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
        <Toaster />
        {/* <OperationFeedback /> */}
      </div>
    </AuthGuard>
  )
}