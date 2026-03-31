import { gitbookElements, resetCounter } from '@gitbook-editing/shared';
import { createDocFromMarkdown, addComment } from './google-docs.service.js';
import { logger } from '../utils/logger.js';

const PRESERVE_PREFIX = 'GITBOOK_PRESERVE:';

interface PreservedElement {
  placeholder: string;
  metadata: string;
}

export function preprocessMarkdown(markdown: string): { cleaned: string; preserved: PreservedElement[] } {
  resetCounter();
  const preserved: PreservedElement[] = [];
  let cleaned = markdown;

  for (const element of gitbookElements) {
    cleaned = cleaned.replace(element.detect, (match) => {
      const { placeholder, metadata } = element.extractForDoc(match);
      preserved.push({ placeholder, metadata });
      return placeholder;
    });
  }

  return { cleaned, preserved };
}

export interface PushResult {
  docId: string;
  docUrl: string;
  preservedCount: number;
}

export async function pushMarkdownToGoogleDoc(
  userId: number,
  title: string,
  markdown: string,
  folderId?: string,
): Promise<PushResult> {
  const { cleaned, preserved } = preprocessMarkdown(markdown);

  logger.info({ title, preservedCount: preserved.length }, 'Pushing markdown to Google Docs');

  const { docId, docUrl } = await createDocFromMarkdown(userId, title, cleaned, folderId);

  for (const elem of preserved) {
    try {
      await addComment(
        userId,
        docId,
        `${PRESERVE_PREFIX}${elem.metadata}`,
        elem.placeholder,
      );
    } catch (err) {
      logger.warn({ err, placeholder: elem.placeholder }, 'Failed to add preservation comment');
    }
  }

  return { docId, docUrl, preservedCount: preserved.length };
}
