import type { SummaryEntry } from '@gitbook-editing/shared';

const LINK_ANGLE = /^(\s*)\*\s+\[([^\]]+)\]\(<([^>]+)>\)\s*$/;
const LINK_PLAIN = /^(\s*)\*\s+\[([^\]]+)\]\(([^)]+)\)\s*$/;
const HEADING_PATTERN = /^#+\s+/;

export function parseSummary(content: string): SummaryEntry[] {
  const lines = content.split('\n');
  const entries: SummaryEntry[] = [];
  const stack: { depth: number; children: SummaryEntry[] }[] = [{ depth: -1, children: entries }];

  for (const line of lines) {
    if (HEADING_PATTERN.test(line) || line.trim() === '') continue;

    const match = line.match(LINK_ANGLE) ?? line.match(LINK_PLAIN);
    if (!match) continue;

    const [, indent, title, path] = match;
    const depth = Math.floor((indent?.length ?? 0) / 2);

    const entry: SummaryEntry = { title, path, depth, children: [] };

    while (stack.length > 1 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }

    stack[stack.length - 1].children.push(entry);
    stack.push({ depth, children: entry.children });
  }

  return entries;
}

export function flattenSummary(entries: SummaryEntry[]): SummaryEntry[] {
  const flat: SummaryEntry[] = [];
  function walk(items: SummaryEntry[]): void {
    for (const item of items) {
      flat.push(item);
      walk(item.children);
    }
  }
  walk(entries);
  return flat;
}
