"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react"

interface UploadedFile {
  id: string
  name: string
  size: number
  progress: number
  status: "uploading" | "processing" | "completed" | "error"
  error?: string
}

export function DocumentUpload({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const { data: session } = useSession()

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFiles(droppedFiles)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      handleFiles(selectedFiles)
    }
  }, [])

  const handleFiles = async (fileList: File[]) => {
    if (!session?.user?.id) {
      alert("Please log in to upload documents")
      return
    }

    const newFiles: UploadedFile[] = fileList.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      progress: 0,
      status: "uploading",
    }))

    setFiles((prev) => [...prev, ...newFiles])

    // Upload files to server
    for (const file of fileList) {
      await uploadFile(file, newFiles.find(f => f.name === file.name)!.id)
    }
  }

  const uploadFile = async (file: File, fileId: string) => {
    try {
      // Update progress to show uploading
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, progress: 50, status: "uploading" } : f))
      )

      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      })

      let result: any = null
      const contentType = response.headers.get("content-type") || ""
      if (contentType.includes("application/json")) {
        try { result = await response.json() } catch { result = null }
      } else {
        const text = await response.text()
        console.error("Non-JSON response during upload:", text)
      }

      if (response.ok) {
        // Upload successful
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? { ...f, progress: 100, status: "completed" }
              : f
          )
        )
        
        // Call success callback to refresh document list
        if (onUploadSuccess) {
          onUploadSuccess()
        }
      } else {
        // Upload failed
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? { ...f, status: "error", error: (result?.error || response.statusText || "Upload failed") }
              : f
          )
        )
      }
    } catch (error) {
      console.error("Upload error:", error)
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, status: "error", error: "Network error" }
            : f
        )
      )
    }
  }

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== fileId))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card
        className={cn(
          "border-2 border-dashed transition-colors",
          isDragOver ? "border-primary bg-primary/5" : "border-border/50 bg-card/50",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Upload your documents</h3>
          <p className="text-muted-foreground mb-4 max-w-sm">
            Drag and drop your PDF files here, or click to browse and select files
          </p>
          <input type="file" multiple accept=".pdf" onChange={handleFileSelect} className="hidden" id="file-upload" />
          <Button asChild>
            <label htmlFor="file-upload" className="cursor-pointer">
              Choose Files
            </label>
          </Button>
          <p className="text-xs text-muted-foreground mt-2">Supports PDF files up to 10MB each</p>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {files.length > 0 && (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <h4 className="font-semibold mb-4">Uploading Files</h4>
            <div className="space-y-3">
              {files.map((file) => (
                <div key={file.id} className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
                  <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <div className="flex items-center gap-2">
                        {file.status === "completed" && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {file.status === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(file.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span className="capitalize">{file.status}</span>
                    </div>
                    {file.status === "error" && file.error && (
                      <p className="text-xs text-red-500 mt-1">{file.error}</p>
                    )}
                    {file.status !== "completed" && file.status !== "error" && (
                      <Progress value={file.progress} className="h-1 mt-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
