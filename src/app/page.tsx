import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Zap, Settings, Download } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Document Rebrander
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            AI-powered document processing pipeline that converts raw text into structured JSON,
            enables rich text editing, and generates publication-ready PDFs.
          </p>
          
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/components-demo">
                <Settings className="mr-2 h-4 w-4" />
                View UI Components
              </Link>
            </Button>
            <Button variant="outline" size="lg">
              <FileText className="mr-2 h-4 w-4" />
              Get Started
            </Button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                AI Processing
              </CardTitle>
              <CardDescription>
                Leverage Google's Gemini AI to intelligently parse and structure your documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Gemini AI</Badge>
                <Badge variant="secondary">Smart Parsing</Badge>
                <Badge variant="secondary">JSON Structure</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                Rich Text Editor
              </CardTitle>
              <CardDescription>
                Edit your documents with a powerful Tiptap-based rich text editor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Tiptap</Badge>
                <Badge variant="secondary">WYSIWYG</Badge>
                <Badge variant="secondary">Real-time</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-purple-600" />
                PDF Generation
              </CardTitle>
              <CardDescription>
                Generate professional PDFs from your structured content using pdfme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">PDFme</Badge>
                <Badge variant="secondary">Templates</Badge>
                <Badge variant="secondary">Professional</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tech Stack */}
        <Card>
          <CardHeader>
            <CardTitle>Technology Stack</CardTitle>
            <CardDescription>
              Built with modern technologies for optimal performance and developer experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <h3 className="font-semibold">Frontend</h3>
                <div className="flex flex-wrap gap-1 mt-2 justify-center">
                  <Badge variant="outline">Next.js 15</Badge>
                  <Badge variant="outline">React 19</Badge>
                  <Badge variant="outline">TypeScript</Badge>
                </div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <h3 className="font-semibold">UI</h3>
                <div className="flex flex-wrap gap-1 mt-2 justify-center">
                  <Badge variant="outline">Tailwind</Badge>
                  <Badge variant="outline">shadcn/ui</Badge>
                  <Badge variant="outline">Lucide</Badge>
                </div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <h3 className="font-semibold">AI & Editor</h3>
                <div className="flex flex-wrap gap-1 mt-2 justify-center">
                  <Badge variant="outline">Gemini AI</Badge>
                  <Badge variant="outline">Tiptap</Badge>
                  <Badge variant="outline">PDFme</Badge>
                </div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <h3 className="font-semibold">Backend</h3>
                <div className="flex flex-wrap gap-1 mt-2 justify-center">
                  <Badge variant="outline">Supabase</Badge>
                  <Badge variant="outline">PostgreSQL</Badge>
                  <Badge variant="outline">REST API</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-16 text-muted-foreground">
          <p>© 2024 Document Rebrander. Built with ❤️ using Next.js and shadcn/ui.</p>
        </div>
      </div>
    </div>
  )
}
