import type { SummaryEntry } from '../api/client';

interface Props {
  entries: SummaryEntry[];
  selected: Set<string>;
  onToggle: (path: string) => void;
}

function TreeNode({ entry, selected, onToggle }: { entry: SummaryEntry; selected: Set<string>; onToggle: (path: string) => void }) {
  const isSelected = selected.has(entry.path);

  return (
    <li className="tree-node">
      <label className="tree-label">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(entry.path)}
        />
        <span className="tree-title">{entry.title}</span>
        <span className="tree-path">{entry.path}</span>
      </label>
      {entry.children.length > 0 && (
        <ul className="tree-children">
          {entry.children.map((child) => (
            <TreeNode key={child.path} entry={child} selected={selected} onToggle={onToggle} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function SummaryTree({ entries, selected, onToggle }: Props) {
  return (
    <ul className="summary-tree">
      {entries.map((entry) => (
        <TreeNode key={entry.path} entry={entry} selected={selected} onToggle={onToggle} />
      ))}
    </ul>
  );
}
