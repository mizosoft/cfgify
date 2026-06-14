import type { Func } from '../types';

type Props = {
  functions: Func[];
  active: number;
  onSelect: (index: number) => void;
};

export default function FunctionTabs({ functions, active, onSelect }: Props) {
  if (functions.length === 0) return null;
  return (
    <div className="tabs">
      {functions.map((fn, i) => (
        <button
          key={`${fn.name}-${i}`}
          className={`tab ${i === active ? 'active' : ''}`}
          onClick={() => onSelect(i)}
          title={`${fn.blocks.length} block${fn.blocks.length === 1 ? '' : 's'}`}
        >
          {fn.name}
        </button>
      ))}
    </div>
  );
}