"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { User, Settings, CreditCard, Bell, Shield, Download, Trash2, Github, Mail } from "lucide-react"

export default function AccountPage() {
  // Profile state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("student")
  const [image, setImage] = useState<string | undefined>(undefined)

  // Split name helpers for UI
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  useEffect(() => {
    const parts = (name || "").trim().split(" ")
    setFirstName(parts[0] || "")
    setLastName(parts.slice(1).join(" ") || "")
  }, [name])
  const combinedName = useMemo(() => {
    return [firstName, lastName].filter(Boolean).join(" ")
  }, [firstName, lastName])

  // Settings state
  const [institution, setInstitution] = useState("")
  const [summaryLength, setSummaryLength] = useState("detailed")
  const [flashcardDifficulty, setFlashcardDifficulty] = useState("mixed")
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [weeklySummary, setWeeklySummary] = useState(true)
  const [documentComplete, setDocumentComplete] = useState(true)
  const [theme, setTheme] = useState("system")

  // Security state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPwd, setChangingPwd] = useState(false)

  // Load profile and settings
  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        const [pRes, sRes] = await Promise.all([
          fetch("/api/account/profile", { headers: { Accept: "application/json" } }),
          fetch("/api/account/settings", { headers: { Accept: "application/json" } }),
        ])
        if (pRes.ok) {
          const { user } = await pRes.json()
          if (mounted && user) {
            setName(user.name || "")
            setEmail(user.email || "")
            setRole(user.role || "student")
            setImage(user.image || undefined)
          }
        }
        if (sRes.ok) {
          const { settings } = await sRes.json()
          if (mounted && settings) {
            setSummaryLength(settings.summaryLength || "detailed")
            setFlashcardDifficulty(settings.flashcardDifficulty || "mixed")
            setEmailNotifications(!!settings.emailNotifications)
            setWeeklySummary(!!settings.weeklySummary)
            setDocumentComplete(!!settings.documentComplete)
            setTheme(settings.theme || "system")
            setInstitution(settings.institution || "")
          }
        }
      } catch (e) {
        console.error("Failed to load account data", e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      // Update profile
      const pRes = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name: combinedName, email, role, image }),
      })
      if (!pRes.ok) {
        const err = await pRes.json().catch(() => ({}))
        throw new Error(err?.error || "Failed to update profile")
      }
      // Update settings
      const sRes = await fetch("/api/account/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ summaryLength, flashcardDifficulty, emailNotifications, weeklySummary, documentComplete, theme, institution }),
      })
      if (!sRes.ok) {
        const err = await sRes.json().catch(() => ({}))
        throw new Error(err?.error || "Failed to update settings")
      }
      alert("Profile updated")
      setName(combinedName)
    } catch (e: any) {
      alert(e?.message || "Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    try {
      if (newPassword !== confirmPassword) {
        alert("New password and confirmation do not match")
        return
      }
      setChangingPwd(true)
      const res = await fetch("/api/account/security", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Failed to update password")
      alert("Password updated")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (e: any) {
      alert(e?.message || "Failed to update password")
    } finally {
      setChangingPwd(false)
    }
  }

  const handleExport = async () => {
    try {
      const res = await fetch("/api/account/export")
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || "Failed to export data")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `studymate-export-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      alert(e?.message || "Export failed")
    }
  }

  const handleDelete = async () => {
    try {
      if (!confirm("This will permanently delete your account and all data. Continue?")) return
      const res = await fetch("/api/account/delete", { method: "DELETE", headers: { "x-confirm-delete": "true" } })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Failed to delete account")
      alert("Account deleted. You will be signed out.")
      // Best-effort signout/redirect
      window.location.href = "/login"
    } catch (e: any) {
      alert(e?.message || "Delete failed")
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-balance">Account Settings</h1>
        <p className="text-muted-foreground text-pretty">Manage your profile, preferences, and subscription</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {/* Profile Information */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={image || "/student-avatar.png"} alt="Profile" />
                  <AvatarFallback className="text-lg">AJ</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button size="sm" disabled>Change Photo</Button>
                  <Button variant="outline" size="sm" className="bg-transparent" disabled>
                    Remove
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="bg-background/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="bg-background/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-background/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="researcher">Researcher</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="institution">Institution (Optional)</Label>
                <Input id="institution" value={institution} onChange={(e) => setInstitution(e.target.value)} className="bg-background/50" />
              </div>

              <Button onClick={handleSaveProfile} disabled={saving || loading}>{saving ? "Saving..." : "Save Changes"}</Button>
            </CardContent>
          </Card>

          {/* Connected Accounts */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Connected Accounts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border/50 rounded-lg bg-background/30">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Google</p>
                    <p className="text-sm text-muted-foreground">alex@university.edu</p>
                  </div>
                </div>
                <Badge className="bg-accent/20 text-accent-foreground">Connected</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border border-border/50 rounded-lg bg-background/30">
                <div className="flex items-center gap-3">
                  <Github className="h-5 w-5" />
                  <div>
                    <p className="font-medium">GitHub</p>
                    <p className="text-sm text-muted-foreground">Not connected</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="bg-transparent">
                  Connect
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          {/* Notifications */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive updates about your study progress</p>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Weekly Study Summary</p>
                  <p className="text-sm text-muted-foreground">Get a weekly report of your learning activity</p>
                </div>
                <Switch checked={weeklySummary} onCheckedChange={setWeeklySummary} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Document Processing Complete</p>
                  <p className="text-sm text-muted-foreground">Notify when document ingestion finishes</p>
                </div>
                <Switch checked={documentComplete} onCheckedChange={setDocumentComplete} />
              </div>
            </CardContent>
          </Card>

          {/* Study Preferences */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Study Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default Summary Length</Label>
                <Select value={summaryLength} onValueChange={setSummaryLength}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brief">Brief</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                    <SelectItem value="comprehensive">Comprehensive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Flashcard Difficulty</Label>
                <Select value={flashcardDifficulty} onValueChange={setFlashcardDifficulty}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">Use dark theme across the application</p>
                </div>
                <Switch checked={theme === "dark"} onCheckedChange={(v) => setTheme(v ? "dark" : "light")} />
              </div>
              <div>
                <Button onClick={handleSaveProfile} disabled={saving || loading}>{saving ? "Saving..." : "Save Preferences"}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          {/* Current Plan */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Free Plan</h3>
                  <p className="text-sm text-muted-foreground">Perfect for getting started</p>
                </div>
                <Badge variant="outline" className="bg-transparent">
                  Current
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Documents</p>
                  <p className="font-medium">5 / 10</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Questions</p>
                  <p className="font-medium">89 / 100</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Flashcards</p>
                  <p className="font-medium">156 / 200</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Storage</p>
                  <p className="font-medium">2.1 GB / 5 GB</p>
                </div>
              </div>
              <Button className="w-full">Upgrade to Pro</Button>
            </CardContent>
          </Card>

          {/* Usage Statistics */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Usage This Month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>API Calls</span>
                  <span>1,234 / 2,000</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: "62%" }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Storage Used</span>
                  <span>2.1 GB / 5 GB</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-accent h-2 rounded-full" style={{ width: "42%" }}></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          {/* Password */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-background/50" />
              </div>
              <Button onClick={handleChangePassword} disabled={changingPwd}>{changingPwd ? "Updating..." : "Update Password"}</Button>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Export Data</p>
                  <p className="text-sm text-muted-foreground">Download all your data in JSON format</p>
                </div>
                <Button variant="outline" className="gap-2 bg-transparent" onClick={handleExport}>
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-destructive">Delete Account</p>
                  <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                </div>
                <Button variant="destructive" className="gap-2" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
