/**
 * Whether a key is going into something being typed in, and so is no shortcut: a text field, a text area, a list, or
 * anything editable. A range input is not one: the keys keep working while a slider has the focus (it takes only the
 * arrows, which the camera leaves to it).
 */
export const isTyping = (e: KeyboardEvent): boolean =>
  (e.target as Element | null)?.matches?.('input:not([type=range]), textarea, select, [contenteditable]') ?? false;
