"use client"

import { useState, useEffect } from "react"
import { FlashcardDeck } from "@/components/flashcard-deck"
import { FlashcardEdit } from "@/components/flashcard-edit"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Zap, Plus, BookOpen, TrendingUp, Clock, FileText, RefreshCw, Edit, Trash2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical } from "lucide-react"

interface Document {
  _id: string
  name: string
  flashcardsCount: number
  status: string
}

interface FlashcardDeck {
  documentId: string
  title: string
  description: string
  cardCount: number
  newCards: number
  reviewCards: number
  source: string
  lastStudied?: string
}

export default function FlashcardsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [flashcards, setFlashcards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [tab, setTab] = useState<string>("decks")
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
        const text = await response.text()
        console.error("Non-JSON response while fetching documents:", text)
      }
      
      if (response.ok) {
        setDocuments((data?.documents) || [])
      }
    } catch (error) {
      console.error("Error fetching documents:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFlashcards = async (documentId?: string) => {
    if (!session?.user?.id) return
    
    try {
      const url = documentId 
        ? `/api/flashcards?documentId=${documentId}`
        : "/api/flashcards"
      
      const response = await fetch(url, { headers: { Accept: "application/json" } })
      let data: any = null
      const contentType = response.headers.get("content-type") || ""
      if (contentType.includes("application/json")) {
        try { data = await response.json() } catch { data = null }
      } else {
        const text = await response.text()
        console.error("Non-JSON response while fetching flashcards:", text)
      }
      
      if (response.ok) {
        setFlashcards((data?.flashcards) || [])
      }
    } catch (error) {
      console.error("Error fetching flashcards:", error)
    }
  }

  const generateFlashcards = async (documentId: string) => {
    try {
      const response = await fetch("/api/flashcards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ documentId, count: 10 }),
      })
      let data: any = null
      const contentType = response.headers.get("content-type") || ""
      if (contentType.includes("application/json")) {
        try { data = await response.json() } catch { data = null }
      } else {
        const text = await response.text()
        console.error("Non-JSON response after generateFlashcards:", text)
      }
      
      if (response.ok) {
        await fetchDocuments() // Refresh documents to update counts
        await fetchFlashcards(documentId) // Refresh flashcards
        alert(`Generated ${data?.count ?? ""} flashcards successfully!`)
      } else {
        alert(`Failed to generate flashcards: ${data?.error || response.statusText}`)
      }
    } catch (error) {
      console.error("Error generating flashcards:", error)
      alert("Failed to generate flashcards")
    }
  }

  const deleteFlashcard = async (flashcardId: string) => {
    try {
      const response = await fetch(`/api/flashcards?id=${flashcardId}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      })
      
      if (response.ok) {
        await fetchFlashcards(selectedDeck || undefined)
        await fetchDocuments() // Refresh documents to update counts
      } else {
        let data: any = null
        const contentType = response.headers.get("content-type") || ""
        if (contentType.includes("application/json")) {
          try { data = await response.json() } catch { /* ignore */ }
        }
        alert(`Failed to delete flashcard: ${data?.error || response.statusText}`)
      }
    } catch (error) {
      console.error("Error deleting flashcard:", error)
      alert("Failed to delete flashcard")
    }
  }

  const updateFlashcard = async (flashcardId: string, data: { question: string; answer: string; difficulty: string }) => {
    try {
      const response = await fetch("/api/flashcards", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          flashcardId,
          question: data.question,
          answer: data.answer,
          difficulty: data.difficulty,
        }),
      })
      if (response.ok) {
        await fetchFlashcards(selectedDeck || undefined)
      } else {
        let errorData: any = null
        const contentType = response.headers.get("content-type") || ""
        if (contentType.includes("application/json")) {
          try { errorData = await response.json() } catch { /* ignore */ }
        }
        alert(`Failed to update flashcard: ${errorData?.error || response.statusText}`)
      }
    } catch (error) {
      console.error("Error updating flashcard:", error)
      alert("Failed to update flashcard")
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [session])

  useEffect(() => {
    if (selectedDeck) {
      fetchFlashcards(selectedDeck)
    } else {
      fetchFlashcards()
    }
  }, [selectedDeck, session])

  // Group flashcards by document
  const flashcardDecks: FlashcardDeck[] = documents
    .filter(doc => doc.flashcardsCount > 0)
    .map(doc => {
      const docFlashcards = flashcards.filter(f => f.documentId === doc._id)
      const newCards = docFlashcards.filter(f => f.reviewCount === 0).length
      const reviewCards = docFlashcards.filter(f => f.reviewCount > 0).length
      
      return {
        documentId: doc._id,
        title: doc.name,
        description: `Flashcards generated from ${doc.name}`,
        cardCount: doc.flashcardsCount,
        newCards,
        reviewCards,
        source: doc.name,
        lastStudied: docFlashcards.length > 0 
          ? new Date(Math.max(...docFlashcards.map(f => new Date(f.lastReviewed || f.createdAt).getTime()))).toISOString()
          : undefined
      }
    })

  const totalCards = flashcards.length
  const totalDecks = flashcardDecks.length
  const accuracy = flashcards.length > 0 
    ? Math.round((flashcards.filter(f => f.rating === "easy" || f.rating === "medium").length / flashcards.length) * 100)
    : 0
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-balance">Flashcards</h1>
        <p className="text-muted-foreground text-pretty">
          Study with AI-generated flashcards and track your learning progress
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="decks" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            My Decks
          </TabsTrigger>
          <TabsTrigger value="study" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Study Session
          </TabsTrigger>
        </TabsList>

        <TabsContent value="decks" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{totalDecks}</p>
                    <p className="text-xs text-muted-foreground">Total Decks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-accent" />
                  <div>
                    <p className="text-2xl font-bold">{totalCards}</p>
                    <p className="text-xs text-muted-foreground">Total Cards</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{accuracy}%</p>
                    <p className="text-xs text-muted-foreground">Accuracy</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-accent" />
                  <div>
                    <p className="text-2xl font-bold">5</p>
                    <p className="text-xs text-muted-foreground">Day Streak</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Available Documents for Flashcard Generation */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Available Documents</h3>
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
                              <span>•</span>
                              <span>Flashcards: {doc.flashcardsCount}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {doc.flashcardsCount > 0 ? (
                            <>
                              <Button 
                                size="sm" 
                                onClick={() => { setSelectedDeck(doc._id); setTab('study') }}
                              >
                                Study Now
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="bg-transparent"
                                onClick={() => generateFlashcards(doc._id)}
                              >
                                Regenerate
                              </Button>
                            </>
                          ) : (
                            <Button 
                              size="sm" 
                              onClick={() => generateFlashcards(doc._id)}
                              className="gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Generate Flashcards
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Existing Flashcard Decks */}
          {flashcardDecks.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Your Flashcard Decks</h3>
              <div className="grid gap-4">
                {flashcardDecks.map((deck) => (
                  <Card key={deck.documentId} className="border-border/50 bg-card/50 hover:bg-card/80 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-semibold">{deck.title}</h3>
                            <Badge variant="outline" className="bg-transparent">
                              {deck.cardCount} cards
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mb-4">{deck.description}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-primary rounded-full" />
                              {deck.newCards} new
                            </span>
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-accent rounded-full" />
                              {deck.reviewCards} review
                            </span>
                            {deck.lastStudied && (
                              <span className="text-muted-foreground">
                                Last studied: {new Date(deck.lastStudied).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => { setSelectedDeck(deck.documentId); setTab('study') }}
                          >
                            Study Now
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="bg-transparent">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => generateFlashcards(deck.documentId)}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Regenerate
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSelectedDeck(deck.documentId)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Cards
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="study" className="space-y-6">
          {selectedDeck ? (
            <div className="space-y-4">
              {/* Mode Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">
                    {flashcardDecks.find(d => d.documentId === selectedDeck)?.title || "Study Session"}
                  </h2>
                  <Badge variant="outline">
                    {flashcards.filter(f => f.documentId === selectedDeck).length} cards
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={editMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditMode(!editMode)}
                    className="gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    {editMode ? "Study Mode" : "Edit Mode"}
                  </Button>
                </div>
              </div>

              {/* Study Mode */}
              {!editMode ? (
                <FlashcardDeck
                  title={flashcardDecks.find(d => d.documentId === selectedDeck)?.title || "Study Session"}
                  description={flashcardDecks.find(d => d.documentId === selectedDeck)?.description || ""}
                  cards={flashcards.filter(f => f.documentId === selectedDeck)}
                  totalCards={flashcards.filter(f => f.documentId === selectedDeck).length}
                />
              ) : (
                /* Edit Mode */
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Edit your flashcards below. Click on any card to modify its content.
                  </p>
                  <div className="grid gap-4">
                    {flashcards.filter(f => f.documentId === selectedDeck).map((flashcard) => (
                      <FlashcardEdit
                        key={flashcard._id}
                        flashcard={flashcard}
                        onSave={updateFlashcard}
                        onDelete={deleteFlashcard}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Deck Selected</h3>
                <p className="text-muted-foreground mb-4">
                  Select a flashcard deck from the "My Decks" tab to start studying
                </p>
                <Button onClick={() => setSelectedDeck(null)}>
                  View All Decks
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
