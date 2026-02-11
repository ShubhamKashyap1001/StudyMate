"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Clock, FileText, RefreshCw } from "lucide-react"
import { useSession } from "next-auth/react"

interface DocumentItem {
  _id: string
  name: string
  originalName: string
  fileSize: number
  uploadDate: string
  status: "uploading" | "processing" | "completed" | "error"
}

export function ChatSidebar() {
  const { data: session } = useSession()
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(false)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  const fetchDocuments = async () => {
    if (!session?.user?.id) return
    try {
      setLoading(true)
      const resp = await fetch("/api/documents", { headers: { Accept: "application/json" } })
      const ct = resp.headers.get("content-type") || ""
      let data: any = null
      if (ct.includes("application/json")) {
        try { data = await resp.json() } catch { data = null }
      } else {
        const text = await resp.text()
        console.error("Non-JSON response while fetching documents (chat sidebar):", text)
      }
      if (resp.ok) setDocuments((data?.documents) || [])
    } catch (e) {
      console.error("Failed to fetch documents for chat sidebar:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  return (
    <div className="w-80 border-r border-border/50 bg-card/30 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Your Documents</h2>
          <Button variant="outline" size="icon" onClick={fetchDocuments} disabled={loading} className="bg-transparent">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Select a document in the chat header to focus responses.</p>
      </div>

      {/* Documents List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {documents.map((doc) => (
            <Card key={doc._id} className="border-border/30 bg-card/50 hover:bg-card/80 transition-colors">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium text-sm line-clamp-1">{doc.name}</h3>
                    <Badge className="capitalize text-xs">{doc.status}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(doc.uploadDate).toLocaleDateString()}</span>
                    <span>•</span>
                    <FileText className="h-3 w-3" />
                    <span>{formatFileSize(doc.fileSize)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {documents.length === 0 && !loading && (
            <Card className="border-border/30 bg-card/50">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">No documents found. Upload PDFs from the Documents section.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
