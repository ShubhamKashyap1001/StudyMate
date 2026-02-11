"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { FileText, Search, RefreshCw } from "lucide-react"

interface DocumentItem {
  _id: string
  name: string
  originalName: string
  fileSize: number
  uploadDate: string
  status: "uploading" | "processing" | "completed" | "error"
  errorMessage?: string
  extractedText?: string
}

export function DocumentExtractedText() {
  const { data: session } = useSession()
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editedText, setEditedText] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchDocs = async () => {
    if (!session?.user?.id) return
    try {
      setLoading(true)
      const res = await fetch("/api/documents", { headers: { Accept: "application/json" } })
      let data: any = null
      const contentType = res.headers.get("content-type") || ""
      if (contentType.includes("application/json")) {
        try { data = await res.json() } catch { data = null }
      } else {
        const text = await res.text()
        console.error("Non-JSON response while fetching documents:", text)
      }
      if (res.ok) {
        setDocuments((data?.documents) || [])
        if (!selectedId && data.documents?.length) {
          // Preselect first completed doc, else first doc
          const firstCompleted = data.documents.find((d: DocumentItem) => d.status === "completed")
          setSelectedId((firstCompleted || data.documents[0])._id)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    return documents.filter(d =>
      d.name.toLowerCase().includes(term) ||
      d.originalName.toLowerCase().includes(term)
    )
  }, [documents, search])

  const selectedDoc = filtered.find(d => d._id === selectedId) || documents.find(d => d._id === selectedId) || null

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  return (
    <div className="grid gap-4 md:grid-cols-[320px_1fr]">
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            className="pl-10 bg-background/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon" onClick={fetchDocs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
        <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
          {filtered.map(doc => (
            <button
              key={doc._id}
              onClick={() => setSelectedId(doc._id)}
              className={`w-full text-left rounded-lg border p-3 transition-colors ${selectedId === doc._id ? 'bg-card' : 'bg-card/50 hover:bg-card/70'} border-border/50`}
            >
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-primary mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate">{doc.name}</p>
                    <Badge variant="outline" className="ml-2 capitalize">{doc.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{doc.originalName} • {formatFileSize(doc.fileSize)}</p>
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="py-8 text-center">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No matching documents</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div>
        {selectedDoc ? (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4 md:p-6">
              <div className="mb-3">
                <h3 className="text-xl font-semibold">{selectedDoc.name}</h3>
                <p className="text-sm text-muted-foreground">{new Date(selectedDoc.uploadDate).toLocaleString()}</p>
              </div>
              {selectedDoc.status === "processing" ? (
                <p className="text-sm text-muted-foreground">Processing… Please refresh in a moment.</p>
              ) : selectedDoc.status === "error" ? (
                <p className="text-sm text-red-500">{selectedDoc.errorMessage || "Failed to process this document."}</p>
              ) : (
                <div className="space-y-3">
                  {editing ? (
                    <>
                      <Textarea
                        className="min-h-[300px] leading-6"
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        placeholder="Edit extracted text..."
                      />
                      <div className="flex gap-2">
                        <Button size="sm" disabled={saving} onClick={async () => {
                          try {
                            setSaving(true)
                            const res = await fetch('/api/documents', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                              body: JSON.stringify({ id: selectedDoc._id, extractedText: editedText }),
                            })
                            const data = await res.json().catch(() => ({}))
                            if (!res.ok) throw new Error(data?.error || 'Failed to save changes')
                            // Update local state
                            setDocuments(prev => prev.map(d => d._id === selectedDoc._id ? { ...d, extractedText: editedText } : d))
                            setEditing(false)
                            alert('Extracted text updated')
                          } catch (e: any) {
                            alert(e?.message || 'Failed to update')
                          } finally {
                            setSaving(false)
                          }
                        }}>
                          {saving ? 'Saving...' : 'Save'}
                        </Button>
                        <Button size="sm" variant="outline" className="bg-transparent" onClick={() => {
                          setEditing(false)
                          setEditedText(selectedDoc.extractedText || '')
                        }}>
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      {selectedDoc.extractedText && selectedDoc.extractedText.trim().length > 0 ? (
                        <pre className="whitespace-pre-wrap text-sm leading-6 text-foreground/90 max-h-[65vh] overflow-auto bg-background/50 p-3 rounded-md">
                          {selectedDoc.extractedText}
                        </pre>
                      ) : (
                        <p className="text-sm text-muted-foreground">No text extracted for this PDF.</p>
                      )}
                      <div className="pt-2">
                        <Button size="sm" onClick={() => { setEditing(true); setEditedText(selectedDoc.extractedText || '') }} disabled={selectedDoc.status !== 'completed'}>
                          Edit Extracted Text
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Select a document to view extracted text</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
