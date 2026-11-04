Bun.serve({
  port: 3000,
  routes: {
    "/v1/chat/completions": {
      POST: async (req) => {
        console.log(`[${new Date().toISOString()}] POST /v1/chat/completions`);
        const body = await req.json() as { model?: string; messages?: { role: string; content: string }[]; stream?: boolean };
        const { model, messages, stream } = body;
        console.log(`[${new Date().toISOString()}] Model: ${model || "llama3.1-8B"}, Stream: ${stream}, Messages: ${messages?.length || 0}`);

        console.log(`[${new Date().toISOString()}] Forwarding to chatjimmy.ai...`);
        const jimmyRes = await fetch("https://chatjimmy.ai/api/chat", {
          method: "POST",
          headers: {
            "accept": "*/*",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/json",
            "origin": "https://chatjimmy.ai",
            "priority": "u=1, i",
            "referer": "https://chatjimmy.ai/",
            "sec-ch-ua": '"Not(A:Brand";v="8", "Chromium";v="144", "Microsoft Edge";v="144"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"macOS"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0",
          },
          body: JSON.stringify({
            messages: messages,
            chatOptions: {
              selectedModel: model || "llama3.1-8B",
              systemPrompt: "",
              topK: 8,
            },
            attachment: null,
          }),
        });

        const text = await jimmyRes.text();
        console.log(`[${new Date().toISOString()}] Response received, length: ${text.length}`);
        
        let content = text;
        let stats = null;
        const statsMatch = text.match(/<\|stats\|>([\s\S]*?)<\|\/stats\|>/);
        if (statsMatch) {
          content = text.split("<|stats|>")[0];
          try {
            stats = JSON.parse(statsMatch[1]);
            console.log(`[${new Date().toISOString()}] Parsed stats:`, stats);
          } catch (e) {
            console.log(`[${new Date().toISOString()}] Failed to parse stats JSON`);
          }
        }

        if (stream) {
          console.log(`[${new Date().toISOString()}] Returning streaming response`);
          const encoder = new TextEncoder();
          const sseId = `chatcmpl-${Date.now()}`;
          
          const streamData = `data: ${JSON.stringify({
            id: sseId,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model: model || "llama3.1-8B",
            choices: [{
              index: 0,
              delta: { content },
              finish_reason: "stop",
            }],
          })}\n\ndata: [DONE]\n\n`;

          return new Response(streamData, {
            headers: {
              "Content-Type": "text/event-stream",
            },
          });
        }

        console.log(`[${new Date().toISOString()}] Returning non-streaming response`);
        return Response.json({
          id: `chatcmpl-${Date.now()}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: model || "llama3.1-8B",
          choices: [{
            index: 0,
            message: {
              role: "assistant",
              content,
            },
            finish_reason: "stop",
          }],
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
        });
      },
    },
    "/v1/models": {
      GET: () => {
        console.log(`[${new Date().toISOString()}] GET /v1/models`);
        return Response.json({
        object: "list",
        data: [
          {
            id: "llama3.1-8B",
            object: "model",
            created: 1720569600,
            owned_by: "library",
          },
        ],
      });
      },
    },
  },
});

console.log("Server running on http://localhost:3000");
