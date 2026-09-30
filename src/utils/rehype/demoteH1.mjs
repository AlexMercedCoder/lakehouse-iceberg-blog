// Rehype plugin: post layouts already render the title as the page's only
// <h1>, so any "# Heading" inside a Markdown body is demoted to <h2>.
export default function demoteH1() {
  const visit = node => {
    if (node.type === "element" && node.tagName === "h1") node.tagName = "h2";
    if (node.children) node.children.forEach(visit);
  };
  return tree => visit(tree);
}
