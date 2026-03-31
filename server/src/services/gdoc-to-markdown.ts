import type { docs_v1 } from 'googleapis';
import { gitbookElements } from '@gitbook-editing/shared';
import { getDocument, listComments } from './google-docs.service.js';
import { logger } from '../utils/logger.js';

const PRESERVE_PREFIX = 'GITBOOK_PRESERVE:';

interface PreservationMap {
  [quotedText: string]: string;
}

function buildPreservationMap(comments: Array<{ content: string; quotedText: string }>): PreservationMap {
  const map: PreservationMap = {};
  for (const comment of comments) {
    if (comment.content.startsWith(PRESERVE_PREFIX)) {
      const metadata = comment.content.slice(PRESERVE_PREFIX.length);
      try {
        const parsed = JSON.parse(metadata) as { type: string };
        const element = gitbookElements.find((e) => e.name === parsed.type);
        if (element) {
          map[comment.quotedText] = element.restoreFromDoc(metadata);
        }
      } catch {
        logger.warn({ content: comment.content }, 'Failed to parse preservation comment');
      }
    }
  }
  return map;
}

function convertTextRun(textRun: docs_v1.Schema$TextRun): string {
  let text = textRun.content ?? '';
  const style = textRun.textStyle;

  if (!style || text === '\n') return text;

  if (style.bold) text = `**${text.trim()}** `;
  if (style.italic) text = `*${text.trim()}* `;
  if (style.strikethrough) text = `~~${text.trim()}~~ `;
  if (style.link?.url) text = `[${text.trim()}](${style.link.url})`;

  const codeStyle = style.weightedFontFamily?.fontFamily;
  if (codeStyle && /mono|courier|consolas/i.test(codeStyle)) {
    text = `\`${text.trim()}\``;
  }

  return text;
}

function convertParagraph(paragraph: docs_v1.Schema$Paragraph, preservationMap: PreservationMap): string {
  const style = paragraph.paragraphStyle?.namedStyleType ?? 'NORMAL_TEXT';
  const elements = paragraph.elements ?? [];

  let text = '';
  for (const element of elements) {
    if (element.textRun) {
      text += convertTextRun(element.textRun);
    } else if (element.inlineObjectElement) {
      text += '![image]()';
    }
  }

  text = text.trimEnd();

  for (const [placeholder, original] of Object.entries(preservationMap)) {
    if (text.includes(placeholder)) {
      return original;
    }
  }

  if (text === '') return '';

  switch (style) {
    case 'HEADING_1': return `# ${text}`;
    case 'HEADING_2': return `## ${text}`;
    case 'HEADING_3': return `### ${text}`;
    case 'HEADING_4': return `#### ${text}`;
    case 'HEADING_5': return `##### ${text}`;
    case 'HEADING_6': return `###### ${text}`;
    default: break;
  }

  const bullet = paragraph.bullet;
  if (bullet) {
    const level = bullet.nestingLevel ?? 0;
    const indent = '  '.repeat(level);
    const listId = bullet.listId ?? '';
    // Ordered lists typically have glyph types with numbers
    const isOrdered = listId.length > 0 && (paragraph.paragraphStyle as Record<string, unknown>)?.['listType'] === 'ORDERED';
    const marker = isOrdered ? '1.' : '-';
    return `${indent}${marker} ${text}`;
  }

  return text;
}

function convertTable(table: docs_v1.Schema$Table, preservationMap: PreservationMap): string {
  const rows = table.tableRows ?? [];
  if (rows.length === 0) return '';

  const mdRows: string[][] = [];

  for (const row of rows) {
    const cells = row.tableCells ?? [];
    const mdCells: string[] = [];
    for (const cell of cells) {
      const cellContent = (cell.content ?? [])
        .map((el) => {
          if (el.paragraph) return convertParagraph(el.paragraph, preservationMap);
          return '';
        })
        .filter(Boolean)
        .join(' ');
      mdCells.push(cellContent.replace(/\|/g, '\\|'));
    }
    mdRows.push(mdCells);
  }

  if (mdRows.length === 0) return '';

  const header = `| ${mdRows[0].join(' | ')} |`;
  const separator = `| ${mdRows[0].map(() => '---').join(' | ')} |`;
  const body = mdRows.slice(1).map((row) => `| ${row.join(' | ')} |`).join('\n');

  return [header, separator, body].filter(Boolean).join('\n');
}

export interface PullResult {
  markdown: string;
  title: string;
}

export async function pullGoogleDocToMarkdown(
  userId: number,
  docId: string,
): Promise<PullResult> {
  const [doc, comments] = await Promise.all([
    getDocument(userId, docId),
    listComments(userId, docId),
  ]);

  const preservationMap = buildPreservationMap(comments);
  const title = doc.title ?? 'Untitled';

  logger.info({ docId, title, preservedElements: Object.keys(preservationMap).length }, 'Pulling Google Doc to markdown');

  const body = doc.body;
  if (!body?.content) return { markdown: '', title };

  const lines: string[] = [];

  for (const element of body.content) {
    if (element.paragraph) {
      lines.push(convertParagraph(element.paragraph, preservationMap));
    } else if (element.table) {
      lines.push(convertTable(element.table, preservationMap));
    } else if (element.sectionBreak) {
      lines.push('');
    }
  }

  const markdown = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  return { markdown, title };
}
