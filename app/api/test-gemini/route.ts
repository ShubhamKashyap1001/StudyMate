import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET(request: NextRequest) {
  try {
    console.log("Testing Gemini API connection...");
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: "GEMINI_API_KEY not found in environment variables",
        status: "missing_api_key"
      }, { status: 500 });
    }
    
    console.log("API Key found:", apiKey.substring(0, 10) + "...");
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    console.log("Sending test request to Gemini...");
    const result = await model.generateContent("Hello, can you respond with 'API is working'?");
    const response = await result.response;
    const text = response.text();
    
    console.log("Gemini Response:", text);
    
    return NextResponse.json({ 
      success: true,
      message: "Gemini API is working correctly",
      response: text,
      apiKeyPrefix: apiKey.substring(0, 10) + "..."
    });
    
  } catch (error) {
    console.error("Gemini API Test Error:", error);
    return NextResponse.json({ 
      error: "Gemini API test failed",
      details: error instanceof Error ? error.message : "Unknown error",
      status: "api_error"
    }, { status: 500 });
  }
}

