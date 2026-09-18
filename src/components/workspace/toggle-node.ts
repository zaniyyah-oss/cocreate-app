import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    toggleBlock: {
      insertToggle: () => ReturnType;
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
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { open: true },
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Toggle" }] },
              { type: "paragraph" },
            ],
          }),
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