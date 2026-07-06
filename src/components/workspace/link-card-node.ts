import { Node, mergeAttributes } from "@tiptap/core";

// A block "link card" node — atomic, non-editable, stores OG metadata as attrs.
// Renders as a styled card. Round-trips via data-* attributes.
export const LinkCard = Node.create({
  name: "linkCard",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      href: { default: "" },
      title: { default: "" },
      description: { default: "" },
      image: { default: "" },
      siteName: { default: "" },
      domain: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="link-card"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = HTMLAttributes as Record<string, string>;
    const href = attrs.href || "#";
    return [
      "a",
      mergeAttributes({
        "data-type": "link-card",
        class: "ws-linkcard",
        href,
        target: "_blank",
        rel: "noopener noreferrer",
        "data-href": href,
        "data-title": attrs.title,
        "data-description": attrs.description,
        "data-image": attrs.image,
        "data-site-name": attrs.siteName,
        "data-domain": attrs.domain,
      }),
      ...(attrs.image
        ? [["span", { class: "ws-linkcard-img", style: `background-image:url('${attrs.image}')` }] as any]
        : []),
      [
        "span",
        { class: "ws-linkcard-body" },
        ["span", { class: "ws-linkcard-domain" }, attrs.domain || ""],
        ["span", { class: "ws-linkcard-title" }, attrs.title || attrs.href],
        ...(attrs.description
          ? [["span", { class: "ws-linkcard-desc" }, attrs.description] as any]
          : []),
      ],
    ];
  },
});
