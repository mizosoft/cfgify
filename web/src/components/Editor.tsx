import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { EditorSelection, EditorState, StateEffect, StateField } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  highlightActiveLine,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { StreamLanguage, bracketMatching, indentOnInput } from '@codemirror/language';
import { go } from '@codemirror/legacy-modes/mode/go';
import { oneDark } from '@codemirror/theme-one-dark';

const goLang = StreamLanguage.define(go);

// CodeMirror state effect + field that paints a range as full-width line
// highlights. Mark decorations would start mid-line at the first node's
// column (after indentation) while subsequent lines included it, producing
// a visually ragged left edge. Line decorations give every line in the
// range the same full-width background.
const setHighlightRange = StateEffect.define<{ from: number; to: number } | null>();

const lineHighlight = Decoration.line({ class: 'cm-cfg-line-highlight' });

const highlightField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    let next = deco.map(tr.changes);
    for (const eff of tr.effects) {
      if (eff.is(setHighlightRange)) {
        if (eff.value === null) {
          next = Decoration.none;
          continue;
        }
        const { from, to } = clampRange(eff.value, tr.state.doc.length);
        if (from >= to) {
          next = Decoration.none;
          continue;
        }
        const startLine = tr.state.doc.lineAt(from).number;
        const endLine = tr.state.doc.lineAt(to).number;
        const decos = [];
        for (let n = startLine; n <= endLine; n++) {
          decos.push(lineHighlight.range(tr.state.doc.line(n).from));
        }
        next = Decoration.set(decos);
      }
    }
    return next;
  },
  provide: (f) => EditorView.decorations.from(f),
});

function clampRange(r: { from: number; to: number }, docLength: number) {
  return {
    from: Math.max(0, Math.min(r.from, docLength)),
    to: Math.max(0, Math.min(r.to, docLength)),
  };
}

export type EditorHandle = {
  scrollTo: (from: number, to: number) => void;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onCursorChange?: (offset: number) => void;
  highlight?: { from: number; to: number } | null;
};

const Editor = forwardRef<EditorHandle, Props>(function Editor(
  { value, onChange, onCursorChange, highlight },
  ref,
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onCursorChangeRef = useRef(onCursorChange);
  onChangeRef.current = onChange;
  onCursorChangeRef.current = onCursorChange;

  useImperativeHandle(
    ref,
    () => ({
      scrollTo: (from, to) => {
        const view = viewRef.current;
        if (!view) return;
        const docLen = view.state.doc.length;
        const f = Math.max(0, Math.min(from, docLen));
        const t = Math.max(0, Math.min(to, docLen));
        view.dispatch({
          effects: EditorView.scrollIntoView(EditorSelection.range(f, t), {
            y: 'center',
          }),
        });
      },
    }),
    [],
  );

  useEffect(() => {
    if (!hostRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        bracketMatching(),
        indentOnInput(),
        goLang,
        oneDark,
        highlightField,
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) {
            onChangeRef.current(u.state.doc.toString());
          }
          if (u.selectionSet || u.docChanged) {
            const offset = u.state.selection.main.head;
            onCursorChangeRef.current?.(offset);
          }
        }),
        EditorView.theme({
          '&': { height: '100%', fontSize: '13px' },
          '.cm-scroller': { fontFamily: 'var(--code)' },
        }),
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value updates (loading a different sample) into the editor.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (view.state.doc.toString() === value) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
    });
  }, [value]);

  // Sync the highlight range.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: setHighlightRange.of(highlight ?? null) });
  }, [highlight]);

  return <div className="editor" ref={hostRef} />;
});

export default Editor;