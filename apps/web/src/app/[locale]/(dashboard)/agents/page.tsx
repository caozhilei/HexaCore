
'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from 'next-intl'

interface Agent {
  id: string
  name: string
  description: string
  config: any
  created_at: string
}

export default function AgentsPage() {
  const t = useTranslations('Dashboard')
  const common = useTranslations('Common')
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadAgents() {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading agents:', error)
      } else {
        if (data) setAgents(data)
      }
      
      setLoading(false)
    }

    loadAgents()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('agents')}</h2>
          <p className="text-muted-foreground">{t('agentsDesc')}</p>
        </div>
        <Link href="/agents/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('createAgent')}
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse h-[200px] bg-muted/50" />
            ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="truncate">{agent.name}</CardTitle>
                    <Badge variant="outline">{agent.config?.model || 'Unknown'}</Badge>
                </div>
                <CardDescription className="line-clamp-2 h-[40px]">{agent.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end gap-2">
                    <Link href={`/agents/${agent.id}`}>
                        <Button variant="outline" size="sm">{common('edit')}</Button>
                    </Link>
                    <Link href={`/agents/${agent.id}/chat`}>
                        <Button size="sm">{t('chat')}</Button>
                    </Link>
                </div>
              </CardContent>
            </Card>
          ))}
          {agents.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-12 border border-dashed rounded-lg bg-gray-50/50">
                <p className="text-muted-foreground mb-4">{t('noAgents')}</p>
                <Link href="/agents/new">
                    <Button variant="outline">{t('createFirstAgent')}</Button>
                </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
