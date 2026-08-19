import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: { emoji?: string; tone?: string }) => ReturnType;
      toggleCallout: (attrs?: { emoji?: string; tone?: string }) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

/**
 * Notion-style callout: a block container with an emoji marker and a colored
 * background. Contains inline content (like a paragraph) so users can freely
 * type and format inside.
 */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      emoji: { default: "" },
      tone: { default: "amber" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = mergeAttributes(HTMLAttributes, {
      "data-callout": "",
      "data-tone": node.attrs.tone ?? "amber",
      class: "ws-callout",
    });
    const emoji = node.attrs.emoji;
    const body = ["div", { class: "ws-callout-body" }, 0];
    if (!emoji) return ["div", attrs, body];
    return [
      "div",
      attrs,
      ["span", { class: "ws-callout-emoji", contenteditable: "false" }, emoji],
      body,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attrs = {}) =>
        ({ commands }) =>
          commands.wrapIn(this.name, { emoji: "", tone: "amber", ...attrs }),
      toggleCallout:
        (attrs = {}) =>
        ({ commands, editor }) => {
          if (editor.isActive(this.name)) return commands.lift(this.name);
          return commands.wrapIn(this.name, { emoji: "", tone: "amber", ...attrs });
        },
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-c": () => this.editor.commands.toggleCallout(),
    };
  },
});
