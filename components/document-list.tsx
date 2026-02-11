"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { FileText, Search, MoreVertical, Download, Trash2, MessageSquare, Zap, RefreshCw } from "lucide-react"
import { useSession } from "next-auth/react"

interface Document {
  _id: string
  name: string
  originalName: string
  fileSize: number
  uploadDate: string
  status: "uploading" | "processing" | "completed" | "error"
  tags?: string[]
  questionsCount?: number
  flashcardsCount?: number
  errorMessage?: string
}

export function DocumentList() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const { data: session } = useSession()

  const fetchDocuments = async () => {
    if (!session?.user?.id) return
    
    try {
      setLoading(true)
      const response = await fetch("/api/documents", { headers: { Accept: "application/json" } })
      let data: any = null
      const contentType = response.headers.get("content-type") || ""
      if (contentType.includes("application/json")) {
        try { data = await response.json() } catch { data = null }
      } else {
        // Fallback to text to avoid JSON parse error when server returns HTML
        const text = await response.text()
        console.error("Non-JSON response while fetching documents:", text)
      }

      if (response.ok) {
        setDocuments((data?.documents) || [])
      } else {
        console.error("Failed to fetch documents:", data?.error || response.statusText)
      }
    } catch (error) {
      console.error("Error fetching documents:", error)
    } finally {
      setLoading(false)
    }
  }

  const deleteDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents?id=${documentId}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      })
      
      if (response.ok) {
        setDocuments(prev => prev.filter(doc => doc._id !== documentId))
      } else {
        let data: any = null
        const contentType = response.headers.get("content-type") || ""
        if (contentType.includes("application/json")) {
          try { data = await response.json() } catch { /* ignore */ }
        }
        alert(`Failed to delete document: ${data?.error || response.statusText}`)
      }
    } catch (error) {
      console.error("Error deleting document:", error)
      alert("Failed to delete document")
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  useEffect(() => {
    fetchDocuments()
  }, [session])

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.tags && doc.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))),
  )

  const getStatusColor = (status: Document["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "processing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "uploading":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background/50"
          />
        </div>
        <Button variant="outline" size="icon" onClick={fetchDocuments} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="py-12 text-center">
            <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto mb-4 animate-spin" />
            <p className="text-muted-foreground">Loading documents...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredDocuments.map((document) => (
            <Card key={document._id} className="border-border/50 bg-card/50 hover:bg-card/80 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <FileText className="h-10 w-10 text-primary flex-shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-2 truncate">{document.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <span>{formatFileSize(document.fileSize)}</span>
                        <span>•</span>
                        <span>Uploaded {new Date(document.uploadDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={getStatusColor(document.status)}>{document.status}</Badge>
                        {document.tags && document.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="bg-transparent">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      {document.status === "completed" && (
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4" />
                            {document.questionsCount || 0} questions
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap className="h-4 w-4" />
                            {document.flashcardsCount || 0} flashcards
                          </span>
                        </div>
                      )}
                      {document.status === "error" && document.errorMessage && (
                        <p className="text-sm text-red-500 mt-2">{document.errorMessage}</p>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Ask Questions
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Zap className="mr-2 h-4 w-4" />
                        Generate Flashcards
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => deleteDocument(document._id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredDocuments.length === 0 && (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No documents found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "Try adjusting your search terms" : "Upload your first document to get started"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
