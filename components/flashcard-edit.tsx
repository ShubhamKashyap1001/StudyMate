"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, Save, X, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface FlashcardEditProps {
  flashcard: {
    _id: string
    question: string
    answer: string
    difficulty: "easy" | "medium" | "hard"
    source: string
  }
  onSave: (id: string, data: { question: string; answer: string; difficulty: string }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function FlashcardEdit({ flashcard, onSave, onDelete }: FlashcardEditProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [question, setQuestion] = useState(flashcard.question)
  const [answer, setAnswer] = useState(flashcard.answer)
  const [difficulty, setDifficulty] = useState(flashcard.difficulty)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(flashcard._id, { question, answer, difficulty })
      setIsEditing(false)
    } catch (error) {
      console.error("Error saving flashcard:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setQuestion(flashcard.question)
    setAnswer(flashcard.answer)
    setDifficulty(flashcard.difficulty)
    setIsEditing(false)
  }

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "easy":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "medium":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "hard":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Flashcard</CardTitle>
            <Badge className={getDifficultyColor(difficulty)}>{difficulty}</Badge>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button 
                  size="sm" 
                  onClick={handleSave} 
                  disabled={saving}
                  className="gap-1"
                >
                  <Save className="h-3 w-3" />
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleCancel}
                  className="gap-1"
                >
                  <X className="h-3 w-3" />
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setIsEditing(true)}
                  className="gap-1"
                >
                  <Edit className="h-3 w-3" />
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => onDelete(flashcard._id)}
                  className="gap-1 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Question
          </label>
          {isEditing ? (
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-h-[80px]"
              placeholder="Enter the question..."
            />
          ) : (
            <div className="p-3 bg-muted/50 rounded-md min-h-[80px] flex items-center">
              <p className="text-sm">{question}</p>
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Answer
          </label>
          {isEditing ? (
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="min-h-[120px]"
              placeholder="Enter the answer..."
            />
          ) : (
            <div className="p-3 bg-muted/50 rounded-md min-h-[120px] flex items-center">
              <p className="text-sm">{answer}</p>
            </div>
          )}
        </div>

        {isEditing && (
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Difficulty
            </label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Source: {flashcard.source}
        </div>
      </CardContent>
    </Card>
  )
}

