"use client"

import { useState, useEffect } from "react"
import { Eye, EyeOff, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import toast from "react-hot-toast"

interface SettingsData {
  email: string
  name: string | null
  settings: {
    gmailUser: string | null
    gmailAppPass: string | null
    geminiKey: string | null
    fromName: string | null
    fromEmail: string | null
    hasGeminiKey: boolean
    hasGmailPass: boolean
  } | null
}

export default function SettingsPageClient() {
  const [data, setData] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [showGmailPass, setShowGmailPass] = useState(false)
  const [showGeminiKey, setShowGeminiKey] = useState(false)

  const [profile, setProfile] = useState({
    name: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [apiKeys, setApiKeys] = useState({
    gmailUser: "",
    gmailAppPass: "",
    geminiKey: "",
    fromName: "",
    fromEmail: "",
  })

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((res: { success: boolean; data: SettingsData }) => {
        if (res.success) {
          setData(res.data)
          setProfile((p) => ({ ...p, name: res.data.name ?? "" }))
          setApiKeys({
            gmailUser: res.data.settings?.gmailUser ?? "",
            gmailAppPass: res.data.settings?.hasGmailPass ? "••••••••" : "",
            geminiKey: res.data.settings?.hasGeminiKey
              ? (res.data.settings.geminiKey ?? "••••••••")
              : "",
            fromName: res.data.settings?.fromName ?? "",
            fromEmail: res.data.settings?.fromEmail ?? "",
          })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function saveProfile() {
    if (profile.newPassword && profile.newPassword !== profile.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    setSaving(true)
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: profile.name,
        currentPassword: profile.currentPassword || undefined,
        newPassword: profile.newPassword || undefined,
      }),
    })
    const result = (await res.json()) as { success: boolean; error?: string }
    setSaving(false)
    if (result.success) {
      toast.success("Profile updated")
      setProfile((p) => ({
        ...p,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }))
    } else {
      toast.error(result.error ?? "Failed to update profile")
    }
  }

  async function saveApiKeys() {
    setSaving(true)
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(apiKeys),
    })
    const result = (await res.json()) as { success: boolean; error?: string }
    setSaving(false)
    if (result.success) toast.success("Settings saved")
    else toast.error(result.error ?? "Failed to save settings")
  }

  async function testGmail() {
    setTesting(true)
    setTestResult(null)
    const res = await fetch("/api/settings/test-gmail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gmailUser: apiKeys.gmailUser,
        gmailAppPass: apiKeys.gmailAppPass,
      }),
    })
    const result = (await res.json()) as {
      success: boolean
      data: { success: boolean; error?: string }
    }
    setTesting(false)
    if (result.success) setTestResult(result.data)
    else setTestResult({ success: false, error: "Test failed" })
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading settings...</div>
  }

  return (
    <div className="space-y-5 pb-4 sm:space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile and integrations
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
      <Card className="app-surface">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={data?.email ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Current Password</Label>
            <Input
              type="password"
              value={profile.currentPassword}
              onChange={(e) =>
                setProfile((p) => ({ ...p, currentPassword: e.target.value }))
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={profile.newPassword}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, newPassword: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={profile.confirmPassword}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, confirmPassword: e.target.value }))
                }
              />
            </div>
          </div>
            <Button
            onClick={saveProfile}
            disabled={saving}
          >
            Save Profile
          </Button>
        </CardContent>
      </Card>

      <Card className="app-surface">
        <CardHeader>
          <CardTitle>API Keys & Gmail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Gmail Address</Label>
            <Input
              type="email"
              value={apiKeys.gmailUser}
              onChange={(e) =>
                setApiKeys((p) => ({ ...p, gmailUser: e.target.value }))
              }
              placeholder="your.email@gmail.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Gmail App Password</Label>
            <div className="relative">
              <Input
                type={showGmailPass ? "text" : "password"}
                value={apiKeys.gmailAppPass}
                onChange={(e) =>
                  setApiKeys((p) => ({ ...p, gmailAppPass: e.target.value }))
                }
                placeholder="xxxx xxxx xxxx xxxx"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setShowGmailPass(!showGmailPass)}
              >
                {showGmailPass ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <Button variant="outline" onClick={testGmail} disabled={testing}>
            {testing ? "Testing..." : "Test Connection"}
          </Button>
          {testResult && (
            <Alert variant={testResult.success ? "default" : "destructive"}>
              {testResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {testResult.success
                  ? "Gmail connection successful!"
                  : testResult.error ?? "Connection failed"}
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label>Gemini API Key</Label>
            <p className="text-xs text-muted-foreground">
              Get a free key at{" "}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                aistudio.google.com/apikey
              </a>
            </p>
            <div className="relative">
              <Input
                type={showGeminiKey ? "text" : "password"}
                value={apiKeys.geminiKey}
                onChange={(e) =>
                  setApiKeys((p) => ({ ...p, geminiKey: e.target.value }))
                }
                placeholder="AIza..."
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setShowGeminiKey(!showGeminiKey)}
              >
                {showGeminiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
            <Button
            onClick={saveApiKeys}
            disabled={saving}
          >
            Save API Keys
          </Button>
        </CardContent>
      </Card>

      <Card className="app-surface">
        <CardHeader>
          <CardTitle>Email Defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default From Name</Label>
            <Input
              value={apiKeys.fromName}
              onChange={(e) =>
                setApiKeys((p) => ({ ...p, fromName: e.target.value }))
              }
              placeholder="Alex Johnson"
            />
          </div>
          <div className="space-y-2">
            <Label>Default From Email</Label>
            <Input
              type="email"
              value={apiKeys.fromEmail}
              onChange={(e) =>
                setApiKeys((p) => ({ ...p, fromEmail: e.target.value }))
              }
              placeholder="your.email@gmail.com"
            />
          </div>
            <Button
            onClick={saveApiKeys}
            disabled={saving}
          >
            Save Defaults
          </Button>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
