
'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from '@/i18n/routing'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    console.log('Attempting login with:', { email, passwordLength: password.length })

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Login error details:', error)
        toast.error(`Login failed: ${error.message}`)
        return
      }

      console.log('Login successful:', data)
      toast.success('Login successful!')
      router.push({ pathname: '/dashboard' })
      router.refresh()
    } catch (error: any) {
      console.error('Unexpected error:', error)
      toast.error(`Unexpected error: ${error.message || error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async () => {
    setLoading(true)
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        })

        if (error) {
            console.error('Sign up error:', error)
            toast.error(error.message)
            return
        }
        
        if (data.session) {
            toast.success('Sign up successful! Logging in...')
            router.push({ pathname: '/dashboard' })
            router.refresh()
        } else {
            toast.success('Check your email for the confirmation link')
        }
    } catch (error) {
        console.error('Unexpected error:', error)
        toast.error('Something went wrong')
    } finally {
        setLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>HexaCore Admin</CardTitle>
          <CardDescription>Login to manage your agents</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
                <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Loading...' : 'Login'}
                </Button>
                <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={handleSignUp}>
                Sign Up
                </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
