"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { FileText, Search, Download, RefreshCw, Clock, BookOpen, Zap, Plus, Trash2, Edit } from "lucide-react"
import { useSession } from "next-auth/react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical } from "lucide-react"

interface Document {
  _id: string
  name: string
  status: string
}

interface Summary {
  _id: string
  title: string
  content: string
  documentId: string
  type: "document" | "cross-document"
  length: "brief" | "detailed" | "comprehensive"
  wordCount: number
  readTime: number
  generatedAt: string
  relatedDocumentIds?: string[]
}

export default function SummariesPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLength, setSelectedLength] = useState<"brief" | "detailed" | "comprehensive">("detailed")
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const { data: session } = useSession()

  const fetchDocuments = async () => {
    if (!session?.user?.id) return
    
    try {
      const response = await fetch("/api/documents", { headers: { Accept: "application/json" } })
      let data: any = null
      const contentType = response.headers.get("content-type") || ""
      if (contentType.includes("application/json")) {
        try { data = await response.json() } catch { data = null }
      } else {
        const text = await response.text()
        console.error("Non-JSON response while fetching documents:", text)
      }
      
      if (response.ok) {
        setDocuments((data?.documents) || [])
      }
    } catch (error) {
      console.error("Error fetching documents:", error)
    }
  }

  const fetchSummaries = async () => {
    if (!session?.user?.id) return
    
    try {
      setLoading(true)
      const response = await fetch("/api/summaries", { headers: { Accept: "application/json" } })
      let data: any = null
      const contentType = response.headers.get("content-type") || ""
      if (contentType.includes("application/json")) {
        try { data = await response.json() } catch { data = null }
      } else {
        const text = await response.text()
        console.error("Non-JSON response while fetching summaries:", text)
      }
      
      if (response.ok) {
        setSummaries((data?.summaries) || [])
      }
    } catch (error) {
      console.error("Error fetching summaries:", error)
    } finally {
      setLoading(false)
    }
  }

  const generateSummary = async (documentId: string) => {
    try {
      setGenerating(true)
      const response = await fetch("/api/summaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          documentId,
          length: selectedLength,
          type: "document"
        }),
      })
      let data: any = null
      const contentType = response.headers.get("content-type") || ""
      if (contentType.includes("application/json")) {
        try { data = await response.json() } catch { data = null }
      } else {
        const text = await response.text()
        console.error("Non-JSON response after generateSummary:", text)
      }
      
      if (response.ok) {
        await fetchSummaries()
        alert(`Summary generated successfully!`)
      } else {
        alert(`Failed to generate summary: ${data?.error || response.statusText}`)
      }
    } catch (error) {
      console.error("Error generating summary:", error)
      alert("Failed to generate summary")
    } finally {
      setGenerating(false)
    }
  }

  const generateCrossDocumentSummary = async () => {
    if (selectedDocuments.length < 2) {
      alert("Please select at least 2 documents for cross-document analysis")
      return
    }

    try {
      setGenerating(true)
      const response = await fetch("/api/summaries", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          documentIds: selectedDocuments,
          length: selectedLength,
          type: "cross-document"
        }),
      })
      let data: any = null
      const contentType = response.headers.get("content-type") || ""
      if (contentType.includes("application/json")) {
        try { data = await response.json() } catch { data = null }
      } else {
        const text = await response.text()
        console.error("Non-JSON response after generateCrossDocumentSummary:", text)
      }
      
      if (response.ok) {
        await fetchSummaries()
        setSelectedDocuments([])
        alert(`Cross-document summary generated successfully!`)
      } else {
        alert(`Failed to generate cross-document summary: ${data?.error || response.statusText}`)
      }
    } catch (error) {
      console.error("Error generating cross-document summary:", error)
      alert("Failed to generate cross-document summary")
    } finally {
      setGenerating(false)
    }
  }

  const deleteSummary = async (summaryId: string) => {
    try {
      const response = await fetch(`/api/summaries?id=${summaryId}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      })
      
      if (response.ok) {
        await fetchSummaries()
      } else {
        let data: any = null
        const contentType = response.headers.get("content-type") || ""
        if (contentType.includes("application/json")) {
          try { data = await response.json() } catch { /* ignore */ }
        }
        alert(`Failed to delete summary: ${data?.error || response.statusText}`)
      }
    } catch (error) {
      console.error("Error deleting summary:", error)
      alert("Failed to delete summary")
    }
  }

  useEffect(() => {
    fetchDocuments()
    fetchSummaries()
  }, [session])

  const filteredSummaries = summaries.filter(summary =>
    summary.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    summary.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const documentSummaries = filteredSummaries.filter(s => s.type === "document")
  const crossDocumentSummaries = filteredSummaries.filter(s => s.type === "cross-document")

  const totalSummaries = summaries.length
  const totalDocuments = documents.filter(d => d.status === "completed").length
  const totalCrossDocument = crossDocumentSummaries.length
  const totalTimeSaved = summaries.reduce((acc, s) => acc + s.readTime, 0)

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-balance">AI Summaries</h1>
        <p className="text-muted-foreground text-pretty">
          AI-generated summaries of your documents and cross-document insights using Gemini AI
        </p>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All Summaries</TabsTrigger>
            <TabsTrigger value="document">Document</TabsTrigger>
            <TabsTrigger value="cross-document">Cross-Document</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search summaries..." 
                className="pl-10 w-64 bg-background/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedLength} onValueChange={(value: any) => setSelectedLength(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brief">Brief</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
                <SelectItem value="comprehensive">Comprehensive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="all" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{totalSummaries}</p>
                    <p className="text-xs text-muted-foreground">Total Summaries</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-accent" />
                  <div>
                    <p className="text-2xl font-bold">{totalDocuments}</p>
                    <p className="text-xs text-muted-foreground">Documents</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{totalCrossDocument}</p>
                    <p className="text-xs text-muted-foreground">Cross-Document</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-accent" />
                  <div>
                    <p className="text-2xl font-bold">{totalTimeSaved}m</p>
                    <p className="text-xs text-muted-foreground">Time Saved</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Available Documents */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Generate Summaries</h3>
            {loading ? (
              <Card className="border-border/50 bg-card/50">
                <CardContent className="py-12 text-center">
                  <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto mb-4 animate-spin" />
                  <p className="text-muted-foreground">Loading documents...</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {documents.filter(doc => doc.status === "completed").map((doc) => (
                  <Card key={doc._id} className="border-border/50 bg-card/50 hover:bg-card/80 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <FileText className="h-10 w-10 text-primary flex-shrink-0 mt-1" />
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold mb-2">{doc.name}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                              <span>Status: {doc.status}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => generateSummary(doc._id)}
                            disabled={generating}
                            className="gap-2"
                          >
                            <Zap className="h-4 w-4" />
                            {generating ? "Generating..." : "Generate Summary"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Cross-Document Analysis */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Cross-Document Analysis</h3>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Select multiple documents to generate AI-powered cross-document analysis and insights.
                  </p>
                  <div className="grid gap-2">
                    {documents.filter(doc => doc.status === "completed").map((doc) => (
                      <label key={doc._id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedDocuments.includes(doc._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDocuments([...selectedDocuments, doc._id])
                            } else {
                              setSelectedDocuments(selectedDocuments.filter(id => id !== doc._id))
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{doc.name}</span>
                      </label>
                    ))}
                  </div>
                  <Button 
                    onClick={generateCrossDocumentSummary}
                    disabled={generating || selectedDocuments.length < 2}
                    className="gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    {generating ? "Generating..." : "Generate Cross-Document Analysis"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summaries List */}
          {loading ? (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="py-12 text-center">
                <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto mb-4 animate-spin" />
                <p className="text-muted-foreground">Loading summaries...</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {filteredSummaries.map((summary) => (
                <Card key={summary._id} className="border-border/50 bg-card/50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{summary.title}</CardTitle>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            {documents.find(d => d._id === summary.documentId)?.name || "Unknown Document"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {summary.readTime} min read
                          </span>
                          <span>{summary.wordCount} words</span>
                          <span>Generated {new Date(summary.generatedAt).toLocaleDateString()}</span>
                          {summary.type === "cross-document" && summary.relatedDocumentIds?.length ? (
                            <span className="flex items-center gap-1">
                              <span>Across:</span>
                              <span className="flex flex-wrap gap-1">
                                {summary.relatedDocumentIds.map((id) => (
                                  <span key={id} className="px-2 py-0.5 rounded bg-muted text-foreground/80 text-xs">
                                    {documents.find(d => d._id === id)?.name || id}
                                  </span>
                                ))}
                              </span>
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            summary.type === "cross-document"
                              ? "bg-primary/20 text-primary-foreground"
                              : "bg-accent/20 text-accent-foreground"
                          }
                        >
                          {summary.type === "cross-document" ? "Cross-Document" : "Document"}
                        </Badge>
                        <Badge variant="outline" className="bg-transparent">
                          {summary.length}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Export
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => deleteSummary(summary._id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
                      <div className="text-sm leading-relaxed whitespace-pre-line">
                        {summary.content.substring(0, 300)}...
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="bg-transparent">
                        Read Full Summary
                      </Button>
                      <Button size="sm" variant="outline" className="gap-2 bg-transparent">
                        <Download className="h-4 w-4" />
                        Export
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="document">
          <div className="space-y-6">
            {documentSummaries.length > 0 ? (
              <div className="grid gap-6">
                {documentSummaries.map((summary) => (
                  <Card key={summary._id} className="border-border/50 bg-card/50">
                    <CardHeader>
                      <CardTitle className="text-xl">{summary.title}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{summary.wordCount} words</span>
                        <span>{summary.readTime} min read</span>
                        <span>Generated {new Date(summary.generatedAt).toLocaleDateString()}</span>
                        {summary.relatedDocumentIds?.length ? (
                          <span className="flex items-center gap-1">
                            <span>Across:</span>
                            <span className="flex flex-wrap gap-1">
                              {summary.relatedDocumentIds.map((id) => (
                                <span key={id} className="px-2 py-0.5 rounded bg-muted text-foreground/80 text-xs">
                                  {documents.find(d => d._id === id)?.name || id}
                                </span>
                              ))}
                            </span>
                          </span>
                        ) : null}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <div className="text-sm leading-relaxed whitespace-pre-line">
                          {summary.content.substring(0, 500)}...
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Document Summaries</h3>
                <p className="text-muted-foreground">Generate summaries from your uploaded documents</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="cross-document">
          <div className="space-y-6">
            {crossDocumentSummaries.length > 0 ? (
              <div className="grid gap-6">
                {crossDocumentSummaries.map((summary) => (
                  <Card key={summary._id} className="border-border/50 bg-card/50">
                    <CardHeader>
                      <CardTitle className="text-xl">{summary.title}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{summary.wordCount} words</span>
                        <span>{summary.readTime} min read</span>
                        <span>Generated {new Date(summary.generatedAt).toLocaleDateString()}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <div className="text-sm leading-relaxed whitespace-pre-line">
                          {summary.content.substring(0, 500)}...
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Cross-Document Analysis</h3>
                <p className="text-muted-foreground">Generate AI-powered insights across multiple documents</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}