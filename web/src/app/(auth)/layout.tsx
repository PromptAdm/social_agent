export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#06070C] flex items-center justify-center p-4 sm:p-6">
      {children}
    </div>
  )
}
