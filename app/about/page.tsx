import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Brain, Users, BookOpen, Target, Globe, Lightbulb } from "lucide-react"
import Link from "next/link"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            <span className="text-xl font-semibold text-balance">StudyMate</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              Home
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

      <div className="container mx-auto px-4 py-16 space-y-16">
        {/* Hero Section */}
        <section className="text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-balance">About StudyMate</h1>
          <p className="text-xl text-muted-foreground text-pretty max-w-3xl mx-auto leading-relaxed">
            StudyMate is an AI-powered academic assistant designed to transform how students, researchers, and educators
            interact with knowledge. We're committed to making learning more accessible, efficient, and engaging for
            everyone.
          </p>
        </section>

        {/* Mission & Vision */}
        <section className="grid md:grid-cols-2 gap-8">
          <Card className="border-border/50 bg-card/50 p-8">
            <div className="space-y-4">
              <Target className="h-12 w-12 text-primary" />
              <h2 className="text-2xl font-bold">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed">
                To democratize access to quality education by providing AI-powered tools that help learners understand
                complex materials, generate study resources, and collaborate effectively with peers and educators
                worldwide.
              </p>
            </div>
          </Card>

          <Card className="border-border/50 bg-card/50 p-8">
            <div className="space-y-4">
              <Lightbulb className="h-12 w-12 text-accent" />
              <h2 className="text-2xl font-bold">Our Vision</h2>
              <p className="text-muted-foreground leading-relaxed">
                A world where every learner has access to personalized, intelligent study assistance that adapts to
                their unique learning style and helps them achieve their academic and professional goals.
              </p>
            </div>
          </Card>
        </section>

        {/* SDG Alignment */}
        <section className="space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-balance">Supporting Global Goals</h2>
            <p className="text-xl text-muted-foreground text-pretty max-w-2xl mx-auto">
              StudyMate is aligned with the United Nations Sustainable Development Goals
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-border/50 bg-card/50 p-8">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <BookOpen className="h-12 w-12 text-primary" />
                  <div>
                    <h3 className="text-xl font-bold">SDG 4: Quality Education</h3>
                    <p className="text-sm text-muted-foreground">Ensure inclusive and equitable quality education</p>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  By providing AI-powered study tools, we help make quality educational resources accessible to students
                  regardless of their location, economic background, or learning differences.
                </p>
              </div>
            </Card>

            <Card className="border-border/50 bg-card/50 p-8">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Globe className="h-12 w-12 text-accent" />
                  <div>
                    <h3 className="text-xl font-bold">SDG 9: Innovation & Infrastructure</h3>
                    <p className="text-sm text-muted-foreground">
                      Build resilient infrastructure and foster innovation
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Our platform represents innovative educational technology that builds digital infrastructure for
                  learning, making advanced AI tools accessible to educational institutions worldwide.
                </p>
              </div>
            </Card>
          </div>
        </section>

        {/* Use Cases */}
        <section className="space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-balance">Who We Serve</h2>
            <p className="text-xl text-muted-foreground text-pretty max-w-2xl mx-auto">
              StudyMate is designed for diverse learning communities
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-border/50 bg-card/50 p-6">
              <div className="space-y-4">
                <Users className="h-10 w-10 text-primary" />
                <h3 className="text-lg font-semibold">Students</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Upload course materials, ask questions, generate flashcards, and collaborate with classmates to
                  improve understanding and retention of complex topics.
                </p>
              </div>
            </Card>

            <Card className="border-border/50 bg-card/50 p-6">
              <div className="space-y-4">
                <BookOpen className="h-10 w-10 text-accent" />
                <h3 className="text-lg font-semibold">Researchers</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Analyze research papers, generate summaries, find connections across documents, and accelerate
                  literature reviews with AI-powered insights.
                </p>
              </div>
            </Card>

            <Card className="border-border/50 bg-card/50 p-6">
              <div className="space-y-4">
                <Target className="h-10 w-10 text-primary" />
                <h3 className="text-lg font-semibold">Educators</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Create study materials, generate assessment questions, provide personalized feedback, and enhance
                  teaching effectiveness with AI assistance.
                </p>
              </div>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center space-y-6 py-16">
          <h2 className="text-3xl font-bold text-balance">Ready to Transform Your Learning?</h2>
          <p className="text-xl text-muted-foreground text-pretty max-w-2xl mx-auto">
            Join thousands of learners who are already using StudyMate to achieve their academic goals.
          </p>
          <Button size="lg" asChild className="text-lg px-8">
            <Link href="/signup">Get Started Today</Link>
          </Button>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Brain className="h-6 w-6 text-primary" />
              <span className="font-semibold">StudyMate</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
              <span>Supporting SDG 4 & 9</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
