import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Production-hardened Gemini fallback chain: highest quota, lowest latency, zero experimental 404/preview bottlenecks
const GEMINI_FALLBACK_CHAIN = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
  'gemini-2.5-pro',
  'gemini-3.1-flash-lite',
  'gemini-3.1-pro-preview',
];

const OPENROUTER_FALLBACK_CHAIN = [
  'openrouter/free',
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-3.5-lightning:free',
];

function isRecoverableModelError(errMsg: string): boolean {
  const lower = errMsg.toLowerCase();
  return (
    errMsg.includes('503') ||
    errMsg.includes('429') ||
    errMsg.includes('404') ||
    errMsg.includes('500') ||
    errMsg.includes('502') ||
    errMsg.includes('504') ||
    lower.includes('unavailable') ||
    lower.includes('high demand') ||
    lower.includes('overloaded') ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('not found') ||
    lower.includes('not supported')
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  const resolveApiKey = () => {
    const raw =
      process.env.GEMINI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.API_KEY ||
      '';
    return raw.replace(/^["']|["']$/g, '').trim();
  };

  const getGeminiClient = () => {
    const apiKey = resolveApiKey();
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  app.get('/api/gemini/status', (_req, res) => {
    const hasKey = Boolean(resolveApiKey());
    const hasOpenRouterKey = Boolean(
      (
        process.env.OPENROUTER_API_KEY ||
        process.env.VITE_OPENROUTER_API_KEY ||
        process.env.QWEN_API_KEY ||
        ''
      ).trim()
    );
    res.json({
      connected: hasKey,
      openRouterConnected: hasOpenRouterKey,
      provider: 'gemini',
      source: hasKey ? 'vercel_env' : 'none',
    });
  });

  app.post('/api/openrouter/stream', async (req, res) => {
    const {
      model = 'openrouter/free',
      messages = [],
      temperature = 0.2,
      topP = 0.95,
      endpoint = 'https://openrouter.ai/api/v1/chat/completions',
    } = req.body || {};

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    const sendEvent = (payload: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
      if (typeof (res as unknown as { flush?: () => void }).flush === 'function') {
        (res as unknown as { flush: () => void }).flush();
      }
    };

    try {
      const apiKey = (
        process.env.OPENROUTER_API_KEY ||
        process.env.VITE_OPENROUTER_API_KEY ||
        process.env.QWEN_API_KEY ||
        ''
      )
        .replace(/^["']|["']$/g, '')
        .trim();

      const targetEndpoint =
        endpoint && typeof endpoint === 'string' && endpoint.startsWith('http')
          ? endpoint
          : 'https://openrouter.ai/api/v1/chat/completions';

      const candidateModels = [
        model,
        ...OPENROUTER_FALLBACK_CHAIN.filter((m) => m !== model),
      ];

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
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
          'X-Title': 'MYPAK Sheet Pricing Calculator',
        };
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const upstreamRes = await fetch(targetEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: candidate,
            messages,
            temperature: Number(temperature),
            top_p: Number(topP),
            stream: true,
          }),
        });

        if (!upstreamRes.ok || !upstreamRes.body) {
          lastStatus = upstreamRes.status;
          const errBody = await upstreamRes.text().catch(() => '');
          lastErrorMsg = errBody || `HTTP ${upstreamRes.status}`;

          if (
            upstreamRes.status === 429 ||
            upstreamRes.status === 502 ||
            upstreamRes.status === 503 ||
            upstreamRes.status === 504 ||
            upstreamRes.status === 404 ||
            isRecoverableModelError(lastErrorMsg)
          ) {
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
              // Ignore malformed line
            }
          }

          if (streamErrorOccurred) break;
        }

        if (streamErrorOccurred) {
          if (isRecoverableModelError(lastErrorMsg) || lastStatus === 429 || lastStatus === 503) {
            continue;
          } else {
            break;
          }
        }

        succeeded = true;
        break;
      }

      if (!succeeded) {
        // Automatic cross-provider rescue using server Gemini client so OpenRouter tab works out-of-the-box even before OPENROUTER_API_KEY is added
        const geminiKey = resolveApiKey();
        if (geminiKey) {
          const ai = getGeminiClient();
          const systemMsg = messages.find((m: { role: string }) => m.role === 'system');
          const chatMsgs = messages.filter((m: { role: string }) => m.role !== 'system');
          const formattedContents = chatMsgs.map((m: { role: string; content: string }) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: String(m.content || ' ') }],
          }));

          for (const backupModel of GEMINI_FALLBACK_CHAIN) {
            try {
              sendEvent({
                type: 'model_switched',
                fromModel: model,
                toModel: backupModel,
              });
              const stream = await ai.models.generateContentStream({
                model: backupModel,
                contents:
                  formattedContents.length > 0
                    ? formattedContents
                    : [{ role: 'user', parts: [{ text: 'Halo' }] }],
                config: {
                  temperature: Number(temperature),
                  topP: Number(topP),
                  systemInstruction: systemMsg?.content
                    ? String(systemMsg.content)
                    : undefined,
                },
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
              // Try next Gemini model in chain
            }
          }
        }
      }

      if (!succeeded) {
        sendEvent({
          type: 'error',
          isRateLimit: lastStatus === 429 || lastStatus === 503,
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
  });

  app.post('/api/gemini/stream', async (req, res) => {
    const {
      model = 'gemini-2.5-flash',
      messages = [],
      systemInstruction = '',
      temperature = 0.2,
      topP = 0.95,
      useSearchGrounding = false,
    } = req.body || {};

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    const sendEvent = (payload: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
      if (typeof (res as unknown as { flush?: () => void }).flush === 'function') {
        (res as unknown as { flush: () => void }).flush();
      }
    };

    try {
      const ai = getGeminiClient();

      const formattedContents = messages.map(
        (m: {
          role: 'user' | 'assistant';
          content: string;
          images?: Array<{ mimeType: string; data: string }>;
        }) => {
          const parts: Array<
            | { text: string }
            | { inlineData: { mimeType: string; data: string } }
          > = [];

          if (Array.isArray(m.images)) {
            for (const img of m.images) {
              if (img.data && img.mimeType) {
                parts.push({
                  inlineData: {
                    mimeType: img.mimeType,
                    data: img.data,
                  },
                });
              }
            }
          }

          if (m.content) {
            parts.push({ text: m.content });
          } else if (parts.length === 0) {
            parts.push({ text: ' ' });
          }

          return {
            role: m.role === 'assistant' ? 'model' : 'user',
            parts,
          };
        }
      );

      const runStreamWithModel = async (
        targetModel: string,
        enableSearch: boolean
      ) => {
        const configObj: Record<string, unknown> = {
          temperature: Number(temperature),
          topP: Number(topP),
        };

        if (systemInstruction && systemInstruction.trim()) {
          configObj.systemInstruction = systemInstruction.trim();
        }

        if (enableSearch) {
          configObj.tools = [{ googleSearch: {} }];
        }

        const responseStream = await ai.models.generateContentStream({
          model: targetModel,
          contents: formattedContents,
          config: configObj,
        });

        for await (const chunk of responseStream) {
          const c = chunk as GenerateContentResponse;
          const textChunk = c.text;
          if (textChunk) {
            sendEvent({ type: 'chunk', text: textChunk, activeModel: targetModel });
          }
        }
      };

      // Build ordered candidate list starting with requested model, followed by fallback chain
      const candidateModels = [
        model,
        ...GEMINI_FALLBACK_CHAIN.filter((m) => m !== model),
      ];

      let succeeded = false;
      let lastError: unknown = null;

      for (let i = 0; i < candidateModels.length; i++) {
        const candidate = candidateModels[i];
        const isFallbackAttempt = i > 0;

        try {
          if (isFallbackAttempt) {
            // Notify client that we automatically switched model due to high demand / limit
            sendEvent({
              type: 'model_switched',
              fromModel: candidateModels[i - 1],
              toModel: candidate,
            });
          }

          await runStreamWithModel(
            candidate,
            i === 0 ? Boolean(useSearchGrounding) : false
          );
          succeeded = true;
          break;
        } catch (attemptErr: unknown) {
          lastError = attemptErr;
          const errMsg =
            attemptErr instanceof Error ? attemptErr.message : String(attemptErr);

          // If search grounding caused a 400 on the primary model, retry same model without search
          if (
            i === 0 &&
            useSearchGrounding &&
            (errMsg.includes('400') ||
              errMsg.toLowerCase().includes('tool') ||
              errMsg.toLowerCase().includes('search'))
          ) {
            try {
              await runStreamWithModel(candidate, false);
              succeeded = true;
              break;
            } catch (retryWithoutSearchErr: unknown) {
              lastError = retryWithoutSearchErr;
            }
          }

          const latestMsg =
            lastError instanceof Error ? lastError.message : String(lastError);
          if (!isRecoverableModelError(latestMsg)) {
            break;
          }
          // Otherwise continue loop to next fallback model automatically!
        }
      }

      if (!succeeded && lastError) {
        throw lastError;
      }

      sendEvent({ type: 'done' });
      res.end();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const isRateLimit =
        errMsg.includes('429') ||
        errMsg.includes('503') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.toLowerCase().includes('quota') ||
        errMsg.toLowerCase().includes('high demand');

      sendEvent({
        type: 'error',
        isRateLimit,
        model,
        message: isRateLimit
          ? 'Seluruh model cadangan sedang mengalami antrean tinggi (429/503). Silakan coba beberapa saat lagi.'
          : errMsg,
      });
      res.end();
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
