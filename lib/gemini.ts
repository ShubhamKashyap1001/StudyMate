import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

if (!apiKey) {
  // Defer throwing to runtime functions so API routes can return a helpful error
  console.warn("GEMINI_API_KEY is not set. Summaries will fail until configured.");
}

// Generate flashcards from text using Gemini
export async function generateFlashcardsFromText(
  content: string,
  documentName: string,
  count: number = 10
): Promise<GeminiFlashcardItem[]> {
  try {
    if (!apiKey || !genAI) {
      throw new Error("Missing GEMINI_API_KEY. Please set it in .env.local and restart the server.");
    }
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const capped = Math.min(Math.max(count, 3), 30);
    const prompt = `
You are an expert learning assistant. Create ${capped} high-quality flashcards from the following document content.

Document: ${documentName}

Requirements:
- Use a mix of easy/medium/hard difficulties.
- Questions must be clear and atomic; answers concise and accurate.
- Avoid duplicates; cover diverse key points, definitions, formulas, and facts.

Return ONLY valid JSON, no extra text, using this shape:
[
  { "question": "...", "answer": "...", "difficulty": "easy|medium|hard" },
  ...
]

Content:
${content}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON array (handle fenced code blocks)
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const jsonCandidate = fenced ? fenced[1] : text;
    // Extract array portion if extra text exists
    const firstBracket = jsonCandidate.indexOf("[");
    const lastBracket = jsonCandidate.lastIndexOf("]");
    const toParse = (firstBracket !== -1 && lastBracket !== -1)
      ? jsonCandidate.substring(firstBracket, lastBracket + 1)
      : jsonCandidate;

    const parsed = JSON.parse(toParse) as any[];
    // Basic validation and normalization
    const items: GeminiFlashcardItem[] = parsed
      .filter(Boolean)
      .map((it) => ({
        question: String(it.question || "").trim(),
        answer: String(it.answer || "").trim(),
        difficulty: (it.difficulty === "easy" || it.difficulty === "medium" || it.difficulty === "hard") ? it.difficulty : "medium",
      }))
      .filter(it => it.question.length > 0 && it.answer.length > 0);

    if (items.length === 0) throw new Error("AI returned no flashcards");
    return items.slice(0, capped);
  } catch (error) {
    console.error("Error generating flashcards with Gemini:", error);
    throw new Error((error as Error)?.message || "Failed to generate flashcards");
  }
}

export interface SummaryOptions {
  length: "brief" | "detailed" | "comprehensive";
  focus?: string; // optional focus area
}

export interface GeminiSummaryResponse {
  title: string;
  content: string;
  wordCount: number;
  readTime: number;
}

export interface GeminiFlashcardItem {
  question: string;
  answer: string;
  difficulty?: "easy" | "medium" | "hard";
}

export async function generateSummaryFromPDF(
  pdfContent: string,
  documentName: string,
  options: SummaryOptions = { length: "detailed" }
): Promise<GeminiSummaryResponse> {
  try {
    if (!apiKey || !genAI) {
      throw new Error("Missing GEMINI_API_KEY. Please set it in .env.local and restart the server.");
    }
    console.log("Initializing Gemini model...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("Gemini model initialized successfully");

    const lengthInstructions = {
      brief: "Create a concise summary in 2-3 paragraphs",
      detailed: "Create a comprehensive summary covering all key points",
      comprehensive: "Create an extensive summary with detailed analysis and insights"
    };

    const prompt = `
You are an expert academic assistant. Please analyze the following PDF content and create a ${options.length} summary.

Document: ${documentName}
Focus: ${options.focus || "General overview"}

Instructions:
- ${lengthInstructions[options.length]}
- Use clear, academic language
- Include key concepts, main arguments, and important details
- Structure the content with proper headings and bullet points
- Maintain accuracy and objectivity
- Highlight the most important information

PDF Content:
${pdfContent}

Please provide:
1. A descriptive title for the summary
2. Well-structured content with headings
3. Word count
4. Estimated reading time in minutes

Format your response as JSON:
{
  "title": "Summary Title",
  "content": "Formatted summary content with markdown",
  "wordCount": number,
  "readTime": number
}
`;

    console.log("Sending request to Gemini API...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log("Received response from Gemini API, length:", text.length);

    // Parse JSON response
    let summaryData: any;
    try {
      // Some responses may include markdown code fences. Try to extract JSON safely.
      const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      const jsonCandidate = fencedMatch ? fencedMatch[1] : text;
      // Find first JSON object if extra text surrounds it
      const firstBrace = jsonCandidate.indexOf("{");
      const lastBrace = jsonCandidate.lastIndexOf("}");
      const toParse = (firstBrace !== -1 && lastBrace !== -1)
        ? jsonCandidate.substring(firstBrace, lastBrace + 1)
        : jsonCandidate;
      summaryData = JSON.parse(toParse);
      console.log("Successfully parsed JSON response");
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      console.error("Raw response:", text);
      throw new Error("Failed to parse AI response");
    }
    
    return {
      title: summaryData.title,
      content: summaryData.content,
      wordCount: summaryData.wordCount,
      readTime: summaryData.readTime
    };

  } catch (error) {
    console.error("Error generating summary with Gemini:", error);
    throw new Error((error as Error)?.message || "Failed to generate summary");
  }
}

export async function generateCrossDocumentSummary(
  documents: Array<{ name: string; content: string }>,
  options: SummaryOptions = { length: "detailed" }
): Promise<GeminiSummaryResponse> {
  try {
    if (!apiKey || !genAI) {
      throw new Error("Missing GEMINI_API_KEY. Please set it in .env.local and restart the server.");
    }
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const documentsText = documents.map((doc, index) => 
      `Document ${index + 1}: ${doc.name}\n${doc.content}\n---\n`
    ).join('\n');

    const prompt = `
You are an expert academic assistant. Please analyze the following multiple documents and create a cross-document analysis.

Documents:
${documentsText}

Instructions:
- Create a ${options.length} cross-document analysis
- Identify common themes, patterns, and relationships between documents
- Highlight key differences and similarities
- Provide insights that emerge from comparing the documents
- Use clear, academic language with proper structure
- Include headings and bullet points for clarity

Focus: ${options.focus || "Comparative analysis and insights"}

Please provide:
1. A descriptive title for the cross-document analysis
2. Well-structured content with headings
3. Word count
4. Estimated reading time in minutes

Format your response as JSON:
{
  "title": "Cross-Document Analysis Title",
  "content": "Formatted analysis content with markdown",
  "wordCount": number,
  "readTime": number
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    let summaryData: any;
    try {
      const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      const jsonCandidate = fencedMatch ? fencedMatch[1] : text;
      const firstBrace = jsonCandidate.indexOf("{");
      const lastBrace = jsonCandidate.lastIndexOf("}");
      const toParse = (firstBrace !== -1 && lastBrace !== -1)
        ? jsonCandidate.substring(firstBrace, lastBrace + 1)
        : jsonCandidate;
      summaryData = JSON.parse(toParse);
    } catch (e) {
      console.error("Error parsing JSON response for cross-doc:", e);
      console.error("Raw response:", text);
      throw new Error("Failed to parse AI response");
    }
    
    return {
      title: summaryData.title,
      content: summaryData.content,
      wordCount: summaryData.wordCount,
      readTime: summaryData.readTime
    };

  } catch (error) {
    console.error("Error generating cross-document summary with Gemini:", error);
    throw new Error((error as Error)?.message || "Failed to generate cross-document summary");
  }
}

import pdf from 'pdf-parse';

// Helper function to extract text from PDF using pdf-parse
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    const data = await pdf(pdfBuffer);
    
    // Clean and format the extracted text
    let text = data.text;
    
    // Remove excessive whitespace and normalize line breaks
    text = text.replace(/\s+/g, ' ').trim();
    
    // Remove page numbers and headers/footers (basic cleanup)
    text = text.replace(/\d+\s*$/gm, ''); // Remove page numbers at end of lines
    text = text.replace(/^\s*\d+\s*$/gm, ''); // Remove standalone page numbers
    
    // Limit text length to avoid token limits (Gemini has token limits)
    const maxLength = 50000; // Adjust based on your needs
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '... [Content truncated due to length]';
    }
    
    return text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}
