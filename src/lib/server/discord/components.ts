// Builders for Discord "Components V2" messages (display components such as containers, text and
// separators). A message that uses them carries the IS_COMPONENTS_V2 flag and may not contain
// `content` or `embeds`; everything is laid out with components.
// Reference: https://discord.com/developers/docs/components/reference

export const IS_COMPONENTS_V2 = 1 << 15;

export type DiscordComponent =
  | { type: 1; components: DiscordComponent[] }
  | { type: 2; style: 5; label: string; url: string }
  | { type: 9; components: DiscordComponent[]; accessory: DiscordComponent }
  | { type: 10; content: string }
  | { type: 11; media: { url: string }; description?: string }
  | { type: 12; items: { media: { url: string }; description?: string }[] }
  | { type: 13; file: { url: string } }
  | { type: 14; divider: boolean; spacing: 1 | 2 }
  | { type: 17; accent_color?: number; components: DiscordComponent[] };

export const text = (content: string): DiscordComponent => ({ type: 10, content });

export const separator = (spacing: 1 | 2 = 1, divider = true): DiscordComponent => ({ type: 14, divider, spacing });

// A text block with a small picture at its right edge.
export const section = (lines: string[], thumbnailUrl: string, description?: string): DiscordComponent => ({
  type: 9,
  components: lines.map(text),
  accessory: { type: 11, media: { url: thumbnailUrl }, description },
});

// A file that was uploaded together with the message (see sendWebhook).
export const attachedFile = (name: string): DiscordComponent => ({ type: 13, file: { url: `attachment://${name}` } });

// Webhooks that no application owns can only use link buttons.
export const linkButtons = (...buttons: { label: string; url: string }[]): DiscordComponent => ({
  type: 1,
  components: buttons.map((button) => ({ type: 2, style: 5, label: button.label, url: button.url })),
});

export const container = (accent: number | undefined, ...components: DiscordComponent[]): DiscordComponent => ({
  type: 17,
  accent_color: accent,
  components,
});

// Text that came from a form must not turn into formatting, links or pings in the channel.
export function plain(value: string) {
  return value
    .replace(/[\\*_~`|>#[\]()]/g, (char) => `\\${char}`)
    .replace(/@/g, "@\u200b")
    .replace(/\s+/g, " ")
    .trim();
}
