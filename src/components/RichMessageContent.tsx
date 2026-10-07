import React, { useState } from 'react';
import katex from 'katex';
import { Copy, Check, BarChart3, Table as TableIcon } from 'lucide-react';

interface RichMessageContentProps {
  content: string;
  isStreaming?: boolean;
  isUser?: boolean;
}

interface ChartDataPoint {
  label: string;
  value: number;
  displayValue?: string;
}

interface ParsedChartSpec {
  type?: 'bar' | 'line';
  title?: string;
  unit?: string;
  data: ChartDataPoint[];
}

/**
 * Safely render LaTeX math string to HTML using KaTeX
 */
function renderMathToHtml(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex.trim(), {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: true,
    });
  } catch {
    return latex;
  }
}

/**
 * Parse inline formatting:
 * - Block/Inline LaTeX: $$...$$, \[...\], $...$, \(...\)
 * - Inline code: `...`
 * - Bold + Italic: ***...***
 * - Bold: **...** or __...__
 * - Underline: <u>...</u> or ++...++
 * - Italic: *...* or _..._
 * - Strikethrough: ~~...~~
 * - Superscript / Subscript: <sup>...</sup>, <sub>...</sub>, ^2, ^3
 */
export function renderInlineNodes(
  text: string,
  isUser = false,
  keyPrefix = 'inl'
): React.ReactNode[] {
  if (!text) return [];

  // Tokenize sequentially using a master regex
  const tokenRegex =
    /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$(?:\\.|[^$\n])+?\$|`[^`\n]+`|\*\*\*[^*\n]+\*\*\*|\*\*[^*\n]+\*\*|__[^_\n]+__|<u>[\s\S]+?<\/u>|\+\+[^+\n]+\+\+|~~[^~\n]+~~|\*[^*\n]+\*|(?<![a-zA-Z0-9])_[^_\n]+_(?![a-zA-Z0-9])|<sup>[\s\S]+?<\/sup>|<sub>[\s\S]+?<\/sub>)/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const raw = match[0];
    const tokenKey = `${keyPrefix}-${idx++}`;

    if (
      (raw.startsWith('$$') && raw.endsWith('$$')) ||
      (raw.startsWith('\\[') && raw.endsWith('\\]'))
    ) {
      const mathBody = raw.slice(2, -2);
      const html = renderMathToHtml(mathBody, true);
      nodes.push(
        <span
          key={tokenKey}
          className="block my-1.5 overflow-x-auto custom-scrollbar"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } else if (
      (raw.startsWith('\\(') && raw.endsWith('\\)')) ||
      (raw.startsWith('$') && raw.endsWith('$'))
    ) {
      const mathBody = raw.startsWith('\\(') ? raw.slice(2, -2) : raw.slice(1, -1);
      const html = renderMathToHtml(mathBody, false);
      nodes.push(
        <span
          key={tokenKey}
          className="inline-block align-middle mx-0.5"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } else if (raw.startsWith('`') && raw.endsWith('`')) {
      const codeContent = raw.slice(1, -1);
      // Check if inline backtick actually holds LaTeX command like \frac, \times, \sum
      if (/\\(frac|times|div|sum|prod|sqrt|int|approx|le|ge|pm|cdot|Delta|alpha|beta|pi)/.test(codeContent)) {
        const html = renderMathToHtml(codeContent, false);
        nodes.push(
          <span
            key={tokenKey}
            className="inline-block align-middle px-1.5 py-0.5 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] border border-black/8 dark:border-white/10"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } else {
        nodes.push(
          <code
            key={tokenKey}
            className={
              isUser
                ? 'px-1.5 py-0.5 rounded-xs bg-black/20 text-white font-mono text-[11px]'
                : 'px-1.5 py-0.5 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] border border-black/8 dark:border-white/10 font-mono text-[11px] text-[#C65D3B] dark:text-[#E58565]'
            }
          >
            {codeContent}
          </code>
        );
      }
    } else if (raw.startsWith('***') && raw.endsWith('***')) {
      nodes.push(
        <strong key={tokenKey} className="font-bold italic">
          {renderInlineNodes(raw.slice(3, -3), isUser, tokenKey)}
        </strong>
      );
    } else if (
      (raw.startsWith('**') && raw.endsWith('**')) ||
      (raw.startsWith('__') && raw.endsWith('__'))
    ) {
      nodes.push(
        <strong
          key={tokenKey}
          className={
            isUser
              ? 'font-bold text-white'
              : 'font-bold text-[#1C1B1A] dark:text-white'
          }
        >
          {renderInlineNodes(raw.slice(2, -2), isUser, tokenKey)}
        </strong>
      );
    } else if (
      (raw.startsWith('<u>') && raw.endsWith('</u>')) ||
      (raw.startsWith('++') && raw.endsWith('++'))
    ) {
      const inner = raw.startsWith('<u>') ? raw.slice(3, -4) : raw.slice(2, -2);
      nodes.push(
        <u
          key={tokenKey}
          className="underline underline-offset-3 decoration-[#C65D3B] decoration-1"
        >
          {renderInlineNodes(inner, isUser, tokenKey)}
        </u>
      );
    } else if (raw.startsWith('~~') && raw.endsWith('~~')) {
      nodes.push(
        <del key={tokenKey} className="line-through opacity-70">
          {renderInlineNodes(raw.slice(2, -2), isUser, tokenKey)}
        </del>
      );
    } else if (raw.startsWith('<sup>') && raw.endsWith('</sup>')) {
      nodes.push(
        <sup key={tokenKey} className="text-[9px] font-mono">
          {raw.slice(5, -6)}
        </sup>
      );
    } else if (raw.startsWith('<sub>') && raw.endsWith('</sub>')) {
      nodes.push(
        <sub key={tokenKey} className="text-[9px] font-mono">
          {raw.slice(5, -6)}
        </sub>
      );
    } else if (
      (raw.startsWith('*') && raw.endsWith('*')) ||
      (raw.startsWith('_') && raw.endsWith('_'))
    ) {
      nodes.push(
        <em key={tokenKey} className="italic">
          {renderInlineNodes(raw.slice(1, -1), isUser, tokenKey)}
        </em>
      );
    } else {
      nodes.push(raw);
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

/**
 * Responsive Interactive Chart Renderer (Bar & Line Chart)
 */
const ResponsiveChartBlock: React.FC<{ spec: ParsedChartSpec }> = ({ spec }) => {
  const [chartType, setChartType] = useState<'bar' | 'line'>(spec.type || 'bar');
  const validData = (spec.data || []).filter(
    (d) => typeof d.value === 'number' && !Number.isNaN(d.value)
  );
  if (validData.length === 0) return null;

  const maxVal = Math.max(...validData.map((d) => Math.abs(d.value)), 1);
  const unitPrefix = spec.unit === 'Rp' ? 'Rp ' : '';
  const unitSuffix = spec.unit && spec.unit !== 'Rp' ? ` ${spec.unit}` : '';

  const formatVal = (v: number) =>
    `${unitPrefix}${Math.round(v).toLocaleString('id-ID')}${unitSuffix}`;

  return (
    <div className="my-3 rounded-md border border-black/10 dark:border-white/10 bg-[#F9F9F9] dark:bg-[#1d1c1a] p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-black/6 dark:border-white/8">
        <div className="flex items-center gap-1.5 min-w-0">
          <BarChart3 className="w-3.5 h-3.5 text-[#C65D3B] shrink-0" />
          <span className="text-[11.5px] font-display font-bold text-[#1C1B1A] dark:text-[#F2EFE9] truncate">
            {spec.title || 'Visualisasi Data & Harga'}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setChartType('bar')}
            className={`px-2 py-0.5 rounded-xs text-[10px] font-medium cursor-pointer ${
              chartType === 'bar'
                ? 'bg-[#C65D3B] text-white font-semibold'
                : 'bg-black/5 dark:bg-white/5 text-neutral-500'
            }`}
          >
            Bar
          </button>
          <button
            type="button"
            onClick={() => setChartType('line')}
            className={`px-2 py-0.5 rounded-xs text-[10px] font-medium cursor-pointer ${
              chartType === 'line'
                ? 'bg-[#C65D3B] text-white font-semibold'
                : 'bg-black/5 dark:bg-white/5 text-neutral-500'
            }`}
          >
            Line
          </button>
        </div>
      </div>

      {chartType === 'bar' ? (
        <div className="space-y-2 pt-1">
          {validData.map((item, idx) => {
            const pct = Math.max(6, Math.round((Math.abs(item.value) / maxVal) * 100));
            return (
              <div key={`${item.label}-${idx}`} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-medium text-[#1C1B1A] dark:text-[#F2EFE9] truncate">
                    {item.label}
                  </span>
                  <span className="font-mono font-semibold text-[#C65D3B] tabular-nums shrink-0">
                    {item.displayValue || formatVal(item.value)}
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-xs bg-black/6 dark:bg-white/8 overflow-hidden">
                  <div
                    className="h-full rounded-xs bg-[#C65D3B] transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="w-full overflow-x-auto custom-scrollbar pt-1">
          <svg
            viewBox={`0 0 ${Math.max(360, validData.length * 90)} 160`}
            className="w-full h-40 overflow-visible"
          >
            {/* Grid lines */}
            {[0.25, 0.5, 0.75, 1].map((ratio) => (
              <line
                key={ratio}
                x1={24}
                x2={Math.max(360, validData.length * 90) - 24}
                y1={130 - ratio * 100}
                y2={130 - ratio * 100}
                stroke="currentColor"
                className="text-black/8 dark:text-white/10"
                strokeDasharray="3 3"
              />
            ))}
            {/* Polyline */}
            {validData.length > 1 && (
              <polyline
                fill="none"
                stroke="#C65D3B"
                strokeWidth="2.5"
                points={validData
                  .map((d, i) => {
                    const width = Math.max(360, validData.length * 90) - 64;
                    const x = 32 + (i / (validData.length - 1)) * width;
                    const y = 130 - (Math.abs(d.value) / maxVal) * 100;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
            )}
            {/* Nodes & Labels */}
            {validData.map((d, i) => {
              const width = Math.max(360, validData.length * 90) - 64;
              const x =
                validData.length > 1
                  ? 32 + (i / (validData.length - 1)) * width
                  : 180;
              const y = 130 - (Math.abs(d.value) / maxVal) * 100;
              return (
                <g key={`${d.label}-${i}`}>
                  <circle cx={x} cy={y} r={4} fill="#C65D3B" />
                  <text
                    x={x}
                    y={y - 8}
                    textAnchor="middle"
                    className="fill-[#C65D3B] font-mono text-[9.5px] font-bold"
                  >
                    {d.displayValue || formatVal(d.value)}
                  </text>
                  <text
                    x={x}
                    y={148}
                    textAnchor="middle"
                    className="fill-neutral-500 font-sans text-[9.5px]"
                  >
                    {d.label.slice(0, 14)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
};

/**
 * Extract numeric value from a table cell like "Rp 4.125", "Rp 3.902,25", "4125"
 */
function parseTableNumericCell(rawCell: string): number | null {
  const cleaned = rawCell.replace(/\*\*|`/g, '').trim();
  // Match Rupiah or standalone numbers
  const rpMatch = cleaned.match(/Rp\.?\s*([0-9.]+(?:,[0-9]+)?)/i);
  if (rpMatch) {
    const normalized = rpMatch[1].replace(/\./g, '').replace(',', '.');
    const val = parseFloat(normalized);
    return Number.isFinite(val) && val > 0 ? val : null;
  }
  // Only match pure number cell
  if (/^-?[0-9.]+(?:,[0-9]+)?$/.test(cleaned)) {
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const val = parseFloat(normalized);
    return Number.isFinite(val) && Math.abs(val) > 0 ? val : null;
  }
  return null;
}

/**
 * Responsive Markdown Table Component with CSV Copy & Instant Chart View Toggle
 */
const ResponsiveMarkdownTable: React.FC<{ rows: string[][] }> = ({ rows }) => {
  const [copiedTable, setCopiedTable] = useState(false);
  const [showChart, setShowChart] = useState(false);

  if (rows.length === 0) return null;

  // Filter out separator row like |---|---|
  const isSeparatorRow = (r: string[]) =>
    r.every((cell) => /^[:\-\s]+$/.test(cell.trim()) || cell.trim() === '');

  const headerRow = rows[0];
  const bodyRows = rows.slice(1).filter((r) => !isSeparatorRow(r));

  // Detect alignment from separator row if present
  const sepRow = rows.slice(1).find((r) => isSeparatorRow(r));
  const alignments: Array<'left' | 'center' | 'right'> = headerRow.map((_, colIdx) => {
    const sep = sepRow?.[colIdx]?.trim() || '';
    if (sep.startsWith(':') && sep.endsWith(':')) return 'center';
    if (sep.endsWith(':')) return 'right';
    return 'left';
  });

  // Extract chartable data points from table if possible
  const chartDataPoints: ChartDataPoint[] = [];
  for (const r of bodyRows) {
    if (r.length < 2) continue;
    const label = r[0].replace(/\*\*|`/g, '').trim();
    // Find first column with a valid numeric/Rupiah value
    for (let c = 1; c < r.length; c++) {
      const num = parseTableNumericCell(r[c]);
      if (num !== null && label) {
        chartDataPoints.push({
          label,
          value: num,
          displayValue: r[c].replace(/\*\*|`/g, '').trim(),
        });
        break;
      }
    }
  }

  const handleCopyTable = () => {
    const tsv = [headerRow, ...bodyRows]
      .map((r) => r.map((c) => c.replace(/\*\*|`/g, '').trim()).join('\t'))
      .join('\n');
    navigator.clipboard.writeText(tsv);
    setCopiedTable(true);
    setTimeout(() => setCopiedTable(false), 1800);
  };

  return (
    <div className="my-3 rounded-md border border-black/10 dark:border-white/12 bg-[#FFFFFF] dark:bg-[#161311] overflow-hidden shadow-2xs">
      {/* Table Top Bar */}
      <div className="px-3 py-1.5 bg-[#F3F1ED] dark:bg-[#22201E] border-b border-black/8 dark:border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10.5px] font-display font-bold text-neutral-600 dark:text-neutral-300">
          <TableIcon className="w-3 h-3 text-[#C65D3B]" />
          <span>Tabel Data ({bodyRows.length} baris)</span>
        </div>
        <div className="flex items-center gap-1.5">
          {chartDataPoints.length >= 2 && (
            <button
              type="button"
              onClick={() => setShowChart(!showChart)}
              className={`px-2 py-0.5 rounded-xs text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                showChart
                  ? 'bg-[#C65D3B] text-white'
                  : 'bg-white dark:bg-[#161311] border border-black/10 dark:border-white/10 text-[#C65D3B]'
              }`}
            >
              <BarChart3 className="w-3 h-3" />
              <span>{showChart ? 'Tutup Grafik' : 'Lihat Grafik'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleCopyTable}
            className="px-2 py-0.5 rounded-xs bg-white dark:bg-[#161311] border border-black/10 dark:border-white/10 text-[10px] font-medium flex items-center gap-1 hover:border-[#C65D3B] cursor-pointer"
          >
            {copiedTable ? (
              <>
                <Check className="w-2.5 h-2.5 text-emerald-600" />
                <span>Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="w-2.5 h-2.5" />
                <span>Salin Tabel</span>
              </>
            )}
          </button>
        </div>
      </div>

      {showChart && chartDataPoints.length >= 2 && (
        <div className="p-3 border-b border-black/8 dark:border-white/10 bg-[#F9F9F9] dark:bg-[#1a1816]">
          <ResponsiveChartBlock
            spec={{
              type: 'bar',
              title: `${headerRow[0]?.replace(/\*\*/g, '') || 'Perbandingan'} (${
                headerRow[1]?.replace(/\*\*/g, '') || 'Nilai'
              })`,
              unit: 'Rp',
              data: chartDataPoints,
            }}
          />
        </div>
      )}

      {/* Scrollable Responsive Table (overflow-y-visible so vertical mouse wheel never gets trapped) */}
      <div className="w-full overflow-x-auto overflow-y-visible custom-scrollbar">
        <table className="w-full border-collapse text-left text-[11.5px]">
          <thead>
            <tr className="bg-[#F9F9F9] dark:bg-[#1d1c1a] border-b border-black/8 dark:border-white/10">
              {headerRow.map((cell, colIdx) => (
                <th
                  key={`th-${colIdx}`}
                  style={{ textAlign: alignments[colIdx] || 'left' }}
                  className="px-3 py-2 font-display font-bold text-[#1C1B1A] dark:text-[#F2EFE9] whitespace-nowrap border-r last:border-r-0 border-black/5 dark:border-white/5"
                >
                  {renderInlineNodes(cell.trim(), false, `th-${colIdx}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/6 dark:divide-white/8">
            {bodyRows.map((row, rowIdx) => (
              <tr
                key={`tr-${rowIdx}`}
                className="hover:bg-[#C65D3B]/5 transition-colors even:bg-black/[0.015] dark:even:bg-white/[0.015]"
              >
                {headerRow.map((_, colIdx) => {
                  const rawCell = row[colIdx] ?? '';
                  return (
                    <td
                      key={`td-${rowIdx}-${colIdx}`}
                      style={{ textAlign: alignments[colIdx] || 'left' }}
                      className="px-3 py-2 align-top text-[#1C1B1A] dark:text-[#F2EFE9] tabular-nums border-r last:border-r-0 border-black/5 dark:border-white/5 leading-relaxed"
                    >
                      {renderInlineNodes(
                        rawCell.trim(),
                        false,
                        `td-${rowIdx}-${colIdx}`
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Split a Markdown table row `| Col 1 | Col 2 |` into cell strings
 */
function splitTableRow(line: string): string[] {
  const trimmed = line.trim();
  const withoutOuterPipes = trimmed
    .replace(/^\|/, '')
    .replace(/\|$/, '');
  return withoutOuterPipes.split('|').map((c) => c.trim());
}

/**
 * Main Rich Message Content Renderer
 * Supports:
 * - Headings, Bold, Italic, Underline, Strikethrough, Code Blocks
 * - KaTeX Block & Inline Math Formulas ($$...$$, $...$, \[...\], \(...\))
 * - Multi-level Bullet & Numbered Lists
 * - Responsive Markdown Tables (including partial streaming tables!)
 * - Interactive SVG Charts
 */
export const RichMessageContent: React.FC<RichMessageContentProps> = ({
  content,
  isStreaming = false,
  isUser = false,
}) => {
  const [copiedBlockIdx, setCopiedBlockIdx] = useState<number | null>(null);

  if (!content && isStreaming) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-neutral-400 font-mono py-1">
        <span className="inline-block w-2 h-3.5 bg-[#C65D3B] animate-pulse" />
        <span>Menghasilkan respons...</span>
      </div>
    );
  }

  // For user messages, render clean inline formatting + line breaks with high-contrast selection
  if (isUser) {
    return (
      <div className="universal-chat-typography whitespace-pre-wrap break-words font-sans text-[12px] leading-relaxed">
        {renderInlineNodes(content, true, 'usr')}
      </div>
    );
  }

  // First, split by fenced code blocks ```lang ... ``` or block math $$ ... $$
  const topBlocks: Array<
    | { type: 'text'; value: string }
    | { type: 'code'; lang: string; value: string }
    | { type: 'math_block'; value: string }
  > = [];

  const blockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)(?:```|$)|\$\$([\s\S]*?)(?:\$\$|$)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(content)) !== null) {
    if (match.index > lastIdx) {
      topBlocks.push({
        type: 'text',
        value: content.slice(lastIdx, match.index),
      });
    }

    if (match[3] !== undefined) {
      topBlocks.push({
        type: 'math_block',
        value: match[3],
      });
    } else {
      topBlocks.push({
        type: 'code',
        lang: (match[1] || 'text').toLowerCase(),
        value: match[2] || '',
      });
    }

    lastIdx = blockRegex.lastIndex;
  }

  if (lastIdx < content.length) {
    topBlocks.push({
      type: 'text',
      value: content.slice(lastIdx),
    });
  }

  const renderTextSection = (sectionText: string, secIdx: number, isLastSection: boolean) => {
    const lines = sectionText.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip pure empty line
      if (!trimmed) {
        i++;
        continue;
      }

      // 1. Horizontal Rule (--- or ***)
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
        elements.push(
          <hr
            key={`hr-${secIdx}-${i}`}
            className="my-3 border-t border-black/10 dark:border-white/10"
          />
        );
        i++;
        continue;
      }

      // 2. Markdown Table Detection (supports live streaming tables!)
      if (
        trimmed.startsWith('|') &&
        trimmed.indexOf('|', 1) !== -1
      ) {
        const tableRows: string[][] = [];
        while (
          i < lines.length &&
          lines[i].trim().startsWith('|') &&
          lines[i].trim().indexOf('|', 1) !== -1
        ) {
          tableRows.push(splitTableRow(lines[i]));
          i++;
        }
        if (tableRows.length >= 1) {
          elements.push(
            <ResponsiveMarkdownTable
              key={`tbl-${secIdx}-${i}`}
              rows={tableRows}
            />
          );
          continue;
        }
      }

      // 3. Headings (# to ####)
      const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const headingText = headingMatch[2];
        const sizeClass =
          level === 1
            ? 'text-base font-display font-bold mt-3 mb-1.5 text-[#1C1B1A] dark:text-white'
            : level === 2
            ? 'text-sm font-display font-bold mt-2.5 mb-1 text-[#1C1B1A] dark:text-white'
            : 'text-[12.5px] font-display font-bold mt-2 mb-1 text-[#1C1B1A] dark:text-white';
        elements.push(
          <div key={`hd-${secIdx}-${i}`} className={sizeClass}>
            {renderInlineNodes(headingText, false, `hd-${secIdx}-${i}`)}
          </div>
        );
        i++;
        continue;
      }

      // 4. Blockquote (> ...)
      if (trimmed.startsWith('>')) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
          i++;
        }
        elements.push(
          <blockquote
            key={`bq-${secIdx}-${i}`}
            className="my-2 pl-3 py-1 border-l-2 border-[#C65D3B] bg-[#F3F1ED]/50 dark:bg-[#22201E]/50 rounded-r-xs text-[12px] italic text-neutral-700 dark:text-neutral-300 space-y-1"
          >
            {quoteLines.map((ql, qIdx) => (
              <div key={`bql-${qIdx}`}>
                {renderInlineNodes(ql, false, `bq-${secIdx}-${i}-${qIdx}`)}
              </div>
            ))}
          </blockquote>
        );
        continue;
      }

      // 5. Ordered & Unordered Lists (Supports nested indentation!)
      const listMatch = line.match(/^(\s*)(\d+\.|[*+-]|•)\s+(.+)$/);
      if (listMatch) {
        const listItems: Array<{
          indent: number;
          marker: string;
          isOrdered: boolean;
          text: string;
        }> = [];

        while (i < lines.length) {
          const m = lines[i].match(/^(\s*)(\d+\.|[*+-]|•)\s+(.+)$/);
          if (!m) break;
          const indentSpaces = m[1].replace(/\t/g, '  ').length;
          const marker = m[2];
          listItems.push({
            indent: Math.min(3, Math.floor(indentSpaces / 2)),
            marker,
            isOrdered: /^\d+\.$/.test(marker),
            text: m[3],
          });
          i++;
        }

        elements.push(
          <div key={`lst-${secIdx}-${i}`} className="my-1.5 space-y-1.5">
            {listItems.map((item, idx) => (
              <div
                key={`li-${secIdx}-${i}-${idx}`}
                style={{ paddingLeft: `${item.indent * 1.1}rem` }}
                className="flex items-baseline gap-2 text-[12.5px] leading-relaxed"
              >
                <span
                  className={
                    item.isOrdered
                      ? 'font-mono font-bold text-[#C65D3B] text-[11.5px] shrink-0 select-none'
                      : 'text-[#C65D3B] font-bold shrink-0 select-none'
                  }
                >
                  {item.isOrdered ? item.marker : item.indent > 0 ? '◦' : '•'}
                </span>
                <div className="min-w-0 flex-1">
                  {renderInlineNodes(
                    item.text,
                    false,
                    `li-${secIdx}-${i}-${idx}`
                  )}
                </div>
              </div>
            ))}
          </div>
        );
        continue;
      }

      // 6. Standard Paragraph
      const isVeryLastLine = isLastSection && i === lines.length - 1;
      elements.push(
        <p
          key={`p-${secIdx}-${i}`}
          className="text-[12.5px] leading-relaxed text-[#1C1B1A] dark:text-[#F2EFE9] my-1.5"
        >
          {renderInlineNodes(line, false, `p-${secIdx}-${i}`)}
          {isStreaming && isVeryLastLine && (
            <span className="inline-block w-1.5 h-3.5 ml-1 align-middle bg-[#C65D3B] animate-pulse" />
          )}
        </p>
      );
      i++;
    }

    return elements;
  };

  return (
    <div className="universal-chat-typography space-y-2 w-full">
      {topBlocks.map((block, bIdx) => {
        const isLast = bIdx === topBlocks.length - 1;

        if (block.type === 'math_block') {
          const html = renderMathToHtml(block.value, true);
          return (
            <div
              key={`mb-${bIdx}`}
              className="my-2.5 p-3 rounded-md bg-[#F9F9F9] dark:bg-[#1d1c1a] border border-black/8 dark:border-white/10 overflow-x-auto custom-scrollbar"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }

        if (block.type === 'code') {
          // Check if it's a chart JSON block
          if (block.lang === 'chart' || block.lang === 'json-chart') {
            try {
              const parsedSpec = JSON.parse(block.value.trim()) as ParsedChartSpec;
              if (parsedSpec && Array.isArray(parsedSpec.data)) {
                return <ResponsiveChartBlock key={`ch-${bIdx}`} spec={parsedSpec} />;
              }
            } catch {
              // If still streaming JSON, show clean loading or code block
            }
          }

          return (
            <div
              key={`cb-${bIdx}`}
              className="my-2.5 rounded-md border border-black/10 dark:border-white/12 bg-[#F9F9F9] dark:bg-[#141312] overflow-hidden"
            >
              <div className="px-3 py-1.5 bg-[#F3F1ED] dark:bg-[#22201E] border-b border-black/8 dark:border-white/10 flex items-center justify-between text-[10px] font-mono text-neutral-500">
                <span className="uppercase font-semibold text-[#C65D3B]">
                  {block.lang || 'code'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(block.value);
                    setCopiedBlockIdx(bIdx);
                    setTimeout(() => setCopiedBlockIdx(null), 1800);
                  }}
                  className="flex items-center gap-1 hover:text-[#1C1B1A] dark:hover:text-white cursor-pointer"
                >
                  {copiedBlockIdx === bIdx ? (
                    <>
                      <Check className="w-2.5 h-2.5 text-emerald-600" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5" />
                      <span>Salin Kode</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 font-mono text-[11px] leading-relaxed overflow-x-auto custom-scrollbar text-[#1C1B1A] dark:text-[#F2EFE9]">
                <code>{block.value}</code>
              </pre>
            </div>
          );
        }

        return (
          <React.Fragment key={`txt-${bIdx}`}>
            {renderTextSection(block.value, bIdx, isLast)}
          </React.Fragment>
        );
      })}
    </div>
  );
};
