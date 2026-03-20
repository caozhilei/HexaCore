
import { getTranslations } from 'next-intl/server'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Bot, 
  Network, 
  Route, 
  MessageSquare, 
  Cpu, 
  Database, 
  Box,
  Activity
} from "lucide-react"
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getDashboardCounts(userId: string) {
  const admin = createAdminClient()

  const { data: agents, error: agentsError } = await admin.from('agents').select('id').eq('owner_id', userId)
  if (agentsError) throw agentsError

  const agentIds = (agents || []).map((a: any) => a.id)
  const agentsCount = agentIds.length

  let sessionsCount = 0
  let memoriesCount = 0

  if (agentIds.length > 0) {
    const { data: sessions, count: sessionsExact, error: sessionsError } = await admin
      .from('chat_sessions')
      .select('session_key', { count: 'exact' })
      .in('agent_id', agentIds)

    if (sessionsError) throw sessionsError
    sessionsCount = sessionsExact ?? 0

    const sessionKeys = (sessions || []).map((s: any) => s.session_key).filter(Boolean)
    if (sessionKeys.length > 0) {
      const { count: memoriesExact, error: memoriesError } = await admin
        .from('memories')
        .select('id', { count: 'exact', head: true })
        .in('session_key', sessionKeys)

      if (memoriesError) throw memoriesError
      memoriesCount = memoriesExact ?? 0
    }
  }

  const { count: enabledSkillsExact, error: skillsError } = await admin
    .from('skills')
    .select('id', { count: 'exact', head: true })
    .eq('enabled', true)

  if (skillsError) throw skillsError

  return {
    agentsCount,
    sessionsCount,
    enabledSkillsCount: enabledSkillsExact ?? 0,
    memoriesCount,
  }
}

export default async function DashboardPage() {
  const t = await getTranslations('Dashboard')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let agentsCount = 0
  let sessionsCount = 0
  let enabledSkillsCount = 0
  let memoriesCount = 0

  if (user?.id) {
    try {
      const counts = await getDashboardCounts(user.id)
      agentsCount = counts.agentsCount
      sessionsCount = counts.sessionsCount
      enabledSkillsCount = counts.enabledSkillsCount
      memoriesCount = counts.memoriesCount
    } catch {
      agentsCount = 0
      sessionsCount = 0
      enabledSkillsCount = 0
      memoriesCount = 0
    }
  }

  const stats = [
    { title: t('agents'), value: String(agentsCount), icon: Bot, description: "My Agents" },
    { title: t('channels'), value: String(sessionsCount), icon: MessageSquare, description: "My Sessions" },
    { title: t('skills'), value: String(enabledSkillsCount), icon: Cpu, description: "Enabled Skills" },
    { title: t('memory'), value: String(memoriesCount), icon: Database, description: "Memory Entries" },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('welcome')}</h2>
        <p className="text-muted-foreground">Here's an overview of your HexaCore platform.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">New session started</p>
                  <p className="text-sm text-muted-foreground">User-A connected via Web</p>
                </div>
                <div className="ml-auto font-medium">Just now</div>
              </div>
              <div className="flex items-center">
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">Agent "Support-Bot" updated</p>
                  <p className="text-sm text-muted-foreground">System prompt modified</p>
                </div>
                <div className="ml-auto font-medium">2m ago</div>
              </div>
              <div className="flex items-center">
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">Routing rule added</p>
                  <p className="text-sm text-muted-foreground">Priority 100 for VIP users</p>
                </div>
                <div className="ml-auto font-medium">1h ago</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Network className="h-4 w-4 text-green-500" />
                    <span>Entry Points</span>
                </div>
                <span className="text-sm text-green-500">Operational</span>
             </div>
             <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Route className="h-4 w-4 text-green-500" />
                    <span>Routing Engine</span>
                </div>
                <span className="text-sm text-green-500">Operational</span>
             </div>
             <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Database className="h-4 w-4 text-yellow-500" />
                    <span>Vector DB</span>
                </div>
                <span className="text-sm text-yellow-500">Degraded</span>
             </div>
             <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Box className="h-4 w-4 text-green-500" />
                    <span>Sandbox</span>
                </div>
                <span className="text-sm text-green-500">Operational</span>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
