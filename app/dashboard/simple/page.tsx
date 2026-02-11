import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { BookOpen, FileText, Zap, Upload, TrendingUp, Clock, Target, BarChart3, Award, Calendar, Activity } from "lucide-react"
import { cookies } from "next/headers"

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const cookieHeader = cookies().toString()
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`
    
    const res = await fetch(fullUrl, { 
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      }
    })
    
    if (!res.ok) {
      console.error(`API call failed: ${res.status} ${res.statusText}`)
      return null
    }
    
    const ct = res.headers.get("content-type") || ""
    if (ct.includes("application/json")) {
      const data = await res.json()
      return data as T
    }
    return null
  } catch (error) {
    console.error('Fetch error:', error)
    return null
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

export default async function SimpleDashboardPage() {
  // Try to get basic data from individual endpoints
  const [docsData, sumsData, cardsData] = await Promise.all([
    fetchJSON<{ documents: any[] }>("/api/documents"),
    fetchJSON<{ summaries: any[] }>("/api/summaries"),
    fetchJSON<{ flashcards: any[] }>("/api/flashcards"),
  ])

  const documents = docsData?.documents || []
  const summaries = sumsData?.summaries || []
  const flashcards = cardsData?.flashcards || []

  const documentsCount = documents.length
  const summariesCount = summaries.length
  const flashcardsCount = flashcards.length
  const completedDocuments = documents.filter(d => d.status === "completed").length
  const timeSavedMinutes = summaries.reduce((acc, s) => acc + (Number(s.readTime) || 0), 0)

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-balance">Dashboard Overview (Simple)</h1>
        <p className="text-muted-foreground text-pretty">
          Your learning journey: {documentsCount} documents, {summariesCount} summaries, {flashcardsCount} flashcards
        </p>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-border/50 bg-gradient-to-br from-card/50 to-card/80 backdrop-blur-sm shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentsCount}</div>
            <p className="text-xs text-muted-foreground">
              {completedDocuments} completed • {formatFileSize(documents.reduce((sum, d) => sum + (d.fileSize || 0), 0))}
            </p>
            <div className="mt-2">
              <Progress value={documentsCount > 0 ? (completedDocuments / documentsCount) * 100 : 0} className="h-1" />
              <p className="text-xs text-muted-foreground mt-1">
                {documentsCount > 0 ? Math.round((completedDocuments / documentsCount) * 100) : 0}% processed
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-gradient-to-br from-card/50 to-card/80 backdrop-blur-sm shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Summaries</CardTitle>
            <FileText className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summariesCount}</div>
            <p className="text-xs text-muted-foreground">
              {summaries.filter(s => s.type === "document").length} document • {summaries.filter(s => s.type === "cross-document").length} cross-doc
            </p>
            <div className="mt-2">
              <Progress value={Math.min(summariesCount * 10, 100)} className="h-1" />
              <p className="text-xs text-muted-foreground mt-1">AI-generated summaries</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-gradient-to-br from-card/50 to-card/80 backdrop-blur-sm shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flashcards</CardTitle>
            <Zap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{flashcardsCount}</div>
            <p className="text-xs text-muted-foreground">
              {flashcards.filter(c => c.reviewCount > 0).length} reviewed • {flashcards.filter(c => c.reviewCount === 0).length} new
            </p>
            <div className="mt-2">
              <Progress value={Math.min(flashcardsCount * 5, 100)} className="h-1" />
              <p className="text-xs text-muted-foreground mt-1">Total cards created</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-gradient-to-br from-card/50 to-card/80 backdrop-blur-sm shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
            <Clock className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(timeSavedMinutes)}</div>
            <p className="text-xs text-muted-foreground">
              {summaries.reduce((sum, s) => sum + (s.wordCount || 0), 0).toLocaleString()} words processed
            </p>
            <div className="mt-2">
              <div className="flex items-center gap-1">
                <Award className="h-3 w-3 text-yellow-500" />
                <span className="text-xs text-muted-foreground">Learning progress</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-border/50 bg-gradient-to-br from-card/50 to-card/80 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>Get started with your learning</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full justify-start gap-2" size="sm" asChild>
            <a href="/dashboard/documents">
              <Upload className="h-4 w-4" /> 
              Upload New Document
              {documents.filter(d => d.status === "processing").length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {documents.filter(d => d.status === "processing").length} processing
                </Badge>
              )}
            </a>
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2 bg-transparent" size="sm" asChild>
            <a href="/dashboard/chat">
              <FileText className="h-4 w-4" />
              Chat with AI
            </a>
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2 bg-transparent" size="sm" asChild>
            <a href="/dashboard/flashcards">
              <Zap className="h-4 w-4" /> 
              Generate Flashcards
              {flashcards.filter(c => c.reviewCount === 0).length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {flashcards.filter(c => c.reviewCount === 0).length} new
                </Badge>
              )}
            </a>
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2 bg-transparent" size="sm" asChild>
            <a href="/dashboard/summaries">
              <FileText className="h-4 w-4" />
              View Summaries
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="border-border/50 bg-gradient-to-br from-card/50 to-card/80 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Your latest learning activities</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {documents.length === 0 && summaries.length === 0 && flashcards.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity yet. Try uploading a document.</p>
          ) : (
            <>
              {documents.slice(0, 3).map((doc, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="h-2 w-2 bg-primary rounded-full" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Uploaded {doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(doc.uploadDate).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={doc.status === 'completed' ? 'default' : 'secondary'}>
                    {doc.status}
                  </Badge>
                </div>
              ))}
              {summaries.slice(0, 3).map((sum, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="h-2 w-2 bg-accent rounded-full" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Generated {sum.type} summary</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(sum.generatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
