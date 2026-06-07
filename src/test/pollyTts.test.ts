import { describe, expect, it } from "vitest";
import { buildBubblySsml, normalizeTtsText, preparePollyText } from "../../lib/pollyTts";

describe("polly TTS text prep", () => {
  it("removes emoji-like characters and invisible symbols before synthesis", () => {
    const cleaned = normalizeTtsText("Helo 😅\u200D tum theek ho kar! https://example.com");

    expect(cleaned).toContain("Helo");
    expect(cleaned).not.toContain("😅");
    expect(cleaned).not.toContain("\u200D");
    expect(cleaned).not.toContain("https://example.com");
  });

  it("applies Hinglish phonetic stretching for the bubbly voice", () => {
    const prepared = preparePollyText("Helo hi achhe theek ho kar bolo");

    expect(prepared).toContain("helow");
    expect(prepared).toContain("heyy");
    expect(prepared).toContain("ach-chey");
    expect(prepared).toContain("theeyk");
    expect(prepared).toContain("hooo");
    expect(prepared).toContain("karr");
  });

  it("builds the airy-cute SSML wrapper with softened effect and breath tags", () => {
    const ssml = buildBubblySsml("hey & you");

    expect(ssml).toContain('pitch="+35%"');
    expect(ssml).toContain('rate="0.88"');
    expect(ssml).toContain('volume="-6dB"');
    expect(ssml).toContain('name="softened"');
    expect(ssml).toContain('amazon:breath duration="short" volume="soft"');
    expect(ssml).toContain("hey &amp; you");
  });
});