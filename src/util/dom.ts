/** The page's own small DOM helpers. */

/** Text made safe to put into markup: the four characters that could end a tag or an attribute. */
export const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/**
 * The element `selector` finds under `root`, which markup the page wrote itself must have: one that is missing is a
 * mistake in that markup, and says which selector failed rather than failing later on a null.
 */
export function $<T extends Element = Element>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`missing ${selector}`);
  return el;
}
