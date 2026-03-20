
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export default function SettingsPage() {
  const t = useTranslations('Dashboard');
  const common = useTranslations('Common');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('settings')}</h2>
        <p className="text-muted-foreground">{t('settingsDesc')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>Platform configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platform-name">Platform Name</Label>
              <Input id="platform-name" defaultValue="HexaCore" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Admin Email</Label>
              <Input id="admin-email" defaultValue="admin@hexacore.ai" />
            </div>
            <Button>{common('save')}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>LLM Providers</CardTitle>
            <CardDescription>API Keys and endpoints</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openai-key">OpenAI API Key</Label>
              <Input id="openai-key" type="password" value="sk-..." readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deepseek-key">DeepSeek API Key</Label>
              <Input id="deepseek-key" type="password" value="sk-..." readOnly />
            </div>
            <Button variant="outline">{common('edit')}</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
