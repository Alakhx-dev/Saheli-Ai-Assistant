import { describe, expect, it } from "vitest";
import { buildBubblySsml, preparePollyText } from "../../lib/pollyTts";
import { splitFastText } from "../utils/speechEngine";

describe("polly-only TTS helpers", () => {
  it("splits first sentence for fast Polly start", () => {
    expect(splitFastText("Sun na yaar. Thoda ruk ja please.")).toEqual({
      firstSentence: "Sun na yaar.",
      remainingText: "Thoda ruk ja please.",
    });
  });

  it("returns entire text as first sentence when punctuation is missing", () => {
    expect(splitFastText("sun na yaar thoda ruk ja please")).toEqual({
      firstSentence: "sun na yaar thoda ruk ja please",
      remainingText: "",
    });
  });

  it("applies the close-mic phonetic tuning for Polly", () => {
    const prepared = preparePollyText("Helo hi achhe theek ho kar bolo kya");

    expect(prepared).toContain("helow");
    expect(prepared).toContain("heyy");
    expect(prepared).toContain("ach-chey");
    expect(prepared).toContain("theeyk hai");
    expect(prepared).toContain("hooo");
    expect(prepared).toContain("karr");
    expect(prepared).toContain("kyaa");
  });

  it("builds the intimate SSML envelope with breath tags", () => {
    const ssml = buildBubblySsml("hey & you");

    expect(ssml).toContain('pitch="+35%"');
    expect(ssml).toContain('rate="0.88"');
    expect(ssml).toContain('volume="-6dB"');
    expect(ssml).toContain('amazon:effect name="softened"');
    expect(ssml).toContain('amazon:breath duration="short" volume="soft"');
    expect(ssml).toContain("hey &amp; you");
  });
});