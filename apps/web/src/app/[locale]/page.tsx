
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Github, 
  Brain, 
  Signpost, 
  ShieldCheck, 
  ArrowRight,
  Terminal,
  Cpu
} from "lucide-react";

export default function Home() {
  const t = useTranslations("HomePage");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
              <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg">
                <Cpu className="h-5 w-5" />
              </div>
              <span className="hidden font-bold sm:inline-block text-lg tracking-tight">
                HexaCore
              </span>
            </Link>
            <nav className="ml-6 hidden md:flex items-center gap-6 text-sm font-medium">
              <Link
                className="transition-colors hover:text-foreground/80 text-foreground/60"
                href="/docs"
              >
                {t("navDocs")}
              </Link>
              <Link
                className="transition-colors hover:text-foreground/80 text-foreground/60"
                href="/blog"
              >
                {t("navBlog")}
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <nav className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">{t("login")}</Button>
              </Link>
              <Link href="/login">
                <Button size="sm" className="hidden sm:flex">
                  {t("getStarted")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-16 md:pt-20 lg:pt-32 pb-16 md:pb-24">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
          <div className="container flex flex-col items-center text-center gap-8">
            <div className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
              v3.0 is now available
            </div>
            
            <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl max-w-4xl">
              {t("title")}
            </h1>
            
            <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
              {t("description")}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mt-4">
              <Link href="/login" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto text-base h-12 px-8">
                  {t("getStarted")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="https://github.com/your-repo/hexacore" target="_blank" rel="noreferrer" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-base h-12 px-8">
                  <Github className="mr-2 h-4 w-4" />
                  {t("github")}
                </Button>
              </Link>
            </div>

            {/* Terminal Preview Mockup */}
            <div className="mt-16 w-full max-w-4xl rounded-xl border bg-card shadow-2xl overflow-hidden hidden md:block">
              <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                  <div className="h-3 w-3 rounded-full bg-green-500/80" />
                </div>
                <div className="ml-2 text-xs text-muted-foreground font-mono">hexacore-cli — agent start</div>
              </div>
              <div className="p-6 font-mono text-sm text-left">
                <div className="flex gap-2 text-muted-foreground">
                  <span className="text-green-500">$</span>
                  <span>hexacore agent create --name "Support Bot" --model "deepseek-v3"</span>
                </div>
                <div className="mt-2 text-foreground">
                  <span className="text-blue-500">✔</span> Agent "Support Bot" created successfully.<br/>
                  <span className="text-blue-500">✔</span> Sandbox environment initialized.<br/>
                  <span className="text-blue-500">✔</span> Connected to Routing Engine (Priority: 10).<br/>
                  <br/>
                  <span className="text-green-500">Ready to accept connections on port 3000...</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container py-16 md:py-24 lg:py-32 space-y-12">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="font-heading text-3xl font-bold leading-[1.1] sm:text-4xl md:text-5xl">
              {t("featuresTitle")}
            </h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              {t("featuresDesc")}
            </p>
          </div>

          <div className="mx-auto grid justify-center gap-6 sm:grid-cols-2 md:max-w-[64rem] lg:grid-cols-3">
            {/* Feature 1 */}
            <Card className="bg-background border-muted hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{t("feature1Title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {t("feature1Desc")}
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="bg-background border-muted hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Signpost className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{t("feature2Title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {t("feature2Desc")}
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="bg-background border-muted hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{t("feature3Title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {t("feature3Desc")}
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t bg-muted/40">
          <div className="container py-16 md:py-24 lg:py-32 flex flex-col items-center text-center gap-6">
            <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to build your first agent?
            </h2>
            <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl">
              Join thousands of developers building the next generation of AI applications with HexaCore.
            </p>
            <Link href="/login">
              <Button size="lg" className="h-12 px-8">
                {t("getStarted")}
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="container py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded">
                  <Cpu className="h-4 w-4" />
                </div>
                <span className="font-bold text-lg">HexaCore</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The enterprise platform for AI agents orchestration and management.
              </p>
            </div>
            
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold">Product</h3>
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Features</Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Integrations</Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Pricing</Link>
            </div>
            
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold">Resources</h3>
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Documentation</Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">API Reference</Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Blog</Link>
            </div>
            
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold">Company</h3>
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">About</Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Careers</Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Contact</Link>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-center text-sm text-muted-foreground md:text-left">
              &copy; {new Date().getFullYear()} HexaCore Inc. All rights reserved.
            </p>
            <div className="flex gap-4">
              <Link href="#" className="text-muted-foreground hover:text-foreground">
                <Github className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
