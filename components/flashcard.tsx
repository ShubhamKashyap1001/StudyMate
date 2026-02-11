"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RotateCcw, Eye, EyeOff, CheckCircle, XCircle, Clock, Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface FlashcardProps {
  question: string
  answer: string
  difficulty: "easy" | "medium" | "hard"
  source: string
  onRate: (rating: "easy" | "medium" | "hard" | "again") => void
}

export function Flashcard({ question, answer, difficulty, source, onRate }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [selectedRating, setSelectedRating] = useState<string | null>(null)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (isAnimating) return
      
      switch (event.key) {
        case ' ':
        case 'Enter':
          event.preventDefault()
          handleFlip()
          break
        case '1':
          if (isFlipped) {
            event.preventDefault()
            handleRating('again')
          }
          break
        case '2':
          if (isFlipped) {
            event.preventDefault()
            handleRating('hard')
          }
          break
        case '3':
          if (isFlipped) {
            event.preventDefault()
            handleRating('medium')
          }
          break
        case '4':
          if (isFlipped) {
            event.preventDefault()
            handleRating('easy')
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isFlipped, isAnimating])

  const handleFlip = () => {
    if (isAnimating) return
    setIsAnimating(true)
    setIsFlipped(!isFlipped)
    setShowAnswer(!showAnswer)
    setTimeout(() => setIsAnimating(false), 500)
  }

  const handleRating = (rating: "easy" | "medium" | "hard" | "again") => {
    setSelectedRating(rating)
    setTimeout(() => {
      onRate(rating)
      setSelectedRating(null)
    }, 300)
  }

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "easy":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800"
      case "medium":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800"
      case "hard":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getRatingButtonStyle = (rating: string) => {
    switch (rating) {
      case "again":
        return "bg-red-50 hover:bg-red-100 text-red-700 border-red-200 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:text-red-400 dark:border-red-800"
      case "hard":
        return "bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:hover:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800"
      case "medium":
        return "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800"
      case "easy":
        return "bg-green-50 hover:bg-green-100 text-green-700 border-green-200 dark:bg-green-950/20 dark:hover:bg-green-950/40 dark:text-green-400 dark:border-green-800"
      default:
        return ""
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Card className="border-border/50 bg-gradient-to-br from-card/50 to-card/80 backdrop-blur-sm min-h-[500px] relative overflow-hidden shadow-xl">
        <CardContent className="p-8 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Badge className={cn("px-3 py-1 text-xs font-medium border", getDifficultyColor(difficulty))}>
                {difficulty.toUpperCase()}
              </Badge>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3" />
                <span>From: {source}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isFlipped && (
                <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle className="h-3 w-3" />
                  <span>Answer Revealed</span>
                </div>
              )}
            </div>
          </div>

          {/* Card Content */}
          <div className="flex-1 flex items-center justify-center relative">
            <div
              className={cn(
                "w-full h-full transition-all duration-700 ease-in-out transform-gpu perspective-1000",
                isFlipped ? "rotate-y-180" : "rotate-y-0",
              )}
              style={{ 
                transformStyle: "preserve-3d",
                perspective: "1000px"
              }}
            >
              {/* Front (Question) */}
              <div
                className={cn(
                  "absolute inset-0 backface-hidden flex flex-col items-center justify-center text-center space-y-6 p-6",
                  isFlipped && "rotate-y-180",
                )}
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <span className="text-2xl">❓</span>
                </div>
                <h3 className="text-lg font-semibold text-muted-foreground mb-4">Question</h3>
                <div className="bg-muted/30 rounded-lg p-6 w-full max-w-2xl">
                  <p className="text-xl leading-relaxed text-balance font-medium">{question}</p>
                </div>
              </div>

              {/* Back (Answer) */}
              <div
                className={cn(
                  "absolute inset-0 backface-hidden rotate-y-180 flex flex-col items-center justify-center text-center space-y-6 p-6",
                  isFlipped && "rotate-y-0",
                )}
              >
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
                  <span className="text-2xl">💡</span>
                </div>
                <h3 className="text-lg font-semibold text-muted-foreground mb-4">Answer</h3>
                <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-6 w-full max-w-2xl border border-green-200 dark:border-green-800">
                  <p className="text-xl leading-relaxed text-balance font-medium">{answer}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-4 mt-8">
            <Button 
              onClick={handleFlip} 
              variant="outline" 
              className={cn(
                "gap-2 bg-transparent hover:bg-primary/5 transition-all duration-200",
                isAnimating && "opacity-50 cursor-not-allowed"
              )}
              disabled={isAnimating}
            >
              {isFlipped ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {isFlipped ? "Show Question" : "Reveal Answer"}
            </Button>

            {/* Rating Buttons (only show when answer is visible) */}
            {isFlipped && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">How well did you know this?</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button 
                    onClick={() => handleRating("again")} 
                    variant="outline" 
                    size="sm" 
                    className={cn(
                      "flex flex-col items-center gap-1 h-auto py-3 transition-all duration-200",
                      getRatingButtonStyle("again"),
                      selectedRating === "again" && "scale-95 ring-2 ring-red-300 dark:ring-red-700"
                    )}
                  >
                    <XCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">Again</span>
                    <span className="text-xs text-muted-foreground">(1)</span>
                  </Button>
                  <Button 
                    onClick={() => handleRating("hard")} 
                    variant="outline" 
                    size="sm" 
                    className={cn(
                      "flex flex-col items-center gap-1 h-auto py-3 transition-all duration-200",
                      getRatingButtonStyle("hard"),
                      selectedRating === "hard" && "scale-95 ring-2 ring-orange-300 dark:ring-orange-700"
                    )}
                  >
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium">Hard</span>
                    <span className="text-xs text-muted-foreground">(2)</span>
                  </Button>
                  <Button 
                    onClick={() => handleRating("medium")} 
                    variant="outline" 
                    size="sm" 
                    className={cn(
                      "flex flex-col items-center gap-1 h-auto py-3 transition-all duration-200",
                      getRatingButtonStyle("medium"),
                      selectedRating === "medium" && "scale-95 ring-2 ring-blue-300 dark:ring-blue-700"
                    )}
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">Good</span>
                    <span className="text-xs text-muted-foreground">(3)</span>
                  </Button>
                  <Button 
                    onClick={() => handleRating("easy")} 
                    variant="outline" 
                    size="sm" 
                    className={cn(
                      "flex flex-col items-center gap-1 h-auto py-3 transition-all duration-200",
                      getRatingButtonStyle("easy"),
                      selectedRating === "easy" && "scale-95 ring-2 ring-green-300 dark:ring-green-700"
                    )}
                  >
                    <Star className="h-4 w-4" />
                    <span className="text-xs font-medium">Easy</span>
                    <span className="text-xs text-muted-foreground">(4)</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Use Space/Enter to flip • Use 1-4 keys to rate
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
