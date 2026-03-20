
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function ChannelsPage() {
  const t = useTranslations('Dashboard');
  const common = useTranslations('Common');

  const sessions = [
    { id: 'sess_123abc', peer: 'User-A', agent: 'Support-Bot', lastActive: '2 min ago', platform: 'Web' },
    { id: 'sess_456def', peer: 'User-B', agent: 'General-Assistant', lastActive: '5 min ago', platform: 'Web' },
    { id: 'sess_789ghi', peer: 'User-C', agent: 'Support-Bot', lastActive: '1 hour ago', platform: 'CLI' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('channels')}</h2>
        <p className="text-muted-foreground">{t('channelsDesc')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Real-time view of ongoing conversations</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session ID</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>User (Peer)</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>{common('status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium font-mono text-xs">{session.id}</TableCell>
                  <TableCell>{session.platform}</TableCell>
                  <TableCell>{session.peer}</TableCell>
                  <TableCell>{session.agent}</TableCell>
                  <TableCell>{session.lastActive}</TableCell>
                  <TableCell>
                    <Badge variant="default">{common('active')}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
