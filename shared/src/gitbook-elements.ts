export interface GitBookElement {
  name: string;
  detect: RegExp;
  extractForDoc: (match: string) => { placeholder: string; metadata: string };
  restoreFromDoc: (metadata: string) => string;
}

let placeholderCounter = 0;

function resetCounter(): void {
  placeholderCounter = 0;
}

function nextPlaceholder(name: string): string {
  return `⟦GITBOOK_${name.toUpperCase()}_${placeholderCounter++}⟧`;
}

export const gitbookElements: GitBookElement[] = [
  {
    name: 'card-table',
    detect: /<table\s+data-view="cards"[\s\S]*?<\/table>/gi,
    extractForDoc(match: string) {
      const placeholder = nextPlaceholder('CARD');
      return {
        placeholder: `${placeholder} [Card layout - do not edit]`,
        metadata: JSON.stringify({ type: 'card-table', html: match }),
      };
    },
    restoreFromDoc(metadata: string) {
      const parsed = JSON.parse(metadata) as { html: string };
      return parsed.html;
    },
  },
  {
    name: 'liquid-include',
    detect: /\{%\s*include\s+"[^"]*"\s*%\}/gi,
    extractForDoc(match: string) {
      const placeholder = nextPlaceholder('INCLUDE');
      return {
        placeholder: `${placeholder} [Included content - do not edit]`,
        metadata: JSON.stringify({ type: 'liquid-include', raw: match }),
      };
    },
    restoreFromDoc(metadata: string) {
      const parsed = JSON.parse(metadata) as { raw: string };
      return parsed.raw;
    },
  },
  {
    name: 'button-link',
    detect: /<a\s+href="[^"]*"\s+class="button[^"]*"[^>]*>[\s\S]*?<\/a>/gi,
    extractForDoc(match: string) {
      const textMatch = match.match(/>([^<]*)</);
      const text = textMatch ? textMatch[1].trim() : 'Button';
      const placeholder = nextPlaceholder('BUTTON');
      return {
        placeholder: `${placeholder} [Button: ${text}]`,
        metadata: JSON.stringify({ type: 'button-link', html: match }),
      };
    },
    restoreFromDoc(metadata: string) {
      const parsed = JSON.parse(metadata) as { html: string };
      return parsed.html;
    },
  },
  {
    name: 'aligned-figure',
    detect: /<div\s+align="[^"]*">\s*<figure>[\s\S]*?<\/figure>\s*<\/div>/gi,
    extractForDoc(match: string) {
      const imgMatch = match.match(/src="([^"]*)"/);
      const src = imgMatch ? imgMatch[1] : '';
      const placeholder = nextPlaceholder('AFIG');
      return {
        placeholder: `${placeholder} [Aligned image: ${src}]`,
        metadata: JSON.stringify({ type: 'aligned-figure', html: match }),
      };
    },
    restoreFromDoc(metadata: string) {
      const parsed = JSON.parse(metadata) as { html: string };
      return parsed.html;
    },
  },
  {
    name: 'figure-image',
    detect: /<figure>\s*<img[^>]*>[\s\S]*?<\/figure>/gi,
    extractForDoc(match: string) {
      const imgMatch = match.match(/src="([^"]*)"/);
      const src = imgMatch ? imgMatch[1] : '';
      const altMatch = match.match(/alt="([^"]*)"/);
      const alt = altMatch ? altMatch[1] : '';
      const captionMatch = match.match(/<figcaption>([\s\S]*?)<\/figcaption>/);
      const caption = captionMatch ? captionMatch[1].trim() : '';
      const placeholder = nextPlaceholder('FIG');
      const label = caption || alt || src;
      return {
        placeholder: `${placeholder} [Figure: ${label}]`,
        metadata: JSON.stringify({ type: 'figure-image', html: match }),
      };
    },
    restoreFromDoc(metadata: string) {
      const parsed = JSON.parse(metadata) as { html: string };
      return parsed.html;
    },
  },
  {
    name: 'colour-mark',
    detect: /<mark\s+style="color:[^"]*">[^<]*<\/mark>/gi,
    extractForDoc(match: string) {
      const textMatch = match.match(/>([^<]*)</);
      const text = textMatch ? textMatch[1] : '';
      const placeholder = nextPlaceholder('MARK');
      return {
        placeholder: `${placeholder}${text}`,
        metadata: JSON.stringify({ type: 'colour-mark', html: match }),
      };
    },
    restoreFromDoc(metadata: string) {
      const parsed = JSON.parse(metadata) as { html: string };
      return parsed.html;
    },
  },
];

export { resetCounter };
