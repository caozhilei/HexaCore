
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function EntryPointsPage() {
  const t = useTranslations('Dashboard');
  const common = useTranslations('Common');

  const adapters = [
    { id: 'web-adapter', type: 'WebSocket', status: 'active', port: 3001, protocol: 'ws/wss' },
    { id: 'api-adapter', type: 'REST API', status: 'active', port: 3000, protocol: 'http/https' },
    { id: 'cli-adapter', type: 'CLI', status: 'inactive', port: '-', protocol: 'stdio' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('entryPoints')}</h2>
        <p className="text-muted-foreground">{t('entryPointsDesc')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Adapters</CardTitle>
          <CardDescription>Manage inbound communication channels</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{common('name')}</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Protocol</TableHead>
                <TableHead>Port</TableHead>
                <TableHead>{common('status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adapters.map((adapter) => (
                <TableRow key={adapter.id}>
                  <TableCell className="font-medium">{adapter.id}</TableCell>
                  <TableCell>{adapter.type}</TableCell>
                  <TableCell>{adapter.protocol}</TableCell>
                  <TableCell>{adapter.port}</TableCell>
                  <TableCell>
                    <Badge variant={adapter.status === 'active' ? 'default' : 'secondary'}>
                      {common(adapter.status)}
                    </Badge>
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
