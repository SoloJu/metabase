import type { ReactNode } from "react";

import { Group, Paper, Stack, Text, type TextProps } from "metabase/ui";

interface StoryShowcaseProps {
  title: string;
  children: ReactNode;
}

/**
 * Outer frame for a component story: a bordered panel with a title. Themed via
 * the global Storybook `theme` toggle. Compose with `StorySection`, `StoryRow`
 * and `StoryCode` to lay out a component's variants and states.
 */
export function StoryShowcase({ title, children }: StoryShowcaseProps) {
  return (
    <Paper withBorder radius="sm" p="xl" w="fit-content">
      <Stack gap="xl">
        <Text fz="1.5rem" fw="bold" c="text-primary">
          {title}
        </Text>
        {children}
      </Stack>
    </Paper>
  );
}

interface StorySectionProps {
  title: string;
  /** Optional line under the title — e.g. a note about defaults. */
  description?: ReactNode;
  children: ReactNode;
}

/** A titled section with an optional description line. */
export function StorySection({
  title,
  description,
  children,
}: StorySectionProps) {
  return (
    <Stack gap="sm">
      <Text fw="bold" c="text-primary">
        {title}
      </Text>
      {description != null && (
        <Text size="sm" c="text-secondary">
          {description}
        </Text>
      )}
      {children}
    </Stack>
  );
}

interface StoryRowProps {
  label: ReactNode;
  /** Width of the label column, so rows line up. */
  labelWidth?: string | number;
  children: ReactNode;
}

/** A row with a fixed-width label on the left and content on the right. */
export function StoryRow({
  label,
  labelWidth = "9rem",
  children,
}: StoryRowProps) {
  return (
    <Group gap="md" wrap="nowrap">
      <Text size="sm" c="text-secondary" w={labelWidth}>
        {label}
      </Text>
      {children}
    </Group>
  );
}

interface StoryCodeProps {
  children: ReactNode;
  /** Color token, defaults to primary text. */
  c?: TextProps["c"];
}

/** Monospace, code-style text — e.g. a JSX usage snippet as a column header. */
export function StoryCode({ children, c = "text-primary" }: StoryCodeProps) {
  return (
    <Text ff="monospace" size="sm" c={c}>
      {children}
    </Text>
  );
}
