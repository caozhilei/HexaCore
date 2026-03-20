
import { DashboardNav } from '@/components/dashboard-nav'
import { createClient } from '@/lib/supabase/server'
import { redirect } from '@/i18n/routing'
import { UserNav } from '@/components/user-nav'

export default async function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect({ pathname: '/login' })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="flex h-16 items-center justify-between px-6 py-4">
          <div className="flex gap-6 md:gap-10">
            <span className="font-bold">HexaCore</span>
          </div>
          <div className="flex items-center gap-4">
             <UserNav email={user.email || 'User'} />
          </div>
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="hidden w-[240px] flex-col border-r bg-muted/10 md:flex">
          <div className="flex-1 overflow-auto py-6 px-4">
            <DashboardNav />
          </div>
        </aside>
        <main className="flex flex-1 flex-col overflow-hidden p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
