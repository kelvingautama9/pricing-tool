import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Plus,
  X,
  ChevronDown,
  Trash2,
  Edit3,
  Send,
  Paperclip,
  Globe,
  Sliders,
  Code2,
  AlertTriangle,
  Zap,
  RotateCcw,
  FileDown,
  FileUp,
  Copy,
  Check,
  Square,
  Terminal,
  BookOpen,
} from 'lucide-react';
import {
  AI_MODELS,
  AIModelOption,
  AIProviderType,
  BUILT_IN_ROLES,
  Role,
  ChatThread,
  ChatMessage,
  ChatImageAttachment,
  AIServerConfig,
  executeChatStream,
  parseRoleMarkdownFile,
  roleToMarkdown,
  extractCodeArtifact,
  DetectedArtifact,
} from '../utils/aiEngine';
import { estimateTokens } from '../utils/contextSniffer';
import { triggerHaptic } from '../utils/hapticsAndImport';
import { PricingCalculationResult, formatRupiah } from '../utils/pricingEngine';
import { RichMessageContent } from './RichMessageContent';

interface AIChatWorkspaceProps {
  activeCalculation: PricingCalculationResult;
  activeThread: ChatThread;
  onUpdateThread: (updater: (thread: ChatThread) => ChatThread) => void;
}

const STORAGE_KEY_AI_ROLES = 'mypak_ai_roles_v1';
const STORAGE_KEY_AI_SERVER = 'mypak_ai_server_config_v1';

export const AIChatWorkspace: React.FC<AIChatWorkspaceProps> = ({
  activeCalculation,
  activeThread,
  onUpdateThread,
}) => {
  // 1. Model & Provider State
  const [selectedModelId, setSelectedModelId] = useState<string>('gemini-2.5-flash');
  const [modelPopoverOpen, setModelPopoverOpen] = useState<boolean>(false);
  const [providerTab, setProviderTab] = useState<AIProviderType>('gemini');

  // 2. Roles Library State
  const [roles, setRoles] = useState<Role[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AI_ROLES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return BUILT_IN_ROLES;
  });
  const [activeRoleId, setActiveRoleId] = useState<string>('corrugator-pricing-expert');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleFormName, setRoleFormName] = useState('');
  const [roleFormDesc, setRoleFormDesc] = useState('');
  const [roleFormCategory, setRoleFormCategory] = useState<Role['category']>('analysis');
  const [roleFormTemp, setRoleFormTemp] = useState<number>(0.2);
  const [roleFormPrompt, setRoleFormPrompt] = useState('');

  // 3. Server & Engine Parameters State
  const [serverModalOpen, setServerModalOpen] = useState<boolean>(false);
  const [serverConfig, setServerConfig] = useState<AIServerConfig>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_AI_SERVER);
      if (raw) return JSON.parse(raw);
    } catch {
      // Ignore
    }
    return {
      localEndpoint: 'http://localhost:1234',
      qwenEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
    };
  });
  const [temperature, setTemperature] = useState<number>(0.2);
  const [contextWindow, setContextWindow] = useState<number>(8192);
  const [useSearchGrounding, setUseSearchGrounding] = useState<boolean>(false);

  // 4. Input & Streaming State
  const [inputText, setInputText] = useState<string>('');
  const [attachedImages, setAttachedImages] = useState<ChatImageAttachment[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [rateLimitBanner, setRateLimitBanner] = useState<{
    active: boolean;
    failedModel: string;
  }>({ active: false, failedModel: '' });

  // 5. Live Artifact Panel State
  const [activeArtifact, setActiveArtifact] = useState<DetectedArtifact | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileAttachInputRef = useRef<HTMLInputElement>(null);
  const roleImportInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_AI_ROLES, JSON.stringify(roles));
    } catch {
      // Ignore
    }
  }, [roles]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_AI_SERVER, JSON.stringify(serverConfig));
    } catch {
      // Ignore
    }
  }, [serverConfig]);

  const activeModelObj: AIModelOption =
    AI_MODELS.find((m) => m.id === selectedModelId) || AI_MODELS[0];
  const activeRoleObj: Role =
    roles.find((r) => r.id === activeRoleId) || roles[0] || BUILT_IN_ROLES[0];

  // Snapshot of the active calculator state for zero-hallucination grounding
  const calculatorSnapshot = useMemo(() => {
    if (!activeCalculation.success) {
      return `Invalid Input (${activeCalculation.errorMessage || 'Error'})`;
    }
    return `Substance=${activeCalculation.inputSubstanceString}, Flute=${activeCalculation.input.flute}, Acuan=${activeCalculation.mappedReferenceSubstance} (${formatRupiah(
      activeCalculation.basePrice
    )}), VirtualBase=${formatRupiah(
      activeCalculation.virtualBase
    )}, Downgrade=-${activeCalculation.totalDowngradePercent}%, Margin=${
      activeCalculation.marginPercent
    }%, Multiplier=+${
      activeCalculation.totalMultiplierPercent
    }%, Decimal=${activeCalculation.hargaFinalMentah.toFixed(
      2
    )}, HargaBersihPerM2=${formatRupiah(activeCalculation.hargaBersihPerM2)}`;
  }, [activeCalculation]);

  // Estimate current token usage
  const estimatedActiveTokens = useMemo(() => {
    const msgTokens = (activeThread?.messages || []).reduce(
      (acc, m) => acc + estimateTokens(m.content) + (m.images?.length ? 300 : 0),
      0
    );
    const sysTokens = estimateTokens(activeRoleObj?.prompt || '');
    const draftTokens = estimateTokens(inputText);
    return msgTokens + sysTokens + draftTokens;
  }, [activeThread, activeRoleObj, inputText]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeThread?.messages.length, isStreaming]);

  // File & Image Attachment Handler
  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = String(ev.target?.result || '');
          const commaIdx = dataUrl.indexOf(',');
          if (commaIdx !== -1) {
            const base64Data = dataUrl.slice(commaIdx + 1);
            setAttachedImages((prev) => [
              ...prev,
              {
                id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                name: file.name,
                mimeType: file.type || 'image/png',
                data: base64Data,
                previewUrl: dataUrl,
              },
            ]);
          }
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const textContent = String(ev.target?.result || '');
          const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
          const formattedBlock = `\n[File Terlampir: ${file.name}]\n\`\`\`${ext}\n${textContent.slice(
            0,
            12000
          )}\n\`\`\`\n`;
          setInputText((prev) => `${prev}${formattedBlock}`);
        };
        reader.readAsText(file);
      }
    });

    e.target.value = '';
  };

  // Clipboard Paste Image Support
  const handleTextareaPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (!blob) continue;

        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = String(ev.target?.result || '');
          const commaIdx = dataUrl.indexOf(',');
          if (commaIdx !== -1) {
            setAttachedImages((prev) => [
              ...prev,
              {
                id: `paste-${Date.now()}`,
                name: 'clipboard-screenshot.png',
                mimeType: blob.type || 'image/png',
                data: dataUrl.slice(commaIdx + 1),
                previewUrl: dataUrl,
              },
            ]);
          }
        };
        reader.readAsDataURL(blob);
      }
    }
  };

  // Send Chat Message Lifecycle
  const handleSendMessage = async (overrideText?: string, overrideModelId?: string) => {
    const textToSend = (overrideText ?? inputText).trim();
    if ((!textToSend && attachedImages.length === 0) || isStreaming) return;

    triggerHaptic('medium');
    setRateLimitBanner({ active: false, failedModel: '' });

    const targetModelId = overrideModelId || selectedModelId;
    const targetModelObj =
      AI_MODELS.find((m) => m.id === targetModelId) || activeModelObj;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      images: attachedImages.length > 0 ? [...attachedImages] : undefined,
      createdAt: Date.now(),
    };

    const assistantSlotId = `asst-${Date.now() + 1}`;
    const assistantPlaceholder: ChatMessage = {
      id: assistantSlotId,
      role: 'assistant',
      content: '',
      createdAt: Date.now() + 1,
      modelUsed: targetModelObj.id,
      isStreaming: true,
    };

    const updatedHistory = [...(activeThread?.messages || []), userMsg];

    const shouldAutoTitle =
      activeThread.title === 'Percakapan Baru' ||
      activeThread.messages.length <= 1;
    const nextTitle =
      shouldAutoTitle && textToSend
        ? textToSend.replace(/\s+/g, ' ').slice(0, 38)
        : activeThread.title;

    onUpdateThread((t) => ({
      ...t,
      title: nextTitle,
      messages: [...updatedHistory, assistantPlaceholder],
    }));

    if (!overrideText) {
      setInputText('');
      setAttachedImages([]);
    }

    setIsStreaming(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let targetText = '';
    let displayedText = '';
    let accumulatedReasoning = '';
    let networkStreamDone = false;
    let streamHasError = false;
    let rafId: number | null = null;

    // 120Hz Smooth Real-Time Streaming Typewriter Drain Loop
    const tickSmoothStream = () => {
      if (controller.signal.aborted || streamHasError) {
        if (rafId !== null) cancelAnimationFrame(rafId);
        return;
      }

      if (displayedText.length < targetText.length) {
        const backlog = targetText.length - displayedText.length;
        // Adaptive step size: fast enough to never lag behind real-time stream, smooth enough to look like rapid typing
        const step = Math.max(2, Math.min(28, Math.ceil(backlog / 5)));
        displayedText = targetText.slice(0, displayedText.length + step);

        onUpdateThread((t) => ({
          ...t,
          messages: t.messages.map((m) =>
            m.id === assistantSlotId
              ? {
                  ...m,
                  content: displayedText,
                  reasoning: accumulatedReasoning || undefined,
                  isStreaming: true,
                }
              : m
          ),
        }));

        rafId = requestAnimationFrame(tickSmoothStream);
      } else if (networkStreamDone) {
        setIsStreaming(false);
        triggerHaptic('success');
        onUpdateThread((t) => ({
          ...t,
          messages: t.messages.map((m) =>
            m.id === assistantSlotId
              ? {
                  ...m,
                  content:
                    targetText ||
                    'Permintaan selesai tanpa teks tambahan.',
                  reasoning: accumulatedReasoning || undefined,
                  isStreaming: false,
                }
              : m
          ),
        }));
        rafId = null;
      } else {
        rafId = requestAnimationFrame(tickSmoothStream);
      }
    };

    rafId = requestAnimationFrame(tickSmoothStream);

    const effectiveTemperature =
      targetModelObj.provider === 'local'
        ? temperature
        : activeRoleObj.temperature ?? 0.2;
    const effectiveContextWindow =
      targetModelObj.provider === 'local' ? contextWindow : 32768;

    await executeChatStream(
      targetModelObj.provider,
      serverConfig,
      targetModelObj.id,
      updatedHistory,
      {
        temperature: effectiveTemperature,
        topP: 0.95,
        contextWindow: effectiveContextWindow,
        systemPrompt: activeRoleObj.prompt,
        activeRolePrompt: activeRoleObj.prompt,
        activeCalculatorSnapshot: calculatorSnapshot,
        useSearchGrounding,
      },
      controller.signal,
      {
        onModelSwitched: (_fromModel, toModel) => {
          // Automatically switch active model in UI and update message badge
          setSelectedModelId(toModel);
          onUpdateThread((t) => ({
            ...t,
            messages: t.messages.map((m) =>
              m.id === assistantSlotId
                ? {
                    ...m,
                    modelUsed: `${toModel} (Auto-Fallback)`,
                  }
                : m
            ),
          }));
        },
        onChunk: (textDelta, reasoningDelta) => {
          if (textDelta) targetText += textDelta;
          if (reasoningDelta) accumulatedReasoning += reasoningDelta;
        },
        onComplete: () => {
          networkStreamDone = true;
          if (controller.signal.aborted) {
            if (rafId !== null) cancelAnimationFrame(rafId);
            setIsStreaming(false);
            onUpdateThread((t) => ({
              ...t,
              messages: t.messages.map((m) =>
                m.id === assistantSlotId
                  ? {
                      ...m,
                      content: displayedText || targetText,
                      isStreaming: false,
                    }
                  : m
              ),
            }));
          }
        },
        onError: (err) => {
          streamHasError = true;
          if (rafId !== null) cancelAnimationFrame(rafId);
          setIsStreaming(false);
          if (err.isRateLimit) {
            setRateLimitBanner({
              active: true,
              failedModel: err.model || targetModelObj.id,
            });
          }

          const friendlyMessage = err.isRateLimit
            ? `Batas kuota RPM pada model **${
                err.model || targetModelObj.id
              }** tercapai (HTTP 429). Silakan tunggu 30–60 detik atau klik tombol **Beralih ke Flash-Lite** di bawah untuk melanjutkan secara instan.`
            : `Gagal memproses permintaan: ${err.message}`;

          onUpdateThread((t) => ({
            ...t,
            messages: t.messages.map((m) =>
              m.id === assistantSlotId
                ? {
                    ...m,
                    content: friendlyMessage,
                    isStreaming: false,
                    isError: true,
                  }
                : m
            ),
          }));
        },
      }
    );
  };

  const handleStopStream = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  };

  const handleSwitchToFlashLite = () => {
    triggerHaptic('medium');
    const liteModel = 'gemini-3.1-flash-lite';
    setSelectedModelId(liteModel);
    setRateLimitBanner({ active: false, failedModel: '' });

    const lastUserMsg = [...(activeThread?.messages || [])]
      .reverse()
      .find((m) => m.role === 'user');
    if (lastUserMsg && lastUserMsg.content) {
      handleSendMessage(lastUserMsg.content, liteModel);
    }
  };

  // Role Management Handlers
  const openCreateRoleForm = () => {
    setEditingRole(null);
    setRoleFormName('');
    setRoleFormDesc('');
    setRoleFormCategory('custom');
    setRoleFormTemp(0.3);
    setRoleFormPrompt('');
  };

  const openEditRoleForm = (role: Role) => {
    setEditingRole(role);
    setRoleFormName(role.name);
    setRoleFormDesc(role.description);
    setRoleFormCategory(role.category);
    setRoleFormTemp(role.temperature ?? 0.3);
    setRoleFormPrompt(role.prompt);
  };

  const handleSaveRoleForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleFormName.trim() || !roleFormPrompt.trim()) return;
    triggerHaptic('success');

    if (editingRole) {
      setRoles((prev) =>
        prev.map((r) =>
          r.id === editingRole.id
            ? {
                ...r,
                name: roleFormName.trim(),
                description: roleFormDesc.trim(),
                category: roleFormCategory,
                temperature: roleFormTemp,
                prompt: roleFormPrompt.trim(),
              }
            : r
        )
      );
      setEditingRole(null);
    } else {
      const created: Role = {
        id: `role-${Date.now()}`,
        name: roleFormName.trim(),
        description: roleFormDesc.trim() || 'Peran kustom',
        category: roleFormCategory,
        temperature: roleFormTemp,
        prompt: roleFormPrompt.trim(),
        isBuiltIn: false,
      };
      setRoles((prev) => [...prev, created]);
      setActiveRoleId(created.id);
      setTemperature(created.temperature ?? 0.3);
    }

    setRoleFormName('');
    setRoleFormDesc('');
    setRoleFormPrompt('');
  };

  const handleDeleteRole = (id: string) => {
    triggerHaptic('light');
    setRoles((prev) => {
      const remaining = prev.filter((r) => r.id !== id);
      if (activeRoleId === id && remaining.length > 0) {
        setActiveRoleId(remaining[0].id);
      }
      return remaining;
    });
  };

  const handleResetDefaultRoles = () => {
    triggerHaptic('medium');
    setRoles(BUILT_IN_ROLES);
    setActiveRoleId(BUILT_IN_ROLES[0].id);
    setTemperature(BUILT_IN_ROLES[0].temperature ?? 0.2);
  };

  const handleExportRolesJson = () => {
    const blob = new Blob([JSON.stringify(roles, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mypak-ai-roles.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSingleRoleMd = (role: Role) => {
    const md = roleToMarkdown(role);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${role.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportRoleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const raw = String(ev.target?.result || '');
      if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setRoles((prev) => [...prev, ...parsed]);
            triggerHaptic('success');
          }
        } catch {
          // Ignore
        }
      } else {
        const role = parseRoleMarkdownFile(raw);
        if (role) {
          setRoles((prev) => [...prev, role]);
          setActiveRoleId(role.id);
          triggerHaptic('success');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const getProviderStatusDot = () => {
    if (rateLimitBanner.active) return 'bg-rose-600';
    if (activeModelObj.provider === 'local') return 'bg-emerald-600';
    if (activeModelObj.provider === 'qwen') return 'bg-cyan-600';
    return 'bg-amber-600';
  };

  return (
    <div className="h-[calc(100dvh-5.5rem)] w-full flex rounded-lg bg-[#FFFFFF] dark:bg-[#161311] border border-black/8 dark:border-white/10 overflow-hidden relative">
      {/* MAIN CHAT STAGE (No duplicate internal sidebar — managed via main left Sidebar) */}
      <div className="flex-1 flex flex-col min-w-0 h-full bg-[#FFFFFF] dark:bg-[#161311]">
        {/* Topbar Island: [Model Dropdown] [Role Library] [Server/Engine] */}
        <div className="h-11 px-3 border-b border-black/8 dark:border-white/10 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {/* Unified Floating Model & Provider Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setModelPopoverOpen(!modelPopoverOpen);
                }}
                className="h-7 px-2.5 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] border border-black/8 dark:border-white/10 flex items-center gap-1.5 text-[11px] font-semibold text-[#1C1B1A] dark:text-[#F2EFE9] cursor-pointer"
              >
                <span className={`w-2 h-2 rounded-xs ${getProviderStatusDot()}`} />
                <span className="truncate max-w-[140px] sm:max-w-[200px]">
                  {activeModelObj.name}
                </span>
                <ChevronDown className="w-3 h-3 text-neutral-400 shrink-0" />
              </button>

              {modelPopoverOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setModelPopoverOpen(false)}
                  />
                  <div className="absolute left-0 mt-1.5 w-72 sm:w-96 z-50 rounded-md p-2.5 bg-[#FFFFFF]/98 dark:bg-[#161311]/98 border border-black/15 dark:border-white/15 shadow-xl text-xs">
                    {/* Segmented Provider Tabs */}
                    <div className="grid grid-cols-3 gap-1 p-0.5 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] mb-2">
                      {(
                        [
                          { id: 'gemini', label: 'Google Gemini' },
                          { id: 'qwen', label: 'Qwen Cloud' },
                          { id: 'local', label: 'Local LM' },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setProviderTab(tab.id)}
                          className={`py-1 px-1.5 rounded-xs text-[10px] font-medium transition-colors cursor-pointer ${
                            providerTab === tab.id
                              ? 'bg-[#C65D3B] text-white font-semibold'
                              : 'text-neutral-500 hover:text-[#1C1B1A] dark:hover:text-white'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Header Row: DAFTAR MODEL TERSEDIA + Atur Server link */}
                    <div className="flex items-center justify-between px-1 pb-1.5 text-[10px] font-display font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                      <span>Daftar Model Tersedia:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setModelPopoverOpen(false);
                          setServerModalOpen(true);
                        }}
                        className="font-sans font-semibold normal-case tracking-normal text-[#C65D3B] hover:underline cursor-pointer"
                      >
                        Atur Server
                      </button>
                    </div>

                    <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                      {AI_MODELS.filter((m) => m.provider === providerTab).map(
                        (m) => {
                          const isSelected = m.id === selectedModelId;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                setSelectedModelId(m.id);
                                setModelPopoverOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-2 rounded-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                                isSelected
                                  ? 'bg-[#C65D3B]/12 border border-[#C65D3B]/35'
                                  : 'hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`font-mono text-[11.5px] ${
                                      isSelected
                                        ? 'font-bold text-[#C65D3B]'
                                        : 'font-semibold text-[#1C1B1A] dark:text-[#F2EFE9]'
                                    }`}
                                  >
                                    {m.name}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded-xs bg-[#C65D3B]/12 text-[9.5px] font-mono text-[#C65D3B] font-semibold">
                                    {m.badge}
                                  </span>
                                </div>
                              </div>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-[#C65D3B] shrink-0" />
                              )}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Controls: Active Role Badge + Server / Context Settings */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsRoleModalOpen(true)}
              className="h-7 px-2.5 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] hover:bg-black/8 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 flex items-center gap-1.5 text-[10.5px] font-medium cursor-pointer"
            >
              <BookOpen className="w-3 h-3 text-[#C65D3B] shrink-0" />
              <span className="truncate max-w-[110px] sm:max-w-[160px]">
                Role: {activeRoleObj.name}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setServerModalOpen(true)}
              title="Parameter Engine & Endpoint Lokal"
              className="h-7 px-2 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] hover:bg-black/8 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 flex items-center gap-1 text-[10.5px] font-medium cursor-pointer"
            >
              <Sliders className="w-3 h-3 text-[#C65D3B]" />
              <span className="hidden sm:inline">Parameter</span>
            </button>
          </div>
        </div>

        {/* Dynamic Context Sniffer Grounding Strip */}
        <div className="px-3 py-1 bg-[#F9F9F9] dark:bg-[#1d1c1a] border-b border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-neutral-500">
          <div className="flex items-center gap-1.5 truncate">
            <Terminal className="w-3 h-3 text-[#C65D3B] shrink-0" />
            <span className="truncate">
              Spek Aktif: <strong>{activeCalculation.inputSubstanceString}</strong> ({activeCalculation.input.flute}) ·{' '}
              <strong className="text-[#C65D3B]">
                {activeCalculation.success
                  ? formatRupiah(activeCalculation.hargaBersihPerM2)
                  : 'Error'}
              </strong>
              /M²
            </span>
          </div>
          <span className="text-[9.5px] text-neutral-400 shrink-0">
            {activeModelObj.provider === 'local'
              ? `Temp: ${temperature} · Context: ${estimatedActiveTokens}/${contextWindow} tok`
              : `Role Temp: ${activeRoleObj.temperature ?? 0.2} · Auto-Fallback Aktif`}
          </span>
        </div>

        {/* Messages Scroll Stage */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-3">
          {activeThread.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-2 py-8">
              <div className="text-xs font-display font-bold text-[#1C1B1A] dark:text-[#F2EFE9]">
                Hi, i'm BlackEYE AI, how can i help you today...
              </div>
              <p className="text-[11px] text-neutral-400">
                You can ask me everything about Sheet Pricing
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                {[
                  'Jelaskan rincian harga spek yang sedang aktif saat ini',
                  'Rekomendasi alternatif downgrade yang lebih hemat 4%',
                  'Buatkan draf penawaran WhatsApp untuk klien Tier 1',
                ].map((promptSuggestion) => (
                  <button
                    key={promptSuggestion}
                    type="button"
                    onClick={() => handleSendMessage(promptSuggestion)}
                    className="px-2.5 py-1.5 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] hover:bg-[#C65D3B] hover:text-white text-[10.5px] transition-colors cursor-pointer"
                  >
                    {promptSuggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            activeThread.messages.map((msg) => {
              const isUser = msg.role === 'user';
              const artifact = !isUser ? extractCodeArtifact(msg.content) : null;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isUser ? 'items-end' : 'items-start w-full'
                  }`}
                >
                  <div
                    className={
                      isUser
                        ? 'user-chat-bubble max-w-[85%] sm:max-w-[75%] rounded-md px-3.5 py-2.5 text-xs leading-relaxed bg-[#C65D3B] text-white selection:bg-[#FDE68A] selection:text-[#1C1B1A]'
                        : msg.isError
                        ? 'w-full rounded-md p-3 text-xs leading-relaxed bg-rose-500/10 border border-rose-600/30 text-rose-900 dark:text-rose-200'
                        : 'w-full py-2 px-1 text-xs leading-relaxed text-[#1C1B1A] dark:text-[#F2EFE9]'
                    }
                  >
                    {msg.images && msg.images.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {msg.images.map((img) => (
                          <img
                            key={img.id}
                            src={img.previewUrl}
                            alt={img.name}
                            className="h-20 w-auto rounded-xs object-cover border border-black/10"
                          />
                        ))}
                      </div>
                    )}

                    {msg.reasoning && (
                      <details className="mb-2.5 p-2.5 rounded-xs bg-[#F3F1ED]/70 dark:bg-[#22201E]/70 border border-black/6 dark:border-white/8 text-[10.5px] font-mono text-neutral-500">
                        <summary className="cursor-pointer font-semibold">
                          Proses Penalaran (Chain-of-Thought)
                        </summary>
                        <div className="mt-1.5 whitespace-pre-wrap">
                          {msg.reasoning}
                        </div>
                      </details>
                    )}

                    <RichMessageContent
                      content={msg.content}
                      isStreaming={msg.isStreaming}
                      isUser={isUser}
                    />

                    {!isUser && !msg.isStreaming && (
                      <div className="mt-2.5 pt-1.5 border-t border-black/6 dark:border-white/8 flex items-center justify-between gap-2 text-[9.5px] font-mono text-neutral-400">
                        <span>{msg.modelUsed || activeModelObj.id}</span>
                        <div className="flex items-center gap-1.5">
                          {artifact && (
                            <button
                              type="button"
                              onClick={() => setActiveArtifact(artifact)}
                              className="px-1.5 py-0.5 rounded-xs bg-[#C65D3B] text-white font-sans font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Code2 className="w-2.5 h-2.5" />
                              <span>Open Artifact</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(msg.content);
                              setCopiedMsgId(msg.id);
                              setTimeout(() => setCopiedMsgId(null), 1800);
                            }}
                            className="flex items-center gap-0.5 hover:text-[#1C1B1A] dark:hover:text-white cursor-pointer"
                          >
                            {copiedMsgId === msg.id ? (
                              <>
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Tersalin</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-2.5 h-2.5" />
                                <span>Salin</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Rate Limit 429 Auto-Fallback Alert Banner */}
        {rateLimitBanner.active && (
          <div className="mx-3 mb-2 p-2.5 rounded-md bg-amber-500/12 border border-amber-600/35 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span className="text-[11px]">
                Kuota RPM model <strong>{rateLimitBanner.failedModel}</strong> penuh (429).
              </span>
            </div>
            <button
              type="button"
              onClick={handleSwitchToFlashLite}
              className="px-2.5 py-1 rounded-xs bg-[#C65D3B] hover:bg-[#b24f2f] text-white text-[10.5px] font-semibold flex items-center gap-1 cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <Zap className="w-3 h-3" />
              <span>Beralih ke Flash-Lite</span>
            </button>
          </div>
        )}

        {/* Attached Image Previews */}
        {attachedImages.length > 0 && (
          <div className="px-3 py-1.5 border-t border-black/6 dark:border-white/8 flex items-center gap-2 overflow-x-auto">
            {attachedImages.map((img) => (
              <div key={img.id} className="relative group shrink-0">
                <img
                  src={img.previewUrl}
                  alt={img.name}
                  className="h-12 w-12 rounded-xs object-cover border border-black/15"
                />
                <button
                  type="button"
                  onClick={() =>
                    setAttachedImages((prev) =>
                      prev.filter((item) => item.id !== img.id)
                    )
                  }
                  className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-xs p-0.5 cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Input Dock */}
        <div className="p-2.5 border-t border-black/8 dark:border-white/10 bg-[#F9F9F9] dark:bg-[#18191e]">
          <div className="flex items-end gap-1.5">
            <button
              type="button"
              onClick={() => fileAttachInputRef.current?.click()}
              title="Lampirkan Gambar, Markdown (.md), JSON, atau CSV"
              className="h-8 w-8 rounded-xs bg-white dark:bg-[#161311] border border-black/10 dark:border-white/10 flex items-center justify-center text-neutral-500 hover:text-[#C65D3B] cursor-pointer shrink-0"
            >
              <Paperclip className="w-3.5 h-3.5" />
            </button>
            <input
              ref={fileAttachInputRef}
              type="file"
              multiple
              accept="image/*,.md,.markdown,.json,.csv,.txt,.ts,.tsx,.html"
              onChange={handleAttachmentUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => setUseSearchGrounding(!useSearchGrounding)}
              title="Aktifkan Google Search Grounding"
              className={`h-8 px-2 rounded-xs border flex items-center gap-1 text-[10px] font-medium cursor-pointer shrink-0 ${
                useSearchGrounding
                  ? 'bg-[#C65D3B]/15 border-[#C65D3B] text-[#C65D3B] font-semibold'
                  : 'bg-white dark:bg-[#161311] border-black/10 dark:border-white/10 text-neutral-500'
              }`}
            >
              <Globe className="w-3 h-3" />
              <span className="hidden sm:inline">Web</span>
            </button>

            <textarea
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onPaste={handleTextareaPaste}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ketik pertanyaan Sheet Pricing, paste gambar (Ctrl+V), atau lampirkan file..."
              className="flex-1 max-h-28 px-2.5 py-1.5 rounded-xs bg-white dark:bg-[#161311] border border-black/10 dark:border-white/10 text-xs text-[#1C1B1A] dark:text-[#F2EFE9] placeholder:text-neutral-400 focus:outline-1 focus:outline-[#C65D3B] resize-none"
            />

            {isStreaming ? (
              <button
                type="button"
                onClick={handleStopStream}
                className="h-8 px-3 rounded-xs bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Square className="w-3 h-3" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSendMessage()}
                className="h-8 px-3 rounded-xs bg-[#C65D3B] hover:bg-[#b24f2f] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Send className="w-3 h-3" />
                <span>Kirim</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT ARTIFACT LIVE PREVIEW PANEL */}
      {activeArtifact && (
        <aside className="w-80 sm:w-96 border-l border-black/8 dark:border-white/10 flex flex-col bg-[#F9F9F9] dark:bg-[#18191e] shrink-0">
          <div className="h-11 px-3 border-b border-black/8 dark:border-white/10 flex items-center justify-between">
            <span className="text-xs font-display font-bold truncate">
              {activeArtifact.title}
            </span>
            <button
              type="button"
              onClick={() => setActiveArtifact(null)}
              className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {(activeArtifact.language === 'html' ||
              activeArtifact.language === 'svg') && (
              <iframe
                title="Artifact Sandbox"
                sandbox="allow-scripts"
                srcDoc={activeArtifact.code}
                className="w-full h-56 rounded-xs bg-white border border-black/10"
              />
            )}
            <pre className="p-2.5 rounded-xs bg-white dark:bg-[#161311] border border-black/8 dark:border-white/10 font-mono text-[10.5px] overflow-x-auto whitespace-pre-wrap">
              {activeArtifact.code}
            </pre>
          </div>
        </aside>
      )}

      {/* ROLE LIBRARY MODAL */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-lg bg-[#FFFFFF] dark:bg-[#161311] border border-black/15 dark:border-white/15 shadow-xl overflow-hidden flex flex-col max-h-[85dvh]">
            <div className="px-4 py-3 border-b border-black/8 dark:border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-display font-bold">
                  Manajemen Peran AI (Role Library)
                </h3>
                <p className="text-[10.5px] text-neutral-400">
                  Pilih peran aktif, edit instruksi sistem, atau impor file Role (.md / .json)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={openCreateRoleForm}
                    className="px-2.5 py-1.5 rounded-xs bg-[#C65D3B] text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Buat Peran Baru</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => roleImportInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <FileUp className="w-3 h-3 text-[#C65D3B]" />
                    <span>Impor (.MD / .JSON)</span>
                  </button>
                  <input
                    ref={roleImportInputRef}
                    type="file"
                    accept=".md,.markdown,.json"
                    onChange={handleImportRoleFile}
                    className="hidden"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleExportRolesJson}
                    className="px-2 py-1.5 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] text-[10.5px] flex items-center gap-1 cursor-pointer"
                  >
                    <FileDown className="w-3 h-3" />
                    <span>Ekspor JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetDefaultRoles}
                    className="px-2 py-1.5 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] text-[10.5px] text-neutral-500 hover:text-[#1C1B1A] flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Default</span>
                  </button>
                </div>
              </div>

              {(editingRole !== null || roleFormName !== '' || roleFormPrompt !== '') && (
                <form
                  onSubmit={handleSaveRoleForm}
                  className="p-3 rounded-md bg-[#F9F9F9] dark:bg-[#1d1c1a] border border-[#C65D3B]/40 space-y-2.5 text-xs"
                >
                  <div className="font-semibold text-[#C65D3B]">
                    {editingRole ? `Edit Peran: ${editingRole.name}` : 'Tambah Peran Kustom'}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      required
                      value={roleFormName}
                      onChange={(e) => setRoleFormName(e.target.value)}
                      placeholder="Nama Peran..."
                      className="px-2.5 py-1.5 rounded-xs bg-white dark:bg-[#161311] border border-black/10 dark:border-white/10"
                    />
                    <input
                      type="text"
                      value={roleFormDesc}
                      onChange={(e) => setRoleFormDesc(e.target.value)}
                      placeholder="Deskripsi singkat..."
                      className="px-2.5 py-1.5 rounded-xs bg-white dark:bg-[#161311] border border-black/10 dark:border-white/10"
                    />
                    <div className="flex items-center gap-2 px-2 py-1 rounded-xs bg-white dark:bg-[#161311] border border-black/10 dark:border-white/10">
                      <span className="text-[10px] text-neutral-400">
                        Temp: {roleFormTemp}
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={roleFormTemp}
                        onChange={(e) => setRoleFormTemp(parseFloat(e.target.value))}
                        className="flex-1 accent-[#C65D3B]"
                      />
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    required
                    value={roleFormPrompt}
                    onChange={(e) => setRoleFormPrompt(e.target.value)}
                    placeholder="Tulis System Prompt untuk peran ini..."
                    className="w-full p-2 rounded-xs bg-white dark:bg-[#161311] border border-black/10 dark:border-white/10 font-mono text-[11px]"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRole(null);
                        setRoleFormName('');
                        setRoleFormPrompt('');
                      }}
                      className="px-2.5 py-1 text-[11px] text-neutral-500 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded-xs bg-[#C65D3B] text-white text-[11px] font-semibold cursor-pointer"
                    >
                      Simpan Peran
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {roles.map((r) => {
                  const isSelected = r.id === activeRoleId;
                  return (
                    <div
                      key={r.id}
                      className={`p-3 rounded-md border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        isSelected
                          ? 'bg-[#C65D3B]/10 border-[#C65D3B]/40'
                          : 'bg-[#F9F9F9] dark:bg-[#1d1c1a] border-black/6 dark:border-white/8'
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold">{r.name}</span>
                          <span className="px-1.5 py-0.5 rounded-xs bg-black/5 dark:bg-white/5 font-mono text-[9.5px] text-neutral-500">
                            Temp: {r.temperature ?? 0.3}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                          {r.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('medium');
                            setActiveRoleId(r.id);
                            setTemperature(r.temperature ?? 0.2);
                            setIsRoleModalOpen(false);
                          }}
                          className={`px-2.5 py-1 rounded-xs text-[10.5px] font-semibold cursor-pointer ${
                            isSelected
                              ? 'bg-[#C65D3B] text-white'
                              : 'bg-white dark:bg-[#161311] border border-black/10 dark:border-white/10 hover:border-[#C65D3B]'
                          }`}
                        >
                          {isSelected ? 'Aktif' : 'Terapkan Peran'}
                        </button>
                        <button
                          type="button"
                          title="Ekspor ke .MD"
                          onClick={() => handleExportSingleRoleMd(r)}
                          className="p-1.5 rounded-xs bg-white dark:bg-[#161311] border border-black/8 dark:border-white/10 text-neutral-500 hover:text-[#1C1B1A] cursor-pointer"
                        >
                          <FileDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          title="Edit Peran"
                          onClick={() => openEditRoleForm(r)}
                          className="p-1.5 rounded-xs bg-white dark:bg-[#161311] border border-black/8 dark:border-white/10 text-neutral-500 hover:text-[#1C1B1A] cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        {roles.length > 1 && (
                          <button
                            type="button"
                            title="Hapus Peran"
                            onClick={() => handleDeleteRole(r.id)}
                            className="p-1.5 rounded-xs bg-white dark:bg-[#161311] border border-black/8 dark:border-white/10 text-neutral-500 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC PROVIDER & SERVER CONFIGURATION MODAL */}
      {serverModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg bg-[#FFFFFF] dark:bg-[#161311] border border-black/15 dark:border-white/15 shadow-xl p-4 space-y-3.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-black/8 dark:border-white/10">
              <div>
                <h3 className="text-sm font-display font-bold">
                  {providerTab === 'gemini'
                    ? 'Pengaturan Server Google Gemini'
                    : providerTab === 'qwen'
                    ? 'Pengaturan Server Qwen Cloud'
                    : 'Pengaturan Server Local LM Studio'}
                </h3>
                <p className="text-[10.5px] text-neutral-400 mt-0.5">
                  Konfigurasi modul mengikuti provider yang sedang aktif
                </p>
              </div>
              <button
                type="button"
                onClick={() => setServerModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Provider Switcher inside Modal */}
            <div className="grid grid-cols-3 gap-1 p-0.5 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E]">
              {(
                [
                  { id: 'gemini', label: 'Google Gemini' },
                  { id: 'qwen', label: 'Qwen Cloud' },
                  { id: 'local', label: 'Local LM' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setProviderTab(tab.id)}
                  className={`py-1 px-1.5 rounded-xs text-[10px] font-medium transition-colors cursor-pointer ${
                    providerTab === tab.id
                      ? 'bg-[#C65D3B] text-white font-semibold'
                      : 'text-neutral-500 hover:text-[#1C1B1A] dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Dynamic Provider-Specific Connection Panel */}
            {providerTab === 'gemini' ? (
              <div className="p-3 rounded-md bg-[#F9F9F9] dark:bg-[#1d1c1a] border border-black/8 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#1C1B1A] dark:text-[#F2EFE9]">
                    Status Koneksi Gemini Cloud
                  </span>
                  <span className="px-2 py-0.5 rounded-xs bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 font-mono text-[10px] font-semibold">
                    Default Vercel / Server Aktif
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  Website ini sudah otomatis terhubung ke environment server (<code className="font-mono text-[#C65D3B]">GEMINI_API_KEY</code>) dengan sistem <strong>Auto-Fallback 7 Model</strong>. Parameter presisi mengikuti <strong>Role Library</strong> (<code className="font-mono">Temp: {activeRoleObj.temperature ?? 0.2}</code>) dan jendela konteks dikelola otomatis oleh cloud.
                </p>
                <div className="text-[10.5px] font-mono text-neutral-400 pt-1 border-t border-black/6 dark:border-white/8 flex items-center justify-between">
                  <span>Model Aktif: <strong className="text-[#C65D3B]">{activeModelObj.name}</strong></span>
                  <span>Role Temp: <strong>{activeRoleObj.temperature ?? 0.2}</strong></span>
                </div>
              </div>
            ) : providerTab === 'qwen' ? (
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-medium mb-1">
                    Endpoint Qwen Cloud / OpenRouter Compatible
                  </label>
                  <input
                    type="text"
                    value={serverConfig.qwenEndpoint}
                    onChange={(e) =>
                      setServerConfig((prev) => ({
                        ...prev,
                        qwenEndpoint: e.target.value,
                      }))
                    }
                    placeholder="https://openrouter.ai/api/v1/chat/completions"
                    className="w-full px-2.5 py-1.5 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] border border-black/10 dark:border-white/10 font-mono text-[11px]"
                  />
                </div>
                <p className="text-[10.5px] text-neutral-400 leading-relaxed">
                  Parameter presisi Qwen Cloud otomatis mengikuti konfigurasi <strong>Role Library</strong> yang aktif (<code className="font-mono">Temp: {activeRoleObj.temperature ?? 0.2}</code>).
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium mb-1">
                    Endpoint Local LM Studio / Ollama / Cloudflare Tunnel
                  </label>
                  <input
                    type="text"
                    value={serverConfig.localEndpoint}
                    onChange={(e) =>
                      setServerConfig((prev) => ({
                        ...prev,
                        localEndpoint: e.target.value,
                      }))
                    }
                    placeholder="http://localhost:1234"
                    className="w-full px-2.5 py-1.5 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] border border-black/10 dark:border-white/10 font-mono text-[11px]"
                  />
                </div>

                {/* Local LM Exclusive Hardware & Context Parameters */}
                <div className="space-y-3 pt-2 border-t border-black/8 dark:border-white/10">
                  <div>
                    <div className="flex justify-between text-[11px] font-medium mb-1">
                      <span>Temperature (Kreativitas vs Presisi)</span>
                      <span className="font-mono text-[#C65D3B]">{temperature}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full accent-[#C65D3B]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-medium mb-1">
                      <span>Batas Context Window (Token Budget VRAM Lokal)</span>
                      <span className="font-mono text-[#C65D3B]">{contextWindow} tok</span>
                    </div>
                    <input
                      type="range"
                      min="2048"
                      max="16384"
                      step="1024"
                      value={contextWindow}
                      onChange={(e) => setContextWindow(parseInt(e.target.value, 10))}
                      className="w-full accent-[#C65D3B]"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setServerModalOpen(false)}
                className="px-3 py-1.5 rounded-xs bg-[#C65D3B] text-white font-semibold cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
