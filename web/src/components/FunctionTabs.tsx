import type { Func } from '../types';

type Props = {
  functions: Func[];
  active: number;
  showUnreachable: boolean;
  onSelect: (index: number) => void;
};

export default function FunctionTabs({ functions, active, showUnreachable, onSelect }: Props) {
  if (functions.length === 0) return null;
  return (
    <div className="tabs">
      {functions.map((fn, i) => {
        // Match the badge to the blocks actually rendered: when unreachable
        // blocks are hidden, count only the live ones.
        const count = showUnreachable ? fn.blocks.length : fn.blocks.filter((b) => b.live).length;
        return (
          <button
            key={`${fn.name}-${i}`}
            className={`tab ${i === active ? 'active' : ''}`}
            onClick={() => onSelect(i)}
            title={`${count} block${count === 1 ? '' : 's'}`}
          >
            {fn.name}
            <span className="count">{count}</span>
          </button>
        );
      })}
    </div>
  );
}