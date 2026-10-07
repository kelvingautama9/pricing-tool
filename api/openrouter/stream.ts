import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

export const config = {
  runtime: 'nodejs',
};

// Verified active 2026 OpenRouter free models + openrouter/free router
const OPENROUTER_FALLBACK_CHAIN = [
  'openrouter/free',
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-3.5-lightning:free',
];

const GEMINI_BACKUP_CHAIN = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
];

function isRecoverableOpenRouterError(status: number, errMsg: string): boolean {
  const lower = errMsg.toLowerCase();
  return (
    status === 400 ||
    status === 401 ||
    status === 402 ||
    status === 403 ||
    status === 404 ||
    status === 408 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    lower.includes('unavailable') ||
    lower.includes('rate limit') ||
    lower.includes('overloaded') ||
    lower.includes('provider returned error') ||
    lower.includes('no endpoints found') ||
    lower.includes('quota') ||
    lower.includes('not found')
  );
}

function resolveOpenRouterApiKey(): string {
  const raw =
    process.env.OPENROUTER_API_KEY ||
    process.env.VITE_OPENROUTER_API_KEY ||
    process.env.QWEN_API_KEY ||
    '';
  return raw.replace(/^["']|["']$/g, '').trim();
}

function resolveGeminiBackupKey(): string {
  const raw =
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.API_KEY ||
    '';
  return raw.replace(/^["']|["']$/g, '').trim();
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const parsedBody =
    typeof req.body === 'string'
      ? (() => {
          try {
            return JSON.parse(req.body);
          } catch {
            return {};
          }
        })()
      : req.body || {};

  const {
    model = 'openrouter/free',
    messages = [],
    temperature = 0.2,
    topP = 0.95,
    endpoint = 'https://openrouter.ai/api/v1/chat/completions',
    useDeepReasoning = false,
  } = parsedBody;

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const sendEvent = (payload: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    if (typeof res.flush === 'function') {
      res.flush();
    }
  };

  try {
    const apiKey = resolveOpenRouterApiKey();
    const targetEndpoint =
      endpoint && typeof endpoint === 'string' && endpoint.startsWith('http')
        ? endpoint
        : 'https://openrouter.ai/api/v1/chat/completions';

    const shouldTryOpenRouter =
      Boolean(apiKey) || !targetEndpoint.includes('openrouter.ai');

    const candidateModels = shouldTryOpenRouter
      ? [
          model,
          ...OPENROUTER_FALLBACK_CHAIN.filter((m) => m !== model),
        ].slice(0, 3)
      : [];

    let succeeded = false;
    let lastErrorMsg = 'Gagal menghubungi server OpenRouter.';
    let lastStatus = 500;

    for (let i = 0; i < candidateModels.length; i++) {
      const candidate = candidateModels[i];
      if (i > 0) {
        sendEvent({
          type: 'model_switched',
          fromModel: candidateModels[i - 1],
          toModel: candidate,
        });
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'https://mypak-sheet-pricing.vercel.app',
        'X-Title': 'MYPAK Sheet Pricing Calculator',
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const attemptController = new AbortController();
      const timeoutId = setTimeout(() => attemptController.abort(), 5500);

      let upstreamRes: Response;
      try {
        upstreamRes = await fetch(targetEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: candidate,
            messages,
            temperature: Number(temperature),
            top_p: Number(topP),
            stream: true,
          }),
          signal: attemptController.signal,
        });
      } catch (fetchErr: unknown) {
        clearTimeout(timeoutId);
        lastStatus = 408;
        lastErrorMsg =
          fetchErr instanceof Error ? fetchErr.message : 'Timeout OpenRouter';
        continue;
      }
      clearTimeout(timeoutId);

      if (!upstreamRes.ok || !upstreamRes.body) {
        lastStatus = upstreamRes.status;
        const errBody = await upstreamRes.text().catch(() => '');
        lastErrorMsg = errBody || `HTTP ${upstreamRes.status}`;

        if (isRecoverableOpenRouterError(upstreamRes.status, lastErrorMsg)) {
          continue;
        } else {
          break;
        }
      }

      const reader = upstreamRes.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let receivedAnyChunk = false;
      let streamErrorOccurred = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith('data:')) continue;
          const dataStr = line.replace(/^data:\s*/, '').trim();
          if (dataStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error) {
              lastErrorMsg =
                parsed.error.message || JSON.stringify(parsed.error);
              lastStatus = Number(parsed.error.code) || 503;
              if (!receivedAnyChunk) {
                streamErrorOccurred = true;
                break;
              }
            }
            const delta = parsed.choices?.[0]?.delta;
            if (delta) {
              const contentChunk = delta.content || '';
              const reasoningChunk = delta.reasoning_content || '';
              if (contentChunk || reasoningChunk) {
                receivedAnyChunk = true;
                sendEvent({
                  type: 'chunk',
                  text: contentChunk,
                  reasoning: reasoningChunk || undefined,
                  activeModel: candidate,
                });
              }
            }
          } catch {
            // Ignore malformed SSE lines
          }
        }

        if (streamErrorOccurred) break;
      }

      if (streamErrorOccurred) {
        if (isRecoverableOpenRouterError(lastStatus, lastErrorMsg)) {
          continue;
        } else {
          break;
        }
      }

      succeeded = true;
      break;
    }

    if (!succeeded) {
      // Cross-provider automatic rescue via server GEMINI_API_KEY so the user never sees an error bubble
      const geminiKey = resolveGeminiBackupKey();
      if (geminiKey) {
        const ai = new GoogleGenAI({
          apiKey: geminiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });
        const systemMsg = messages.find((m: any) => m.role === 'system');
        const chatMsgs = messages.filter((m: any) => m.role !== 'system');
        const formattedContents = chatMsgs.map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(m.content || ' ') }],
        }));

        for (const backupModel of GEMINI_BACKUP_CHAIN) {
          try {
            sendEvent({
              type: 'model_switched',
              fromModel: model,
              toModel: backupModel,
            });
            const rescueConfig: Record<string, unknown> = {
              temperature: Number(temperature),
              topP: Number(topP),
              systemInstruction: systemMsg?.content
                ? String(systemMsg.content)
                : undefined,
            };
            if (
              !useDeepReasoning &&
              (backupModel.includes('2.5-flash') || backupModel.includes('flash-latest'))
            ) {
              rescueConfig.thinkingConfig = { thinkingBudget: 0 };
            }
            const stream = await ai.models.generateContentStream({
              model: backupModel,
              contents:
                formattedContents.length > 0
                  ? formattedContents
                  : [{ role: 'user', parts: [{ text: 'Halo' }] }],
              config: rescueConfig,
            });
            for await (const chunk of stream) {
              const c = chunk as GenerateContentResponse;
              if (c.text) {
                sendEvent({
                  type: 'chunk',
                  text: c.text,
                  activeModel: backupModel,
                });
              }
            }
            succeeded = true;
            break;
          } catch {
            // Try next backup model
          }
        }
      }
    }

    if (!succeeded) {
      const isRateLimit = lastStatus === 429 || lastStatus === 503;
      sendEvent({
        type: 'error',
        isRateLimit,
        model,
        message: !apiKey
          ? 'OPENROUTER_API_KEY belum dikonfigurasi di Environment Variables server/Vercel.'
          : `Seluruh model OpenRouter sedang sibuk (${lastStatus}): ${lastErrorMsg.slice(0, 180)}`,
      });
      res.end();
      return;
    }

    sendEvent({ type: 'done' });
    res.end();
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    sendEvent({
      type: 'error',
      isRateLimit: errMsg.includes('429') || errMsg.includes('503'),
      model,
      message: errMsg,
    });
    res.end();
  }
}
