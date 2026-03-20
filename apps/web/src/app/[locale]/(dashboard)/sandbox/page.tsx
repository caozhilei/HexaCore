
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export default function SandboxPage() {
  const t = useTranslations('Dashboard');
  const common = useTranslations('Common');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('sandbox')}</h2>
        <p className="text-muted-foreground">{t('sandboxDesc')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Network Isolation</CardTitle>
            <CardDescription>Control outbound traffic</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="allow-internet">Allow Internet Access</Label>
              <Switch id="allow-internet" defaultChecked />
            </div>
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="allow-lan">Allow LAN Access</Label>
              <Switch id="allow-lan" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resource Limits</CardTitle>
            <CardDescription>Container resource quotas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex justify-between items-center">
                <span className="text-sm font-medium">CPU Cores</span>
                <span className="text-sm">2.0</span>
             </div>
             <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Memory</span>
                <span className="text-sm">4 GB</span>
             </div>
             <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Execution Timeout</span>
                <span className="text-sm">60s</span>
             </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security Policy</CardTitle>
            <CardDescription>Runtime security rules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="fs-write">Allow File System Write</Label>
              <Switch id="fs-write" defaultChecked />
            </div>
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="env-vars">Inject Environment Variables</Label>
              <Switch id="env-vars" defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
