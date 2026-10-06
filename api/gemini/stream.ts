import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

export const config = {
  runtime: 'nodejs',
};

const GEMINI_FALLBACK_CHAIN = [
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
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

function resolveServerApiKey(): string {
  const raw =
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
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
    model = 'gemini-3.8-flash',
    messages = [],
    systemInstruction = '',
    temperature = 0.4,
    topP = 0.95,
    useSearchGrounding = false,
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
    const apiKey = resolveServerApiKey();
    if (!apiKey) {
      sendEvent({
        type: 'error',
        isMissingKey: true,
        model,
        message:
          'Variabel GEMINI_API_KEY belum terbaca pada deployment Vercel ini. Karena Anda baru menambahkan GEMINI_API_KEY di Vercel Settings > Environment Variables, silakan buka tab "Deployments" di Vercel lalu klik titik tiga (...) > "Redeploy" (atau lakukan git push baru) agar kunci API aktif di server.',
      });
      res.end();
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

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
}
