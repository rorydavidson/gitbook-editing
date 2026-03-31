import { describe, it, expect } from 'vitest';
import { parseSummary, flattenSummary } from '../services/summary-parser.js';

const EXAMPLE_SUMMARY = `# Table of contents

* [SNOMED CT Starter Guide](README.md)
* [Introduction](<README (1).md>)
* [SNOMED CT Benefits](<2 snomed-ct-benefits/README.md>)
* [Using SNOMED CT](<3 using-snomed-ct-in-clinical-information/README.md>)
`;

describe('parseSummary', () => {
  it('parses standard links', () => {
    const entries = parseSummary(EXAMPLE_SUMMARY);
    expect(entries).toHaveLength(4);
    expect(entries[0]).toEqual({
      title: 'SNOMED CT Starter Guide',
      path: 'README.md',
      depth: 0,
      children: [],
    });
  });

  it('parses angle-bracket paths', () => {
    const entries = parseSummary(EXAMPLE_SUMMARY);
    expect(entries[1].path).toBe('README (1).md');
    expect(entries[2].path).toBe('2 snomed-ct-benefits/README.md');
  });

  it('handles nested entries', () => {
    const nested = `# TOC

* [Chapter 1](ch1.md)
  * [Section 1.1](ch1/s1.md)
  * [Section 1.2](ch1/s2.md)
* [Chapter 2](ch2.md)
`;
    const entries = parseSummary(nested);
    expect(entries).toHaveLength(2);
    expect(entries[0].children).toHaveLength(2);
    expect(entries[0].children[0].title).toBe('Section 1.1');
    expect(entries[0].children[0].depth).toBe(1);
  });

  it('flattenSummary returns all entries', () => {
    const nested = `* [A](a.md)\n  * [B](b.md)\n  * [C](c.md)`;
    const entries = parseSummary(nested);
    const flat = flattenSummary(entries);
    expect(flat).toHaveLength(3);
    expect(flat.map((e) => e.title)).toEqual(['A', 'B', 'C']);
  });
});
