
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export default function MemoryPage() {
  const t = useTranslations('Dashboard');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('memory')}</h2>
        <p className="text-muted-foreground">{t('memoryDesc')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Storage Usage</CardTitle>
            <CardDescription>Vector Database (pgvector)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Documents Indexed</span>
                  <span className="font-medium">1,240</span>
                </div>
                <Progress value={33} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Storage Quota</span>
                  <span className="font-medium">33% (3.3GB / 10GB)</span>
                </div>
                <Progress value={33} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Memories</CardTitle>
            <CardDescription>Latest stored interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="truncate w-3/4">User asked about pricing for enterprise plan...</span>
                <span className="text-muted-foreground">2m ago</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="truncate w-3/4">Summarized project meeting notes...</span>
                <span className="text-muted-foreground">15m ago</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="truncate w-3/4">Debugged python script error...</span>
                <span className="text-muted-foreground">1h ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
