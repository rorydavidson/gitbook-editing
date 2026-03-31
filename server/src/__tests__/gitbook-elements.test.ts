import { describe, it, expect, beforeEach } from 'vitest';
import { gitbookElements, resetCounter } from '@gitbook-editing/shared';

beforeEach(() => resetCounter());

describe('gitbook-elements', () => {
  it('detects card tables', () => {
    const html = '<table data-view="cards"><thead><tr><th></th></tr></thead><tbody><tr><td>test</td></tr></tbody></table>';
    const element = gitbookElements.find((e) => e.name === 'card-table')!;
    const matches = html.match(element.detect);
    expect(matches).toHaveLength(1);
  });

  it('round-trips card table through extract/restore', () => {
    const html = '<table data-view="cards"><thead><tr><th></th></tr></thead></table>';
    const element = gitbookElements.find((e) => e.name === 'card-table')!;
    const { metadata } = element.extractForDoc(html);
    const restored = element.restoreFromDoc(metadata);
    expect(restored).toBe(html);
  });

  it('detects colour marks', () => {
    const html = '<mark style="color:blue;">|concept|</mark>';
    const element = gitbookElements.find((e) => e.name === 'colour-mark')!;
    const matches = html.match(element.detect);
    expect(matches).toHaveLength(1);
  });

  it('round-trips colour mark', () => {
    const html = '<mark style="color:blue;">|concept|</mark>';
    const element = gitbookElements.find((e) => e.name === 'colour-mark')!;
    const { metadata } = element.extractForDoc(html);
    const restored = element.restoreFromDoc(metadata);
    expect(restored).toBe(html);
  });

  it('detects button links', () => {
    const html = '<a href="https://example.com" class="button primary">Click me</a>';
    const element = gitbookElements.find((e) => e.name === 'button-link')!;
    const matches = html.match(element.detect);
    expect(matches).toHaveLength(1);
  });

  it('detects liquid includes', () => {
    const raw = '{% include "https://app.gitbook.com/s/123/~/reusable/abc/" %}';
    const element = gitbookElements.find((e) => e.name === 'liquid-include')!;
    const matches = raw.match(element.detect);
    expect(matches).toHaveLength(1);
  });

  it('detects figure images', () => {
    const html = '<figure><img src="../images/test.png" alt=""><figcaption></figcaption></figure>';
    const element = gitbookElements.find((e) => e.name === 'figure-image')!;
    const matches = html.match(element.detect);
    expect(matches).toHaveLength(1);
  });

  it('round-trips figure image', () => {
    const html = '<figure><img src="../images/test.png" alt="test"><figcaption>Caption</figcaption></figure>';
    const element = gitbookElements.find((e) => e.name === 'figure-image')!;
    const { metadata } = element.extractForDoc(html);
    const restored = element.restoreFromDoc(metadata);
    expect(restored).toBe(html);
  });
});
