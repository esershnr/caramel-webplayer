/** Local name of the closest ancestor that is a custom element not defined yet. */
export function undefinedAncestorTag(element: Element): string | null {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const tag = node.localName;
    if (tag.includes('-') && !customElements.get(tag)) return tag;
  }
  return null;
}
