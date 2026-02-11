import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { BookOpen, FileText, Zap, Upload, TrendingUp, Clock, Target, BarChart3, Award, Calendar, Activity } from "lucide-react"
import { cookies } from "next/headers"

interface DashboardStats {
  documents: {
    total: number
    completed: number
    processing: number
    errors: number
    totalFileSize: number
    completionRate: number
    recent: number
  }
  summaries: {
    total: number
    documentSummaries: number
    crossDocumentSummaries: number
    totalReadTime: number
    totalWordCount: number
    generationRate: number
    recent: number
  }
  flashcards: {
    total: number
    easy: number
    medium: number
    hard: number
    reviewed: number
    new: number
    totalReviews: number
    averageRating: number
    generationRate: number
    recent: number
  }
  learning: {
    currentStreak: number
    timeSaved: number
    totalActivity: number
    recentActivity: Array<{
      type: string
      title: string
      timestamp: string
      [key: string]: any
    }>
  }
  topDocuments: Array<{
    id: string
    name: string
    status: string
    summariesCount: number
    flashcardsCount: number
    uploadDate: string
    fileSize: number
  }>
  performance: {
    documentCompletionRate: number
    summaryGenerationRate: number
    flashcardGenerationRate: number
    overallEngagement: number
  }
}

async function fetchJSON<T>(url: string, cookieHeader?: string): Promise<T | null> {
  try {
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

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()
  const statsData = await fetchJSON<{ success: boolean; stats: DashboardStats }>("/api/dashboard/stats", cookieHeader)
  
  // Fallback to individual API calls if the stats endpoint fails
  let stats: DashboardStats | null = null
  
  if (statsData?.success && statsData.stats) {
    stats = statsData.stats
  } else {
    // Fallback: try to get basic data from individual endpoints
    try {
      const [docsData, sumsData, cardsData] = await Promise.all([
        fetchJSON<{ documents: any[] }>("/api/documents", cookieHeader),
        fetchJSON<{ summaries: any[] }>("/api/summaries", cookieHeader),
        fetchJSON<{ flashcards: any[] }>("/api/flashcards", cookieHeader),
      ])

      const documents = docsData?.documents || []
      const summaries = sumsData?.summaries || []
      const flashcards = cardsData?.flashcards || []

      // Create basic stats structure
      stats = {
        documents: {
          total: documents.length,
          completed: documents.filter(d => d.status === "completed").length,
          processing: documents.filter(d => d.status === "processing").length,
          errors: documents.filter(d => d.status === "error").length,
          totalFileSize: documents.reduce((sum, d) => sum + (d.fileSize || 0), 0),
          completionRate: documents.length > 0 ? Math.round((documents.filter(d => d.status === "completed").length / documents.length) * 100) : 0,
          recent: 0,
        },
        summaries: {
          total: summaries.length,
          documentSummaries: summaries.filter(s => s.type === "document").length,
          crossDocumentSummaries: summaries.filter(s => s.type === "cross-document").length,
          totalReadTime: summaries.reduce((sum, s) => sum + (s.readTime || 0), 0),
          totalWordCount: summaries.reduce((sum, s) => sum + (s.wordCount || 0), 0),
          generationRate: 0,
          recent: 0,
        },
        flashcards: {
          total: flashcards.length,
          easy: flashcards.filter(c => c.difficulty === "easy").length,
          medium: flashcards.filter(c => c.difficulty === "medium").length,
          hard: flashcards.filter(c => c.difficulty === "hard").length,
          reviewed: flashcards.filter(c => c.reviewCount > 0).length,
          new: flashcards.filter(c => c.reviewCount === 0).length,
          totalReviews: flashcards.reduce((sum, c) => sum + (c.reviewCount || 0), 0),
          averageRating: 0,
          generationRate: 0,
          recent: 0,
        },
        learning: {
          currentStreak: 0,
          timeSaved: summaries.reduce((sum, s) => sum + (s.readTime || 0), 0),
          totalActivity: 0,
          recentActivity: [],
        },
        topDocuments: [],
        performance: {
          documentCompletionRate: 0,
          summaryGenerationRate: 0,
          flashcardGenerationRate: 0,
          overallEngagement: 0,
        },
      }
    } catch (error) {
      console.error('Fallback data fetch failed:', error)
    }
  }
  
  if (!stats) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-balance">Dashboard Overview</h1>
          <p className="text-muted-foreground text-pretty">Unable to load dashboard statistics. Please try again later.</p>
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              This might be due to:
            </p>
            <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside">
              <li>Database connection issues</li>
              <li>Authentication problems</li>
              <li>API endpoint errors</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-balance">Dashboard Overview</h1>
        <p className="text-muted-foreground text-pretty">
          Your learning journey: {stats.documents.total} documents, {stats.summaries.total} summaries, {stats.flashcards.total} flashcards
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
            <div className="text-2xl font-bold">{stats.documents.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.documents.completed} completed • {formatFileSize(stats.documents.totalFileSize)}
            </p>
            <div className="mt-2">
              <Progress value={stats.documents.completionRate} className="h-1" />
              <p className="text-xs text-muted-foreground mt-1">{stats.documents.completionRate}% processed</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-gradient-to-br from-card/50 to-card/80 backdrop-blur-sm shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Summaries</CardTitle>
            <FileText className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.summaries.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.summaries.documentSummaries} document • {stats.summaries.crossDocumentSummaries} cross-doc
            </p>
            <div className="mt-2">
              <Progress value={stats.summaries.generationRate} className="h-1" />
              <p className="text-xs text-muted-foreground mt-1">{stats.summaries.generationRate}% generation rate</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-gradient-to-br from-card/50 to-card/80 backdrop-blur-sm shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flashcards</CardTitle>
            <Zap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.flashcards.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.flashcards.reviewed} reviewed • {stats.flashcards.new} new
            </p>
            <div className="mt-2">
              <Progress value={stats.flashcards.generationRate} className="h-1" />
              <p className="text-xs text-muted-foreground mt-1">{stats.flashcards.generationRate}% generation rate</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-gradient-to-br from-card/50 to-card/80 backdrop-blur-sm shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
            <Clock className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(stats.learning.timeSaved)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.summaries.totalWordCount.toLocaleString()} words processed
            </p>
            <div className="mt-2">
              <div className="flex items-center gap-1">
                <Award className="h-3 w-3 text-yellow-500" />
                <span className="text-xs text-muted-foreground">{stats.learning.currentStreak} day streak</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.learning.currentStreak}</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.performance.overallEngagement}%</p>
                <p className="text-xs text-muted-foreground">Engagement</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.flashcards.averageRating.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Avg Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{stats.learning.totalActivity}</p>
                <p className="text-xs text-muted-foreground">Active Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                {stats.documents.processing > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {stats.documents.processing} processing
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
                {stats.flashcards.new > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {stats.flashcards.new} new
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
            {stats.learning.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity yet. Try uploading a document.</p>
            ) : (
              stats.learning.recentActivity.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${
                    item.type === 'document' ? 'bg-primary' :
                    item.type === 'summary' ? 'bg-accent' :
                    'bg-muted-foreground'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Top Documents */}
        <Card className="border-border/50 bg-gradient-to-br from-card/50 to-card/80 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Documents
            </CardTitle>
            <CardDescription>Most productive documents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.topDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents yet. Upload your first document to get started.</p>
            ) : (
              stats.topDocuments.map((doc, idx) => (
                <div key={doc.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{doc.summariesCount} summaries</span>
                      <span>•</span>
                      <span>{doc.flashcardsCount} cards</span>
                    </div>
                  </div>
                  <Badge variant={doc.status === 'completed' ? 'default' : 'secondary'}>
                    {doc.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
