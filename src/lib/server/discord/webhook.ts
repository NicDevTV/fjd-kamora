import "server-only";
import { IS_COMPONENTS_V2, type DiscordComponent } from "./components";

// One webhook per Discord channel. Each deployment environment has its own URL in its own
// environment variable value (Vercel: production and preview are separate values; locally:
// .env.local), so previews never post into the production channel. A channel without a URL is
// silently skipped, which keeps local development quiet.
export const CHANNELS = {
  amtsblatt: "FJD_WEBHOOK_AMTSBLATT",
} as const;

export type Channel = keyof typeof CHANNELS;

const WEBHOOK_PATTERN = /^https:\/\/(?:discord(?:app)?\.com)\/api\/webhooks\/\d{15,25}\/[\w-]{20,120}$/;

export function webhookUrl(channel: Channel): string | null {
  const value = process.env[CHANNELS[channel]]?.trim();
  if (!value) return null;
  if (!WEBHOOK_PATTERN.test(value)) {
    console.error(`[discord] ${CHANNELS[channel]} is not a Discord webhook URL; message skipped.`);
    return null;
  }
  return value;
}

export type WebhookFile = { name: string; data: Uint8Array; type: string };

export type WebhookResult = { ok: true } | { ok: false; reason: string };

// Sends one Components V2 message. Never throws and never logs the URL: a failing Discord must not
// break the action that triggered the message.
export async function sendWebhook(
  channel: Channel,
  components: DiscordComponent[],
  files: WebhookFile[] = [],
): Promise<WebhookResult> {
  const base = webhookUrl(channel);
  if (!base) return { ok: false, reason: "not-configured" };

  const url = new URL(base);
  url.searchParams.set("with_components", "true");
  url.searchParams.set("wait", "true");

  const payload = {
    flags: IS_COMPONENTS_V2,
    components,
    // Whatever ends up in the text, nobody gets pinged.
    allowed_mentions: { parse: [] as string[] },
    attachments: files.map((file, index) => ({ id: index, filename: file.name })),
  };

  try {
    let response: Response;
    if (files.length === 0) {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });
    } else {
      const form = new FormData();
      form.set("payload_json", JSON.stringify(payload));
      files.forEach((file, index) => {
        form.set(`files[${index}]`, new Blob([new Uint8Array(file.data)], { type: file.type }), file.name);
      });
      response = await fetch(url, { method: "POST", body: form, signal: AbortSignal.timeout(15000) });
    }

    if (response.ok) return { ok: true };
    // Rate limit and bad request bodies are worth knowing about; the answer itself carries no secret.
    console.error(`[discord] webhook "${channel}" answered ${response.status}: ${(await response.text()).slice(0, 300)}`);
    return { ok: false, reason: `status-${response.status}` };
  } catch (error) {
    console.error(`[discord] webhook "${channel}" failed:`, error instanceof Error ? error.name : "unknown");
    return { ok: false, reason: "network" };
  }
}
