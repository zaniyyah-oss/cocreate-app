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
    return { types: ["paragraph", "heading", "blockquote", "callout", "bulletList", "orderedList"] as string[] };
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
      const wrapperTypes = ["callout", "blockquote"];
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
      Tab: () => {
        const editor = this.editor;
        if (editor.isActive("listItem")) {
          return editor.chain().focus().sinkListItem("listItem").run();
        }
        return editor.chain().focus().indent().run();
      },
      "Shift-Tab": () => {
        const editor = this.editor;
        if (editor.isActive("listItem")) {
          return editor.chain().focus().liftListItem("listItem").run();
        }
        return editor.chain().focus().outdent().run();
      },
    };
  },
});
