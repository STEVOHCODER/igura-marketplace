import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, listModels, isConfigured, getModel } from "@/lib/openrouter";

export async function GET() {
  try {
    if (!isConfigured()) {
      return NextResponse.json({
        configured: false,
        error: "OpenRouter API key not configured. Add OPENROUTER_API_KEY to .env",
      });
    }

    const models = await listModels();
    return NextResponse.json({
      configured: true,
      modelsCount: models.length,
      defaultModel: getModel("default"),
      chatModel: getModel("chat"),
      codeModel: getModel("code"),
      fastModel: getModel("fast"),
    });
  } catch (error: any) {
    return NextResponse.json({
      configured: false,
      error: error.message,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isConfigured()) {
      return NextResponse.json(
        { error: "OpenRouter API key not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { prompt, systemPrompt, model } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const messages = [];
    if (systemPrompt) messages.push({ role: "system" as const, content: systemPrompt });
    messages.push({ role: "user" as const, content: prompt });

    const response = await chatCompletion({
      model: model || getModel("default"),
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    });

    return NextResponse.json({
      response: response.choices[0]?.message?.content,
      usage: response.usage,
      model: response.model,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
