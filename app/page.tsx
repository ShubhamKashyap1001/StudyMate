import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { BookOpen, MessageSquare, Search, Zap, Users, Brain } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            <span className="text-xl font-semibold text-balance">StudyMate</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
            <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">
              Login
            </Link>
            <Button asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="relative container mx-auto px-4 py-24 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-balance mb-6 bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
              Your AI Academic Assistant
            </h1>
            <p className="text-xl text-muted-foreground text-pretty mb-8 max-w-2xl mx-auto leading-relaxed">
              Upload PDFs, ask intelligent questions, generate flashcards, and collaborate with peers. StudyMate
              transforms how you learn and research.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="text-lg px-8">
                <Link href="/signup">Start Learning Free</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-lg px-8 bg-transparent">
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-balance mb-4">
              Everything you need to excel academically
            </h2>
            <p className="text-xl text-muted-foreground text-pretty max-w-2xl mx-auto">
              Powerful AI tools designed for students, researchers, and educators
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors">
              <MessageSquare className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Intelligent Q&A</h3>
              <p className="text-muted-foreground">
                Ask questions about your documents and get precise answers with citations and context.
              </p>
            </Card>

            <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors">
              <Search className="h-12 w-12 text-accent mb-4" />
              <h3 className="text-xl font-semibold mb-2">Semantic Search</h3>
              <p className="text-muted-foreground">
                Find relevant information across all your documents using advanced semantic understanding.
              </p>
            </Card>

            <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors">
              <Zap className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Smart Flashcards</h3>
              <p className="text-muted-foreground">
                Automatically generate flashcards from your PDFs to reinforce learning and retention.
              </p>
            </Card>

            <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors">
              <BookOpen className="h-12 w-12 text-accent mb-4" />
              <h3 className="text-xl font-semibold mb-2">AI Summaries</h3>
              <p className="text-muted-foreground">
                Get comprehensive summaries of documents and cross-document insights to save time.
              </p>
            </Card>

            <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors">
              <Users className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Collaboration</h3>
              <p className="text-muted-foreground">
                Share documents and collaborate with teammates through group Q&A sessions.
              </p>
            </Card>

            <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors">
              <Brain className="h-12 w-12 text-accent mb-4" />
              <h3 className="text-xl font-semibold mb-2">Learning Insights</h3>
              <p className="text-muted-foreground">
                Track your progress with detailed analytics on study time and learning patterns.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-balance mb-4">Ready to transform your learning?</h2>
            <p className="text-xl text-muted-foreground text-pretty mb-8">
              Join thousands of students and researchers who are already using StudyMate to excel academically.
            </p>
            <Button size="lg" asChild className="text-lg px-8">
              <Link href="/signup">Get Started Today</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Brain className="h-6 w-6 text-primary" />
              <span className="font-semibold">StudyMate</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/about" className="hover:text-foreground transition-colors">
                About
              </Link>
              <span>Supporting SDG 4 & 9</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
