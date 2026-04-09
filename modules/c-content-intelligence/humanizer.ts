import Anthropic from "@anthropic-ai/sdk";

export type Tone = "professional" | "conversational" | "educational";

const SYSTEM_PROMPT = `You are a professional content editor. Your job is to rewrite the provided text so it reads as naturally human-written content. Follow these rules strictly:

1. **Voice & rhythm**: Vary sentence length — mix short punchy sentences with longer flowing ones. Use contractions where natural. Write in active voice.
2. **Eliminate AI patterns**: Remove or rephrase these telltale patterns:
   - Lists of exactly three items (break into 2, 4, or inline them)
   - Words/phrases: "delve", "furthermore", "it's worth noting", "in today's landscape", "navigating", "leverage", "cutting-edge", "game-changer", "revolutionize", "robust", "seamless", "harness", "at the end of the day", "in conclusion"
   - Overly parallel sentence structures
   - Formulaic intro → body → conclusion arcs
3. **Keyword placement**: The primary keyword must appear naturally in the first paragraph. Do not force it — weave it into an existing sentence or add a sentence that flows.
4. **Factual integrity**: Do not change any factual claims, statistics, quotes, or proper nouns. You are editing for voice, not for content.
5. **No meta-commentary**: Do not mention that you rewrote the text. Do not add disclaimers. Return only the rewritten content.

Return ONLY the rewritten text, nothing else.`;

function buildUserPrompt(rawText: string, tone: Tone): string {
  const toneGuidance: Record<Tone, string> = {
    professional:
      "Use a confident, authoritative tone suitable for B2B audiences. Keep it polished but not stiff.",
    conversational:
      "Write like you're explaining this to a smart friend over coffee. Relaxed but not sloppy.",
    educational:
      "Write clearly for someone learning this topic. Define jargon on first use. Be encouraging without being patronizing.",
  };

  return `Tone: ${tone}
Guidance: ${toneGuidance[tone]}

---

${rawText}`;
}

export async function humanizeContent(
  rawText: string,
  tone: Tone
): Promise<string> {
  const client = new Anthropic();

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildUserPrompt(rawText, tone),
      },
    ],
  });

  const block = message.content[0];
  if (block.type !== "text") {
    throw new Error("Unexpected response type from Claude API");
  }

  return block.text;
}
