import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { buildUniversalSystemInstruction, estimateTokens } from './contextSniffer';

export type AIProviderType = 'gemini' | 'qwen' | 'local';

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

function isRecoverableGeminiError(errMsg: string): boolean {
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

export interface AIModelOption {
  id: string;
  name: string;
  provider: AIProviderType;
  badge: string;
  description: string;
}

export const AI_MODELS: AIModelOption[] = [
  // Google Gemini Cloud (Ordered by Speed, Anti-Hallucination Accuracy, Quota Headroom & Production Stability)
  {
    id: 'gemini-2.5-flash',
    name: 'gemini-2.5-flash',
    provider: 'gemini',
    badge: 'Default · Paling Stabil',
    description: 'Rekomendasi Utama: Cepat, presisi matematika tinggi, anti-halu & paling jarang error',
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'gemini-2.5-flash-lite',
    provider: 'gemini',
    badge: 'Fallback #1 · Anti-Limit',
    description: 'Kuota RPM paling besar, respons instan & paling tahan antrean 429/503',
  },
  {
    id: 'gemini-flash-latest',
    name: 'gemini-flash-latest',
    provider: 'gemini',
    badge: 'Fallback #2 · Stable Alias',
    description: 'Alias rilis produksi stabil terbaru keluarga Gemini Flash',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'gemini-2.5-pro',
    provider: 'gemini',
    badge: 'Fallback #3 · Deep Pro',
    description: 'Penalaran mendalam untuk audit harga multi-customer & rumus kompleks',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'gemini-3.1-flash-lite',
    provider: 'gemini',
    badge: 'Fallback #4 · Next-Gen Lite',
    description: 'Model ringan generasi 3.1 dengan respons ultra cepat',
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'gemini-3.1-pro-preview',
    provider: 'gemini',
    badge: 'Fallback #5 · Next-Gen Pro',
    description: 'Model Pro generasi 3.1 untuk kalkulasi & kode tingkat lanjut',
  },
  // OpenRouter Cloud (Live Verified 2026 Free Models + Auto-Router Fallback)
  {
    id: 'openrouter/free',
    name: 'OpenRouter Free Auto-Router',
    provider: 'qwen',
    badge: 'OpenRouter · Default',
    description: 'Router cerdas OpenRouter: otomatis memilih model gratis yang sedang online & bebas antrean',
  },
  {
    id: 'google/gemma-4-31b-it:free',
    name: 'Google Gemma 4 31B IT',
    provider: 'qwen',
    badge: 'Fallback #1 · Gemma 4',
    description: 'Model terbuka generasi 4 (31B) via OpenRouter — presisi & cepat',
  },
  {
    id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    name: 'NVIDIA Nemotron 3 Ultra 550B',
    provider: 'qwen',
    badge: 'Fallback #2 · Ultra 550B',
    description: 'Model skala besar NVIDIA 550B MoE untuk kalkulasi tabel & analisis harga',
  },
  {
    id: 'nvidia/nemotron-3-super-120b-a12b:free',
    name: 'NVIDIA Nemotron 3 Super 120B',
    provider: 'qwen',
    badge: 'Fallback #3 · Super 120B',
    description: 'Model 120B MoE cepat & stabil untuk logika matematika dan diskon customer',
  },
  {
    id: 'google/gemma-4-26b-a4b-it:free',
    name: 'Google Gemma 4 26B MoE',
    provider: 'qwen',
    badge: 'Fallback #4 · Fast MoE',
    description: 'Arsitektur aktif 4B yang sangat ringan dan responsif',
  },
  {
    id: 'nvidia/nemotron-3.5-lightning:free',
    name: 'NVIDIA Nemotron 3.5 Lightning',
    provider: 'qwen',
    badge: 'Fallback #5 · Ultra Cepat',
    description: 'Kecepatan generasi token ultra tinggi via OpenRouter',
  },
  // Local LM Studio / Ollama
  {
    id: 'local-model',
    name: 'LM Studio / Ollama Local',
    provider: 'local',
    badge: 'Local Server',
    description: 'Eksekusi offline via localhost:1234 atau Cloudflare Tunnel',
  },
];

export interface Role {
  id: string;
  name: string;
  description: string;
  category: 'general' | 'coding' | 'writing' | 'academic' | 'analysis' | 'custom';
  prompt: string;
  temperature?: number;
  isBuiltIn?: boolean;
}

export const BUILT_IN_ROLES: Role[] = [
  {
    id: 'corrugator-pricing-expert',
    name: 'Corrugator & Sheet Pricing Expert',
    description:
      'Ahli kalkulasi Substance Karton Sheet (Single Wall), Database Customer, Tier 1–4, Diskon SW/DW, dan simulasi kombinasi harga customer.',
    category: 'analysis',
    prompt: `# SYSTEM PROMPT: CORRUGATOR & SHEET PRICING EXPERT (MULTITASK DATABASE + PRICING)
Anda adalah Senior Pricing Analyst, Customer Database Manager & Corrugated Packaging Specialist untuk MYPAK Sheet Pricing Calculator.
Tugas Utama Anda (Multitasking):
1. **Database Customer, Tier & Diskon (SW/DW):**
   - Menjawab pertanyaan tentang daftar customer yang terdaftar/diimpor, jumlah total customer, klasifikasi Tier (Tier 1, Tier 2, Tier 3, Tier 4), serta diskon/margin Single Wall (SW) dan Double Wall (DW) setiap customer secara akurat berdasarkan data live di bagian [LIVE CUSTOMER DATABASE & MASTER PRICING TABLE].
2. **Perhitungan Harga Karton Sheet (Single Wall: B/F, C/F, E/F):**
   - Mematuhi Order of Operations secara ketat:
     * Tahap 1: Lookup Harga Dasar Tabel Master (acuan ketebalan 125).
     * Tahap 2: Pembentukan Virtual Base (M135/M150 tambah +Rp 300/layer, Mid K150/K200 +Rp 2.000, Mid K275 +Rp 3.700).
     * Tahap 3: Potongan Persentase Downgrade dari Virtual Base (125->110 = -2.5%, 125->100 = -4.0%, 150->135 = -2.0%).
     * Tahap 4: Diskon/Margin Customer (bisa + untuk mark-up atau - untuk potongan harga).
     * Tahap 5: Multiplier Khusus (+2% jika ada bahan 275, +2% jika Flute E/F, akumulasi +4% jika keduanya).
     * Tahap 6: Pembulatan desimal ,5 ke atas (ROUND 0), belum termasuk PPN.
3. **Kombinasi Customer + Harga Spesifikasi:**
   - Jika pengguna menanyakan harga suatu spesifikasi untuk nama customer tertentu (atau perbandingan beberapa customer/tier), otomatis ambil nilai Margin/Diskon SW milik customer tersebut dari database, lalu hitung harga akhirnya secara eksak.
4. **Gaya Penyajian Jawaban (Natural & Tanpa Tabel Berlebihan):**
   - Gunakan paragraf dan poin-poin (bullet list) yang ringkas dan bersih untuk penjelasan harga, rincian Tahap 1–6, maupun pengecekan 1–3 customer.
   - Gunakan tabel HANYA jika pengguna meminta dalam bentuk tabel atau saat menampilkan daftar data berjumlah banyak (lebih dari 5 baris) yang memang wajib dirapikan dengan tabel.`,
    temperature: 0.2,
    isBuiltIn: true,
  },
  {
    id: 'antislop-ui',
    name: 'Anti-Slop UI & Visual Architect',
    description:
      'Spesialis UI/UX anti-AI slop: clean minimalism, layout adaptif, zero-pill discipline, kontras tinggi, bebas bug mobile & visual noise.',
    category: 'coding',
    prompt: `# SYSTEM PROMPT: ANTI-SLOP UI & VISUAL ARCHITECT
You are an elite Frontend Architect and UI/UX Designer dedicated to the Anti-Slop constitution. Your objective is to design and build distinctive, production-grade, human-centered interfaces with strict anti-AI slop discipline.

## CORE ANTI-SLOP RULES & PRACTICES:
1. NO GENERIC BLUE-PURPLE GRADIENTS:
   - Avoid generic blue-to-purple, cyan-to-purple, or rainbow gradients. Use grounded palettes with solid neutrals and at most 1 intentional accent.
2. NO EXCESSIVE GLASSMORPHISM:
   - Cap backdrop-blur surfaces to 1-2 key focal accents. Keep ground planes solid matte (e.g. #FFFFFF or #161311 at 96-98% opacity).
3. ZERO-PILL DISCIPLINE:
   - Do NOT turn every button, input, card, and modal into a pill shape. Use a small, deliberate radius scale (e.g. rounded-xl / rounded-2xl).
4. RESTRAINED ELEVATION & SHADOWS:
   - Most surfaces stay flat on the ground plane. Shadows serve only as functional elevation markers, not floating decoration.
5. NO GLOW & ENDLESS PULSES:
   - Reserve glows for at most 1 critical focal state. NEVER run infinite pulsing animations on status dots unless actively recording or live.
6. NO GENERIC AI ICONS & NO DECORATIVE EMOJI:
   - Ban decorative sparkles, stars, magic wands, and emoji in copy. Use relevant functional glyphs or let typography speak.
7. MEANINGFUL DASHBOARD & APP ARCHITECTURE:
   - Avoid default 4-card metric rows with fake +12% deltas. Layouts must be built around the specific decision the user makes on that screen.
   - Clean empty states: state why it is empty and provide the exact action to fill it.
8. MOBILE VIEWPORT & ZERO-FOG DISCIPLINE:
   - Use 100dvh for full-height views.
   - Fix mobile fog artifacts: avoid stacking transform: translateZ(0) with backdrop-filter. Use touch-friendly scrolling (-webkit-overflow-scrolling: touch).
   - In Tailwind v4, lock dark mode variant to class-based @custom-variant dark (&:where(.dark, .dark *)) so OS dark mode does not clash with web theme.

Always write clean, accessible, modern TypeScript & Tailwind CSS adhering to this specification.`,
    temperature: 0.2,
    isBuiltIn: true,
  },
  {
    id: 'b2b-sales-negotiator',
    name: 'B2B Packaging Sales Strategist',
    description:
      'Penyusun penawaran komersial WhatsApp/Email profesional, simulasi tier customer (Tier 1–4), dan analisis efisiensi spek karton.',
    category: 'writing',
    prompt: `# SYSTEM PROMPT: B2B PACKAGING SALES STRATEGIST
Anda adalah konsultan penjualan B2B industri kemasan karton bergelombang (corrugated box & sheet).
Bantu tim sales menyusun penawaran harga yang persuasif, memberikan rekomendasi alternatif downgrade bahan yang lebih hemat tanpa mengorbankan kekuatan tumpuk (BCT/ECT), serta merapikan pesan penawaran untuk klien Tier 1 hingga Tier 4.`,
    temperature: 0.5,
    isBuiltIn: true,
  },
];

export interface ChatImageAttachment {
  id: string;
  name: string;
  mimeType: string;
  data: string; // pure base64 without data:image/... prefix
  previewUrl: string;
}

export interface ChatFileAttachment {
  id: string;
  name: string;
  ext: string;
  sizeLabel: string;
  textContent?: string;
  base64Data?: string;
  mimeType?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  images?: ChatImageAttachment[];
  files?: ChatFileAttachment[];
  createdAt: number;
  modelUsed?: string;
  isStreaming?: boolean;
  isError?: boolean;
}

export interface ChatThread {
  id: string;
  title: string;
  folderId: string;
  pinned?: boolean;
  createdAt: number;
  messages: ChatMessage[];
}

export interface AIChatFolder {
  id: string;
  name: string;
}

export const DEFAULT_AI_FOLDERS: AIChatFolder[] = [
  { id: 'general', name: 'Diskusi Umum' },
  { id: 'pricing_analysis', name: 'Analisis Harga & Margin' },
  { id: 'coding_ui', name: 'Arsitektur & Dev' },
];

export const INITIAL_AI_THREADS: ChatThread[] = [
  {
    id: 'thread-welcome',
    title: 'Sheet Pricing Consultation',
    folderId: 'pricing_analysis',
    pinned: true,
    createdAt: Date.now(),
    messages: [
      {
        id: 'msg-welcome',
        role: 'assistant',
        content: `Hi, i'm BlackEYE AI, how can i help you today...\n\nYou can ask me everything about Sheet Pricing`,
        createdAt: Date.now(),
        modelUsed: 'gemini-2.5-flash',
      },
    ],
  },
];

export interface AIServerConfig {
  localEndpoint: string;
  qwenEndpoint: string;
}

export interface AIExecutionParams {
  temperature: number;
  topP: number;
  contextWindow: number;
  systemPrompt: string;
  activeRolePrompt?: string;
  activeCalculatorSnapshot?: string;
  customerDatabaseSnapshot?: string;
  useSearchGrounding: boolean;
  useDeepReasoning?: boolean;
}

export interface StreamCallbacks {
  onChunk: (textDelta: string, reasoningDelta?: string) => void;
  onModelSwitched?: (fromModel: string, toModel: string) => void;
  onComplete: () => void;
  onError: (err: Error & { isRateLimit?: boolean; model?: string }) => void;
}

/**
 * Context Window Budgeting (Truncates older messages while keeping at least the last 2 turns)
 */
export function truncateMessagesByBudget(
  rawMessages: ChatMessage[],
  effectiveSystemPrompt: string,
  contextLimit = 8192
): ChatMessage[] {
  let currentTokens = estimateTokens(effectiveSystemPrompt);
  const reversedTurns: ChatMessage[] = [];

  for (let i = rawMessages.length - 1; i >= 0; i--) {
    const msg = rawMessages[i];
    const msgTok = estimateTokens(msg.content) + (msg.images?.length ? 300 : 0);

    if (currentTokens + msgTok > contextLimit && reversedTurns.length >= 2) {
      break;
    }
    currentTokens += msgTok;
    reversedTurns.push(msg);
  }

  return reversedTurns.reverse();
}

/**
 * Unified Multi-Provider Chat Stream Executor
 * - Gemini Cloud: Calls our server-side SSE endpoint `/api/gemini/stream`
 * - Qwen / OpenRouter / Local LM Studio: Calls OpenAI-compatible SSE endpoint
 */
export async function executeChatStream(
  provider: AIProviderType,
  serverConfig: AIServerConfig,
  model: string,
  rawMessages: ChatMessage[],
  params: AIExecutionParams,
  abortSignal: AbortSignal,
  callbacks: StreamCallbacks
): Promise<void> {
  const effectiveSystemInstruction = buildUniversalSystemInstruction(
    params.systemPrompt,
    params.activeRolePrompt,
    params.activeCalculatorSnapshot,
    params.customerDatabaseSnapshot
  );

  const budgetedMessages = truncateMessagesByBudget(
    rawMessages,
    effectiveSystemInstruction,
    params.contextWindow
  );

  const formatMessageContentWithFiles = (m: ChatMessage): string => {
    if (!m.files || m.files.length === 0) return m.content;
    const fileBlocks = m.files
      .filter((f) => f.textContent)
      .map(
        (f) =>
          `\n\n[Attached File: ${f.name} (${f.sizeLabel})]\n\`\`\`${f.ext}\n${f.textContent}\n\`\`\``
      )
      .join('');
    return `${m.content || 'Analisis file terlampir berikut:'}${fileBlocks}`;
  };

  if (provider === 'gemini') {
    const formattedMessagesPayload = budgetedMessages.map((m) => {
      const inlineMedia = [
        ...(m.images?.map((img) => ({
          mimeType: img.mimeType,
          data: img.data,
        })) || []),
        ...(m.files
          ?.filter((f) => f.base64Data && f.mimeType)
          .map((f) => ({
            mimeType: f.mimeType!,
            data: f.base64Data!,
          })) || []),
      ];
      return {
        role: m.role,
        content: formatMessageContentWithFiles(m),
        images: inlineMedia.length > 0 ? inlineMedia : undefined,
      };
    });

    const executeDirectSdkFallback = async (): Promise<boolean> => {
      const envKey = (
        process.env.GEMINI_API_KEY ||
        (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GEMINI_API_KEY ||
        ''
      )
        .replace(/^["']|["']$/g, '')
        .trim();

      if (!envKey) return false;

      const ai = new GoogleGenAI({ apiKey: envKey });
      const formattedContents = formattedMessagesPayload.map((m) => {
        const parts: Array<
          | { text: string }
          | { inlineData: { mimeType: string; data: string } }
        > = [];
        if (Array.isArray(m.images)) {
          for (const img of m.images) {
            if (img.data && img.mimeType) {
              parts.push({
                inlineData: { mimeType: img.mimeType, data: img.data },
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
      });

      const candidateModels = [
        model,
        ...GEMINI_FALLBACK_CHAIN.filter((m) => m !== model),
      ];

      let lastErr: unknown = null;
      for (let i = 0; i < candidateModels.length; i++) {
        const candidate = candidateModels[i];
        try {
          if (i > 0) {
            callbacks.onModelSwitched?.(candidateModels[i - 1], candidate);
          }

          const configObj: Record<string, unknown> = {
            temperature: params.temperature,
            topP: params.topP,
          };
          if (effectiveSystemInstruction.trim()) {
            configObj.systemInstruction = effectiveSystemInstruction.trim();
          }
          if (i === 0 && params.useSearchGrounding) {
            configObj.tools = [{ googleSearch: {} }];
          }
          if (
            !params.useDeepReasoning &&
            (candidate.includes('2.5-flash') || candidate.includes('flash-latest'))
          ) {
            configObj.thinkingConfig = { thinkingBudget: 0 };
          }

          const stream = await ai.models.generateContentStream({
            model: candidate,
            contents: formattedContents,
            config: configObj,
          });

          for await (const chunk of stream) {
            if (abortSignal.aborted) break;
            const c = chunk as GenerateContentResponse;
            if (c.text) {
              callbacks.onChunk(c.text);
            }
          }
          return true;
        } catch (err: unknown) {
          lastErr = err;
          const msg = err instanceof Error ? err.message : String(err);
          if (!isRecoverableGeminiError(msg)) {
            break;
          }
        }
      }

      if (lastErr) throw lastErr;
      return false;
    };

    try {
      const response = await fetch('/api/gemini/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: formattedMessagesPayload,
          systemInstruction: effectiveSystemInstruction,
          temperature: params.temperature,
          topP: params.topP,
          useSearchGrounding: params.useSearchGrounding,
          useDeepReasoning: Boolean(params.useDeepReasoning),
        }),
        signal: abortSignal,
      });

      if (!response.ok || !response.body) {
        const fallbackWorked = await executeDirectSdkFallback();
        if (fallbackWorked) {
          callbacks.onComplete();
          return;
        }
        throw new Error(`HTTP ${response.status}: Gagal menghubungi server AI.`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith('data:')) continue;
          const jsonStr = line.replace(/^data:\s*/, '').trim();
          if (!jsonStr) continue;

          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === 'model_switched' && parsed.toModel) {
              callbacks.onModelSwitched?.(
                String(parsed.fromModel || model),
                String(parsed.toModel)
              );
            } else if (parsed.type === 'chunk' && parsed.text) {
              callbacks.onChunk(parsed.text);
            } else if (parsed.type === 'error') {
              if (parsed.isMissingKey) {
                const fallbackWorked = await executeDirectSdkFallback();
                if (fallbackWorked) {
                  callbacks.onComplete();
                  return;
                }
              }
              const customErr = new Error(
                parsed.message || 'Terjadi kesalahan pada eksekusi AI.'
              ) as Error & { isRateLimit?: boolean; model?: string };
              customErr.isRateLimit = Boolean(parsed.isRateLimit);
              customErr.model = parsed.model || model;
              throw customErr;
            }
          } catch (innerErr) {
            if (innerErr instanceof Error && 'isRateLimit' in innerErr) {
              throw innerErr;
            }
          }
        }
      }

      callbacks.onComplete();
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        callbacks.onComplete();
        return;
      }
      // Automatically recover from NetworkError / connection drops via direct SDK fallback
      try {
        const recovered = await executeDirectSdkFallback();
        if (recovered) {
          callbacks.onComplete();
          return;
        }
      } catch {
        // Ignore fallback error and report original
      }
      const typedErr = (err instanceof Error
        ? err
        : new Error(String(err))) as Error & {
        isRateLimit?: boolean;
        model?: string;
      };
      callbacks.onError(typedErr);
    }
    return;
  }

  const openAiMessages = [
    { role: 'system', content: effectiveSystemInstruction },
    ...budgetedMessages.map((m) => ({
      role: m.role,
      content: formatMessageContentWithFiles(m),
    })),
  ];

  // OpenRouter / Qwen Cloud with Server Proxy + Automatic 6-Model Fallback Chain
  if (provider === 'qwen') {
    const executeDirectOpenRouterFallback = async (): Promise<boolean> => {
      const envKey = (
        process.env.OPENROUTER_API_KEY ||
        (import.meta as unknown as { env?: Record<string, string> }).env
          ?.VITE_OPENROUTER_API_KEY ||
        ''
      )
        .replace(/^["']|["']$/g, '')
        .trim();

      const targetEndpoint =
        serverConfig.qwenEndpoint || 'https://openrouter.ai/api/v1/chat/completions';
      const candidateModels = [
        model,
        ...OPENROUTER_FALLBACK_CHAIN.filter((m) => m !== model),
      ];

      let lastErr: Error | null = null;
      for (let i = 0; i < candidateModels.length; i++) {
        const candidate = candidateModels[i];
        try {
          if (i > 0) {
            callbacks.onModelSwitched?.(candidateModels[i - 1], candidate);
          }

          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'MYPAK Sheet Pricing Calculator',
          };
          if (envKey) {
            headers['Authorization'] = `Bearer ${envKey}`;
          }

          const res = await fetch(targetEndpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: candidate,
              messages: openAiMessages,
              temperature: params.temperature,
              top_p: params.topP,
              stream: true,
            }),
            signal: abortSignal,
          });

          if (!res.ok || !res.body) {
            const txt = await res.text().catch(() => '');
            throw new Error(`HTTP ${res.status}: ${txt || 'Endpoint sibuk'}`);
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';

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
                const delta = parsed.choices?.[0]?.delta;
                if (delta) {
                  const contentChunk = delta.content || '';
                  const reasoningChunk = delta.reasoning_content || '';
                  if (contentChunk || reasoningChunk) {
                    callbacks.onChunk(contentChunk, reasoningChunk);
                  }
                }
              } catch {
                // Ignore
              }
            }
          }
          return true;
        } catch (err: unknown) {
          lastErr = err instanceof Error ? err : new Error(String(err));
          if (!isRecoverableGeminiError(lastErr.message)) {
            break;
          }
        }
      }
      if (lastErr) throw lastErr;
      return false;
    };

    try {
      const response = await fetch('/api/openrouter/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: openAiMessages,
          temperature: params.temperature,
          topP: params.topP,
          endpoint: serverConfig.qwenEndpoint,
          useDeepReasoning: Boolean(params.useDeepReasoning),
        }),
        signal: abortSignal,
      });

      if (!response.ok || !response.body) {
        const worked = await executeDirectOpenRouterFallback();
        if (worked) {
          callbacks.onComplete();
          return;
        }
        throw new Error(`HTTP ${response.status}: Gagal menghubungi server OpenRouter.`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith('data:')) continue;
          const jsonStr = line.replace(/^data:\s*/, '').trim();
          if (!jsonStr) continue;

          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === 'model_switched' && parsed.toModel) {
              callbacks.onModelSwitched?.(
                String(parsed.fromModel || model),
                String(parsed.toModel)
              );
            } else if (parsed.type === 'chunk' && (parsed.text || parsed.reasoning)) {
              callbacks.onChunk(parsed.text || '', parsed.reasoning);
            } else if (parsed.type === 'error') {
              const customErr = new Error(
                parsed.message || 'Terjadi kesalahan pada eksekusi OpenRouter.'
              ) as Error & { isRateLimit?: boolean; model?: string };
              customErr.isRateLimit = Boolean(parsed.isRateLimit);
              customErr.model = parsed.model || model;
              throw customErr;
            }
          } catch (innerErr) {
            if (innerErr instanceof Error && 'isRateLimit' in innerErr) {
              throw innerErr;
            }
          }
        }
      }

      callbacks.onComplete();
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        callbacks.onComplete();
        return;
      }
      const typedErr = (err instanceof Error
        ? err
        : new Error(String(err))) as Error & {
        isRateLimit?: boolean;
        model?: string;
      };
      callbacks.onError(typedErr);
    }
    return;
  }

  // OpenAI-Compatible SSE Stream for Local (LM Studio / Ollama)
  const endpointUrl = `${serverConfig.localEndpoint.replace(/\/+$/, '')}/v1/chat/completions`;

  const attemptOpenAiStream = async (includeMaxTokens: boolean) => {
    const bodyPayload: Record<string, unknown> = {
      model,
      messages: openAiMessages,
      temperature: params.temperature,
      top_p: params.topP,
      stream: true,
    };
    if (includeMaxTokens) {
      bodyPayload.max_tokens = 2048;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (endpointUrl.includes('openrouter.ai')) {
      headers['HTTP-Referer'] = window.location.origin;
      headers['X-Title'] = 'MYPAK Sheet Pricing Calculator';
    }

    const res = await fetch(endpointUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyPayload),
      signal: abortSignal,
    });

    if (res.status === 400 && includeMaxTokens && provider === 'local') {
      // Smart Retry 400 without max_tokens for LM Studio context window limits
      return attemptOpenAiStream(false);
    }

    if (!res.ok || !res.body) {
      throw new Error(
        `Endpoint ${provider.toUpperCase()} mengembalikan HTTP ${res.status}. Pastikan server aktif.`
      );
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

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
          const delta = parsed.choices?.[0]?.delta;
          if (delta) {
            const contentChunk = delta.content || '';
            const reasoningChunk = delta.reasoning_content || '';
            if (contentChunk || reasoningChunk) {
              callbacks.onChunk(contentChunk, reasoningChunk);
            }
          }
        } catch {
          // Ignore malformed chunk
        }
      }
    }
  };

  try {
    await attemptOpenAiStream(true);
    callbacks.onComplete();
  } catch (err: unknown) {
    if ((err as Error)?.name === 'AbortError') {
      callbacks.onComplete();
      return;
    }
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}

/**
 * Parse Markdown Role file with YAML frontmatter
 */
export function parseRoleMarkdownFile(rawMd: string): Role | null {
  const trimmed = rawMd.trim();
  if (!trimmed) return null;

  let name = 'Custom Role';
  let description = 'Peran kustom dari file Markdown';
  let category: Role['category'] = 'custom';
  let temperature = 0.3;
  let promptBody = trimmed;

  const fmMatch = trimmed.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (fmMatch) {
    const yamlPart = fmMatch[1];
    promptBody = fmMatch[2].trim();

    const nameMatch = yamlPart.match(/name:\s*["']?([^"'\r\n]+)["']?/i);
    const descMatch = yamlPart.match(/description:\s*["']?([^"'\r\n]+)["']?/i);
    const tempMatch = yamlPart.match(/temperature:\s*([0-9.]+)/i);

    if (nameMatch) name = nameMatch[1].trim();
    if (descMatch) description = descMatch[1].trim();
    if (tempMatch) temperature = parseFloat(tempMatch[1]) || 0.3;
  }

  return {
    id: `role-md-${Date.now()}`,
    name,
    description,
    category,
    temperature,
    prompt: promptBody,
    isBuiltIn: false,
  };
}

/**
 * Export a Role to Markdown with YAML frontmatter
 */
export function roleToMarkdown(role: Role): string {
  return `---
name: "${role.name.replace(/"/g, '\\"')}"
description: "${role.description.replace(/"/g, '\\"')}"
category: "${role.category}"
temperature: ${role.temperature ?? 0.3}
---

${role.prompt}
`;
}

/**
 * Detect Code Artifacts (HTML / SVG / JSON / TSX) inside Assistant Message
 */
export interface DetectedArtifact {
  language: string;
  code: string;
  title: string;
}

export function extractCodeArtifact(content: string): DetectedArtifact | null {
  const regex = /```(html|svg|json|tsx|jsx|javascript|typescript)\n([\s\S]*?)```/i;
  const match = content.match(regex);
  if (!match) return null;

  const lang = match[1].toLowerCase();
  const code = match[2].trim();
  if (code.length < 40) return null;

  return {
    language: lang,
    code,
    title: `Live Artifact (${lang.toUpperCase()})`,
  };
}
