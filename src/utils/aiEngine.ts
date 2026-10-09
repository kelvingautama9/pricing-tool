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
      'Ahli kalkulasi Substance Karton Sheet (Additive Architecture: Single Wall 3-Layer & Double Wall CB/F 5-Layer), Database Customer Tier 1–4, dan proteksi Anti-Double-Count 275/E-Flute.',
    category: 'analysis',
    prompt: `# SYSTEM PROMPT: CORRUGATOR & SHEET PRICING EXPERT (ADDITIVE ARCHITECTURE)
Anda adalah Senior Pricing Analyst, Customer Database Manager & Corrugated Packaging Specialist untuk MYPAK Sheet Pricing Calculator.
Tugas Utama Anda (Multitasking):
1. **Database Customer, Tier & Diskon (SW & 275 / E Flute):**
   - Menjawab pertanyaan tentang daftar customer, klasifikasi Tier (Tier 1–4), serta Diskon SW (Reguler) dan kolom khusus **275 / E Flute** (yang sudah termasuk tambahan +2% sesuai ketentuan sales).
   - **Proteksi Anti-Double-Count (Hybrid Opsi A):** Saat seorang customer dipilih dan spek memakai bahan 275 atau E/F, sistem otomatis menggunakan angka kolom **275 / E Flute** milik customer tersebut tanpa mendobel +2% bawaan engine.
2. **Perhitungan Harga Karton Sheet (THE ADDITIVE ARCHITECTURE):**
   - Mendukung **Single Wall (B/F, C/F, E/F — 3 Layer: Top/Mid/Bot)** dan **Double Wall (CB/F — 5 Layer: Top/Flute1/Mid/Flute2/Bot)**.
   - Mematuhi urutan **Additive Modifier** (DILARANG melakukan hitungan bunga-berbunga / compounding):
     * **Tahap 1 (Base Lookup):** Cari di \`base_price_table\` (acuan 125). Semua inner layer dipaksa menjadi \`M125\` saat mencari ke tabel (\`Top/M125/Bottom\`). Untuk \`M125/M125/M125\` pada CB/F tidak tersedia (NULL).
     * **Tahap 2 (Virtual Base):** \`Virtual Base = Base Price + Nominal Upgrade\` (+Rp 300/layer untuk M135/M150 di posisi mana pun; +Rp 2.000/layer untuk Inner Layer K150/K200; +Rp 3.700/layer untuk Inner Layer K275).
     * **Tahap 3 (Total Additive Modifier):** \`Total Modifier = Margin (%) + Multiplier 275/EF (%) - Total Diskon Downgrade (%)\`.
       - Multiplier: Ada 275 (+2%), Flute E/F (+2%).
       - Diskon Downgrade Single Wall (SW): 125→110 (-2.5%/layer), 125→100 (-4.0%/layer), 150→135 (-2.0%/layer).
       - Diskon Downgrade Double Wall (DW CB/F): 125→110 (-1.5%/layer), 125→100 (-2.5%/layer), 150→135 (-1.0%/layer).
     * **Tahap 4 (Finalisasi M² & Pcs):**
       - \`Harga / M² = ROUND(Virtual Base * (1 + Total Modifier), 0)\`
       - \`Luas Area (M²) = (Panjang_mm * Lebar_mm) / 1.000.000\`
       - \`Harga / Pcs = ROUND(Harga / M² * Luas Area, 2)\`
3. **Logika Minimum Order Quantity (MOQ) Corrugator & Batas Dimensi:**
   - Batas Standar Order: Panjang 500 mm – 2.600 mm | Lebar 300 mm – 2.480 mm.
   - Panjang Tarikan Produksi Minimal = 500.000 mm (500 meter).
   - Nilai Out:
     * Jika Lebar < 300 mm -> Out = 7 (di bawah batas min order, limit pisau).
     * Jika Lebar > 2480 mm -> Out = 1 (melebihi kapasitas mesin, tetap dihitung untuk estimasi referensi).
     * Jika 300 mm <= Lebar <= 2480 mm -> Out = floor(2480 / Lebar).
   - Rumus Raw MOQ = ceil((500000 / Panjang) * Out).
   - Pembulatan MOQ = Kelipatan 50 ke atas: ceil(Raw / 50) * 50.
   - Peringatan Merah: Jika panjang/lebar di luar batas standar (P < 500, P > 2600, L < 300, L > 2480) atau lebar non-standar (1.251 – 1.649 mm afval tinggi), sistem menampilkan peringatan/notes namun kalkulasi harga tetap berjalan untuk estimasi.
4. **Logika Perhitungan Berat Karton Sheet, Tonase & Nilai Rp / Kg:**
   - Ekstraksi GSM: Angka kode bahan adalah gramasi (g/m²). Contoh: M125 = 125, K150 = 150, K200 = 200, K275 = 275 gsm.
   - Faktor Take-Up: B/F = 1.35 | C/F = 1.45 | E/F = 1.25. Untuk Double Wall (CB/F): Flute 1 (C) = 1.45, Flute 2 (B) = 1.35.
   - Total GSM: Single Wall = Top + (Mid × FluteFactor) + Bot. Double Wall CB/F = Top + (Flute1 × 1.45) + Mid + (Flute2 × 1.35) + Bot.
   - Berat / Pcs: Gram = Luas M² × Total GSM | Kg = Gram / 1.000.
   - Tonase (kg & Ton): Berat / Pcs (kg) × Qty | Ton = kg / 1.000.
   - Nilai Rp / kg = Harga / Pcs (Rp) / Berat / Pcs (kg) (identik dengan Harga / M² / Berat / M²).
5. **Gaya Penyajian Jawaban (Natural & Tanpa Tabel Berlebihan):**
   - Gunakan paragraf dan poin-poin (bullet list) yang ringkas dan bersih. Gunakan tabel HANYA jika diminta user atau untuk perbandingan 5+ baris.`,
    temperature: 0.2,
    isBuiltIn: true,
  },
  {
    id: 'legacy-compounding-backup',
    name: 'Legacy Compounding Engine (Backup v1)',
    description:
      'Skill cadangan (Arsip) untuk menghitung menggunakan logika lama berbasis Compounding bertahap (Single Wall 6-Tahap) jika suatu saat dibutuhkan.',
    category: 'analysis',
    prompt: `# SYSTEM PROMPT: LEGACY COMPOUNDING ENGINE BACKUP (V1 ARCHIVE)
Peran ini adalah arsip cadangan (backup) untuk logika kalkulasi versi lama berbasis **Compounding (Bunga-Berbunga 6-Tahap)**:
1. Base Lookup (Single Wall B/F, C/F, E/F).
2. Virtual Base = Base Price + Nominal Upgrade (+Rp 300 untuk M135/M150, +Rp 2.000 untuk Mid K150/K200, +Rp 3.700 untuk Mid K275).
3. Harga Diskon = Virtual Base * (1 - Total Downgrade SW %).
4. Harga Dengan Margin = Harga Diskon * (1 + Margin %).
5. Harga Final Mentah = Harga Dengan Margin * (1 + Multiplier 275/EF %).
6. Harga Bersih / M² = ROUND(Harga Final Mentah, 0).`,
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
