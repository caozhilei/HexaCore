
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function RoutingPage() {
  const t = useTranslations('Dashboard');
  const common = useTranslations('Common');

  const rules = [
    { id: 1, priority: 100, matcher: 'PeerID', target: 'Agent-001', condition: 'User-VIP' },
    { id: 2, priority: 50, matcher: 'Content', target: 'Support-Bot', condition: 'contains("help")' },
    { id: 3, priority: 0, matcher: 'Default', target: 'General-Assistant', condition: '*' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('routing')}</h2>
        <p className="text-muted-foreground">{t('routingDesc')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Routing Rules</CardTitle>
          <CardDescription>Configure how messages are dispatched to agents</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Priority</TableHead>
                <TableHead>Matcher Type</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Target Agent</TableHead>
                <TableHead>{common('status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.priority}</TableCell>
                  <TableCell>{rule.matcher}</TableCell>
                  <TableCell><code>{rule.condition}</code></TableCell>
                  <TableCell>{rule.target}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{common('active')}</Badge>
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
