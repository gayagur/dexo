/**
 * Extract and parse JSON from vision LLM replies (markdown fences, prose, minor syntax errors).
 */

/** First top-level `{ ... }` with string-aware brace matching (avoids greedy /\{[\s\S]*\}/ bugs). */
export function extractBalancedJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\") {
        escape = true;
        continue;
      }
      if (c === '"') {
        inString = false;
        continue;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

export function stripJsonTrailingCommas(s: string): string {
  let prev = "";
  let out = s;
  while (out !== prev) {
    prev = out;
    out = out.replace(/,\s*([\]}])/g, "$1");
  }
  return out;
}

/** Unquoted π in arrays breaks JSON.parse; replace common numeric forms (best-effort, may hit strings rarely). */
export function replacePiLiterals(s: string): string {
  return s
    .replace(/\bπ\s*\/\s*2\b/gi, "1.5707963267948966")
    .replace(/\bπ\s*\/\s*4\b/gi, "0.7853981633974483")
    .replace(/\bπ\b/gi, "3.141592653589793");
}

function trimBom(s: string): string {
  return s.replace(/^\uFEFF/, "").trim();
}

export function parseFurnitureAnalysisFromLlmText(content: string): { ok: true; data: unknown } | { ok: false } {
  const candidates: string[] = [];

  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]?.trim()) candidates.push(trimBom(fenced[1].trim()));

  const balanced = extractBalancedJsonObject(content);
  if (balanced) candidates.push(trimBom(balanced));

  if (fenced?.[1]) {
    const inner = extractBalancedJsonObject(fenced[1]);
    if (inner) candidates.push(trimBom(inner));
  }

  if (candidates.length === 0) {
    const greedy = content.match(/\{[\s\S]*\}/);
    if (greedy) candidates.push(trimBom(greedy[0]));
  }

  const unique = [...new Set(candidates)];

  const tryVariants = (raw: string) => {
    const base = trimBom(raw);
    const pi = replacePiLiterals(base);
    return [base, stripJsonTrailingCommas(base), pi, stripJsonTrailingCommas(pi)];
  };

  for (const c of unique) {
    for (const v of tryVariants(c)) {
      try {
        return { ok: true, data: JSON.parse(v) };
      } catch {
        /* next variant */
      }
    }
  }

  return { ok: false };
}
