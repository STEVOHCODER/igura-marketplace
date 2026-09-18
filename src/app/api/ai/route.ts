import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, listModels, isConfigured, getModel } from "@/lib/openrouter";
import { getTokenFromRequest } from "@/lib/auth";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // Config introspection is admin-only — it reveals which models and keys are wired up.
  const session = await getTokenFromRequest(request);
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

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

/** Hard ceiling on prompt size, so one request can't burn a large budget. */
const MAX_PROMPT_CHARS = 4000;

export async function POST(request: NextRequest) {
  try {
    // This route spends real money against OPENROUTER_API_KEY. It used to be
    // unauthenticated and unmetered — an open proxy anyone could bill to you.
    const session = await getTokenFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const limited = enforceRateLimit(
      request,
      "ai",
      LIMITS.ai.limit,
      LIMITS.ai.windowMs,
      session.userId
    );
    if (limited) return limited;

    if (!isConfigured()) {
      return NextResponse.json(
        { error: "OpenRouter API key not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { prompt, systemPrompt } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    if (prompt.length > MAX_PROMPT_CHARS) {
      return NextResponse.json(
        { error: `Prompt is too long (max ${MAX_PROMPT_CHARS} characters).` },
        { status: 400 }
      );
    }

    const messages = [];
    if (systemPrompt && typeof systemPrompt === "string") {
      messages.push({ role: "system" as const, content: systemPrompt.slice(0, MAX_PROMPT_CHARS) });
    }
    messages.push({ role: "user" as const, content: prompt });

    const response = await chatCompletion({
      // The caller no longer picks the model — an arbitrary `model` string let
      // anyone route their traffic to the most expensive model available.
      model: getModel("default"),
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
    console.error("AI route error:", error);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
