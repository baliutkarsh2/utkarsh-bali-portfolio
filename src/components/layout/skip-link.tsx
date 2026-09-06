/**
 * First focusable element in the DOM. Invisible until it receives keyboard
 * focus (`.skip-link` in chrome.css clips it unless `:focus-visible`), then a
 * solid `--ink` block top-left above every other layer, including the header
 * and any open dialog. `main` carries `tabIndex={-1}` so the jump lands focus.
 */
export function SkipLink() {
  return (
    <a href="#main" className="skip-link text-small font-medium">
      Skip to content
    </a>
  );
}
