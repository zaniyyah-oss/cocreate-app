import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    indent: {
      indent: () => ReturnType;
      outdent: () => ReturnType;
    };
  }
}

const MAX = 6;
const STEP = 24; // px per indent level

export const Indent = Extension.create({
  name: "indent",

  addOptions() {
    return { types: ["paragraph", "heading", "blockquote", "callout", "bulletList", "orderedList", "toggleBlock"] as string[] };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (el) => {
              const lvl = parseInt(el.getAttribute("data-indent") ?? "0", 10);
              return Number.isFinite(lvl) ? Math.max(0, Math.min(MAX, lvl)) : 0;
            },
            renderHTML: (attrs) => {
              const lvl = Number(attrs.indent) || 0;
              if (!lvl) return {};
              return {
                "data-indent": String(lvl),
                style: `padding-left:${lvl * STEP}px;`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    const types = () => this.options.types as string[];
    const setIndentFor = (delta: number) => () => ({ state, tr, dispatch }: any) => {
      const { from, to } = state.selection;
      // Prefer indenting the outermost matching wrapper (callout / blockquote)
      // when the selection sits inside one, so Tab moves the whole block
      // rather than double-indenting both wrapper and inner paragraph.
      const wrapperTypes = ["callout", "blockquote", "toggleBlock"];
      const $from = state.selection.$from;
      let wrapperPos: number | null = null;
      let wrapperNode: any = null;
      for (let d = $from.depth; d > 0; d--) {
        const node = $from.node(d);
        if (wrapperTypes.includes(node.type.name) && types().includes(node.type.name)) {
          wrapperPos = $from.before(d);
          wrapperNode = node;
          break;
        }
      }
      let changed = false;
      if (wrapperNode && wrapperPos !== null) {
        const cur = Number(wrapperNode.attrs.indent) || 0;
        const next = Math.max(0, Math.min(MAX, cur + delta));
        if (next !== cur) {
          tr.setNodeMarkup(wrapperPos, undefined, { ...wrapperNode.attrs, indent: next });
          changed = true;
        }
      } else {
        state.doc.nodesBetween(from, to, (node: any, pos: number) => {
          if (!types().includes(node.type.name)) return;
          if (wrapperTypes.includes(node.type.name)) return;
          const cur = Number(node.attrs.indent) || 0;
          const next = Math.max(0, Math.min(MAX, cur + delta));
          if (next !== cur) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
            changed = true;
          }
        });
      }
      if (changed && dispatch) dispatch(tr);
      return changed;
    };

    return {
      indent: () => setIndentFor(+1)(),
      outdent: () => setIndentFor(-1)(),
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => { indentSmart(this.editor); return true; },
      "Shift-Tab": () => { outdentSmart(this.editor); return true; },
    };
  },

});

function listInfo(editor: any) {
  const $f = editor.state.selection.$from;
  let items = 0;
  let wrapperPos: number | null = null;
  let wrapper: any = null;
  for (let d = $f.depth; d > 0; d--) {
    const n = $f.node(d);
    if (n.type.name === "listItem" || n.type.name === "taskItem") items++;
    if (["bulletList", "orderedList", "taskList"].includes(n.type.name)) { wrapperPos = $f.before(d); wrapper = n; }
  }
  return { items, wrapperPos, wrapper };
}

/** Indent: nest a bullet under the one above; only the first bullet of a
 * list shifts the whole list. Never touches other blocks' indent. */
export function indentSmart(editor: any) {
  const itemType = editor.isActive("taskItem") ? "taskItem" : editor.isActive("listItem") ? "listItem" : null;
  if (!itemType) return editor.chain().focus().indent().run();
  if (editor.chain().focus().sinkListItem(itemType).run()) return true;
  const { items, wrapperPos, wrapper } = listInfo(editor);
  if (items !== 1 || wrapperPos === null || wrapper.attrs.indent === undefined) return false;
  const cur = Number(wrapper.attrs.indent) || 0;
  if (cur >= MAX) return false;
  editor.view.dispatch(editor.state.tr.setNodeMarkup(wrapperPos, undefined, { ...wrapper.attrs, indent: cur + 1 }));
  return true;
}

/** Outdent: un-nest a bullet; a top-level bullet only moves its list left
 * and never stops being a bullet. */
export function outdentSmart(editor: any) {
  const itemType = editor.isActive("taskItem") ? "taskItem" : editor.isActive("listItem") ? "listItem" : null;
  if (!itemType) return editor.chain().focus().outdent().run();
  const { items, wrapperPos, wrapper } = listInfo(editor);
  if (items > 1) return editor.chain().focus().liftListItem(itemType).run();
  const cur = Number(wrapper?.attrs.indent) || 0;
  if (wrapperPos === null || cur <= 0) return false;
  editor.view.dispatch(editor.state.tr.setNodeMarkup(wrapperPos, undefined, { ...wrapper.attrs, indent: cur - 1 }));
  return true;
}
