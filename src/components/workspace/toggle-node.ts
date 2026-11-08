import { Node, mergeAttributes } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    toggleBlock: {
      insertToggle: () => ReturnType;
      turnIntoToggle: () => ReturnType;
    };
  }
}

/**
 * A Notion-style disclosure block. The first child is always visible and acts
 * as the editable summary; every following block is the collapsible body.
 */
export const ToggleBlock = Node.create({
  name: "toggleBlock",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (element) => element.getAttribute("data-open") !== "false",
        renderHTML: (attributes) => ({ "data-open": attributes.open ? "true" : "false" }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-toggle-block]", contentElement: ".ws-toggle-content" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-toggle-block": "", class: "ws-toggle" }),
      [
        "button",
        {
          type: "button",
          class: "ws-toggle-trigger",
          contenteditable: "false",
          tabindex: "-1",
          "aria-label": "Open or close toggle",
        },
        ["span", { class: "ws-toggle-chevron" }, "›"],
      ],
      ["div", { class: "ws-toggle-content" }, 0],
    ];
  },

  addCommands() {
    return {
      insertToggle:
        () =>
        ({ state, dispatch }) => {
          const paragraph = state.schema.nodes.paragraph;
          if (!paragraph) return false;
          const summary = paragraph.create(null, state.schema.text("Toggle"));
          const body = paragraph.create();
          const toggle = this.type.create({ open: true }, [summary, body]);
          const tr = state.tr.replaceSelectionWith(toggle, false);
          const toggleStart = tr.selection.from - toggle.nodeSize;
          const summaryStart = toggleStart + 2;
          tr.setSelection(TextSelection.create(tr.doc, summaryStart, summaryStart + 6));
          if (dispatch) dispatch(tr.scrollIntoView());
          return true;
        },
      // Turn the current bullet (even an indented one) into a toggle. The
      // bullet's text becomes the toggle's title and anything nested under
      // it becomes the toggle's hidden body. Keeps the visual indent.
      turnIntoToggle:
        () =>
        ({ editor, commands }) => {
          if (!editor.isActive("listItem")) return commands.insertToggle();
          let depth = 0;
          let wrapperIndent = 0;
          const $f = editor.state.selection.$from;
          for (let d = $f.depth; d > 0; d--) {
            const n = $f.node(d);
            if (n.type.name === "listItem") depth++;
            if (["bulletList", "orderedList"].includes(n.type.name)) wrapperIndent = Number(n.attrs.indent) || 0;
          }
          let guard = 0;
          while (editor.isActive("listItem") && guard++ < 12) {
            if (!editor.chain().liftListItem("listItem").run()) break;
          }
          if (editor.isActive("listItem")) return false;
          const state = editor.state;
          const $p = state.selection.$from;
          let d = $p.depth;
          while (d > 0 && $p.node(d).type.name !== "paragraph") d--;
          if (d <= 0) return false;
          const start = $p.before(d);
          let end = $p.after(d);
          const parent = $p.node(d - 1);
          const idx = $p.index(d - 1);
          const blocks = [$p.node(d).type.create({ ...$p.node(d).attrs, indent: 0 }, $p.node(d).content)];
          const next = idx + 1 < parent.childCount ? parent.child(idx + 1) : null;
          if (next && ["bulletList", "orderedList"].includes(next.type.name)) {
            blocks.push(next);
            end += next.nodeSize;
          } else {
            blocks.push(state.schema.nodes.paragraph.create());
          }
          const indent = Math.min(6, wrapperIndent + depth - 1);
          const toggle = this.type.create({ open: true, indent }, blocks);
          const tr = state.tr.replaceWith(start, end, toggle);
          const caret = start + 2 + blocks[0].content.size;
          tr.setSelection(TextSelection.create(tr.doc, caret));
          editor.view.dispatch(tr.scrollIntoView());
          return true;
        },
    };
  },

  addNodeView() {
    return ({ editor, node, getPos }) => {
      const dom = document.createElement("div");
      dom.className = "ws-toggle";
      dom.dataset.toggleBlock = "";

      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "ws-toggle-trigger";
      trigger.contentEditable = "false";
      trigger.tabIndex = -1;
      trigger.setAttribute("aria-label", "Open or close toggle");

      const chevron = document.createElement("span");
      chevron.className = "ws-toggle-chevron";
      chevron.textContent = "›";
      trigger.appendChild(chevron);

      const contentDOM = document.createElement("div");
      contentDOM.className = "ws-toggle-content";
      dom.append(trigger, contentDOM);

      let open = Boolean(node.attrs.open);
      const paint = () => {
        dom.dataset.open = open ? "true" : "false";
        const lvl = Number(node.attrs.indent) || 0;
        dom.style.marginLeft = lvl ? `${lvl * 24}px` : "";
        trigger.setAttribute("aria-expanded", String(open));
        trigger.title = open ? "Close toggle" : "Open toggle";
      };
      paint();

      trigger.addEventListener("mousedown", (event) => event.preventDefault());
      trigger.addEventListener("click", () => {
        open = !open;
        paint();
        if (!editor.isEditable) return;
        const pos = getPos();
        if (typeof pos !== "number") return;
        const current = editor.state.doc.nodeAt(pos);
        if (!current) return;
        editor.view.dispatch(
          editor.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, open }),
        );
      });

      return {
        dom,
        contentDOM,
        update(updatedNode) {
          if (updatedNode.type.name !== "toggleBlock") return false;
          open = Boolean(updatedNode.attrs.open);
          node = updatedNode;
          paint();
          return true;
        },
        stopEvent(event) {
          return trigger.contains(event.target as globalThis.Node);
        },
      };
    };
  },
});