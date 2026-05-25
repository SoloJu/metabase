import { Text } from "metabase/ui";

type JsxTokenType = "punctuation" | "tag" | "attribute" | "value" | "plain";

interface JsxToken {
  type: JsxTokenType;
  value: string;
}

/**
 * A deliberately simple JSX tokenizer — enough to tell apart `<>/=`, the
 * component name, prop names and prop values. It is not a real parser; it only
 * understands opening/self-closing tags like `<Chip variant="light" />`.
 */
export function tokenizeJsx(code: string): JsxToken[] {
  const pattern =
    /("[^"]*"|'[^']*'|\{[^}]*\})|([<>/=])|([A-Za-z_][\w-]*)|(\s+)|([^\s])/g;
  const tokens: JsxToken[] = [];
  let expectTagName = false;

  for (const match of code.matchAll(pattern)) {
    const [value, string, punctuation, identifier] = match;

    if (string != null) {
      tokens.push({ type: "value", value });
    } else if (punctuation != null) {
      tokens.push({ type: "punctuation", value });
      // The identifier right after `<` is the component name.
      expectTagName = punctuation === "<";
    } else if (identifier != null) {
      tokens.push({ type: expectTagName ? "tag" : "attribute", value });
      expectTagName = false;
    } else {
      // Whitespace or any stray character — keep it verbatim.
      tokens.push({ type: "plain", value });
    }
  }

  return tokens;
}

// Reuses the app's code-highlighting palette so colors stay consistent and
// theme-aware (see metabase/ui/syntax/highlight.module.css).
const TOKEN_COLOR: Record<JsxTokenType, string> = {
  punctuation: "var(--mb-color-text-tertiary)",
  tag: "var(--mb-color-text-primary)",
  attribute: "var(--mb-color-saturated-blue)",
  value: "var(--mb-color-saturated-green)",
  plain: "var(--mb-color-text-primary)",
};

interface StoryJsxProps {
  children: string;
}

/** Monospace JSX with light syntax highlighting (tags, props, values). */
export function StoryJsx({ children }: StoryJsxProps) {
  return (
    <Text ff="monospace" size="sm" fw={500}>
      {tokenizeJsx(children).map((token, index) => (
        <span
          key={`${index}-${token.value}`}
          style={{ color: TOKEN_COLOR[token.type] }}
        >
          {token.value}
        </span>
      ))}
    </Text>
  );
}
