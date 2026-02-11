"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react"
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

  // Handle Multiple Files
  const handleFiles = async (fileList: File[]) => {
    if (!session?.user?.id) {
      alert("Please login first")
      return
    }

    const newFiles: UploadedFile[] = fileList.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      progress: 0,
      status: "uploading",
    }))

    setFiles((prev) => [...prev, ...newFiles])

    // Upload in parallel
    await Promise.all(
      fileList.map((file) => {
        const fileId = newFiles.find((f) => f.name === file.name)?.id!
        return uploadFile(file, fileId)
      })
    )
  }

  // Upload Single File
  const uploadFile = async (file: File, fileId: string) => {
    try {
      const formData = new FormData()
      formData.append("file", file)

      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, progress: 30, status: "uploading" } : f))
      )

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || "Upload failed")
      }

      // Uploaded, now processing PDF
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, progress: 80, status: "processing" } : f
        )
      )

      // Done
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, progress: 100, status: "completed" } : f
        )
      )

      onUploadSuccess?.()

    } catch (error: any) {
      console.error("Upload error:", error)
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, status: "error", error: error.message }
            : f
        )
      )
    }
  }

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== fileId))
  }

  const formatFileSize = (bytes: number) => {
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i]
  }

  return (
    <div className="space-y-6">

      {/* Upload Box */}
      <Card
        className={cn(
          "border-2 border-dashed transition-colors",
          isDragOver ? "border-primary bg-primary/5" : "border-border/50 bg-card/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Upload your documents</h3>
          <p className="text-muted-foreground mb-4">
            Drag & drop PDFs or click browse
          </p>

          <input
            type="file"
            multiple
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />

          <Button asChild>
            <label htmlFor="file-upload" className="cursor-pointer">
              Choose Files
            </label>
          </Button>

          <p className="text-xs text-muted-foreground mt-2">
            Max 10MB per file
          </p>
        </CardContent>
      </Card>

      {/* Upload List */}
      {files.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            {files.map((file) => (
              <div key={file.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">

                <FileText className="h-8 w-8 text-primary" />

                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium truncate">{file.name}</p>

                    <div className="flex gap-2 items-center">
                      {file.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                      {file.status === "processing" && <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />}
                      {file.status === "completed" && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {file.status === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}

                      <Button variant="ghost" size="icon" onClick={() => removeFile(file.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground flex gap-2">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>{file.status}</span>
                  </div>

                  {file.status === "error" && (
                    <p className="text-xs text-red-500 mt-1">{file.error}</p>
                  )}

                  {file.status !== "completed" && file.status !== "error" && (
                    <Progress value={file.progress} className="h-1 mt-2" />
                  )}
                </div>

              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
