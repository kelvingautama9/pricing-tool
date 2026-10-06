// Dynamic Context Sniffer & Anti-Hallucination Engine
export interface WebAppContext {
  appTitle: string;
  metaDescription: string;
  currentPath: string;
  detectedDomain: 'ecommerce' | 'coding' | 'analytics' | 'productivity' | 'general';
  activePageSummary: string;
}

export function detectCurrentWebContext(): WebAppContext {
  if (typeof window === 'undefined') {
    return {
      appTitle: 'MYPAK Sheet Pricing Calculator',
      metaDescription: '',
      currentPath: '/',
      detectedDomain: 'general',
      activePageSummary: '',
    };
  }

  const title = document.title || 'MYPAK Sheet Pricing Calculator';
  const metaDesc =
    document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  const path = window.location.pathname;

  const combined = `${title} ${metaDesc} ${path}`.toLowerCase();
  let domain: WebAppContext['detectedDomain'] = 'general';

  if (/shop|store|product|cart|harga|checkout|katalog|pricing|sheet/i.test(combined)) {
    domain = 'ecommerce';
  } else if (/code|developer|api|git|terminal|debug|function/i.test(combined)) {
    domain = 'coding';
  } else if (/metric|dashboard|chart|analisis|report|sql|data/i.test(combined)) {
    domain = 'analytics';
  } else if (/task|note|calendar|doc|project|todo|crm/i.test(combined)) {
    domain = 'productivity';
  }

  const mainHeadings = Array.from(document.querySelectorAll('h1, h2'))
    .slice(0, 3)
    .map((el) => el.textContent?.trim())
    .filter(Boolean)
    .join(' | ');

  return {
    appTitle: title,
    metaDescription: metaDesc,
    currentPath: path,
    detectedDomain: domain,
    activePageSummary: mainHeadings,
  };
}

export function buildUniversalSystemInstruction(
  basePrompt: string,
  rolePrompt?: string,
  activeCalculatorSnapshot?: string
): string {
  const ctx = detectCurrentWebContext();

  const groundingEnvelope = `
[RUNTIME CONTEXT GROUNDING]
- Current Application: "${ctx.appTitle}"
- Page Context: "${ctx.currentPath}" (${ctx.activePageSummary || 'Main Workspace'})
- Operating Domain: ${ctx.detectedDomain.toUpperCase()}
${activeCalculatorSnapshot ? `- Active Pricing Snapshot: ${activeCalculatorSnapshot}` : ''}
- Strict Instruction: Ground your reasoning EXCLUSIVELY in the active application domain (${ctx.detectedDomain}). Do NOT assume external domain rules from other unrelated projects unless explicitly provided by the user.

[RICH OUTPUT, MATHEMATICAL LATEX, TABLE & CHART CAPABILITIES]
- Text Styling: You may use **bold**, *italic*, <u>underline</u>, ~~strikethrough~~, inline \`code\`, headings, blockquotes, and structured lists.
- Universal Unicode & Multilingual: Full support for all Unicode symbols (×, ÷, ±, ≈, ≤, ≥, ∑, ∫, √, Δ, π, m², Rp, €, ¥, etc.) and foreign scripts.
- Mathematical Formulas (Basic to Expert): Use LaTeX notation with inline \`$...$\` or block \`$$...$$\` for mathematical equations, fractions (\`\\frac{a}{b}\`), summations (\`\\sum\`), integrals (\`\\int\`), roots (\`\\sqrt{}\`), matrices, and pricing formulas.
- Responsive Tables: When presenting structured comparisons or step-by-step pricing breakdowns, use standard Markdown tables (\`| Kolom 1 | Kolom 2 |\`).
- Interactive Charts / Graphs: When the user asks for a chart/grafik, output a Markdown table AND/OR a \`\`\`chart code block containing valid JSON:
  \`\`\`chart
  {"type":"bar","title":"Judul Grafik","unit":"Rp","data":[{"label":"Tahap 1","value":4125},{"label":"Final","value":3902}]}
  \`\`\`

[ROLE & BEHAVIOR SPECIFICATION]
${rolePrompt || basePrompt}
`.trim();

  return groundingEnvelope;
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
