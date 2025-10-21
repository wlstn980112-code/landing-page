import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

type IncomingMessage = {
  role: "user" | "model";
  content: string;
};

export async function POST(req: Request) {
  const startedAt = Date.now();
  try {
    const {
      messages,
      systemPrompt,
    }: { messages: IncomingMessage[]; systemPrompt?: string } =
      await req.json();

    if (!Array.isArray(messages)) {
      console.error("[chat] invalid payload: messages missing");
      return new Response(
        JSON.stringify({ error: "messages must be an array" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[chat] GEMINI_API_KEY is not set");
      return new Response(JSON.stringify({ error: "server not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("[chat] request start", {
      model: "gemini-2.5-flash",
      messagesCount: messages.length,
      hasSystemPrompt: Boolean(systemPrompt),
    });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const contents = [
      ...(systemPrompt
        ? [{ role: "user" as const, parts: [{ text: systemPrompt }] }]
        : []),
      ...messages.map((m) => ({ role: m.role, parts: [{ text: m.content }] })),
    ];

    const result = await model.generateContentStream({
      contents,
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 2048,
      },
    });

    const encoder = new TextEncoder();
    let byteCount = 0;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        console.log("[chat] stream start");
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              const payload = encoder.encode(text);
              byteCount += payload.byteLength;
              controller.enqueue(payload);
            }
          }
          controller.close();
          console.log("[chat] stream end", {
            durationMs: Date.now() - startedAt,
            bytes: byteCount,
          });
        } catch (err) {
          console.error("[chat] stream error", err);
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[chat] handler error", error);
    return new Response(JSON.stringify({ error: "internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
