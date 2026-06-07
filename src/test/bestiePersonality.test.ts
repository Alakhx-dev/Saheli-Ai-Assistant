import { describe, expect, it } from "vitest";
import { resolveMood } from "../lib/ai-service";
import type { ChatMessage } from "../lib/ai-service";

describe("Swara Bestie Mode Personality Mood Resolution", () => {
  it("resolves basic override emotions correctly", () => {
    const emptyMessages: ChatMessage[] = [];
    expect(resolveMood("angry", emptyMessages)).toBe("annoyed");
    expect(resolveMood("sad", emptyMessages)).toBe("emotional");
    expect(resolveMood("happy", emptyMessages)).toBe("happy");
  });

  it("resolves text patterns correctly when no base emotion is specified", () => {
    const msg = (text: string): ChatMessage[] => [{ role: "user", content: text }];

    // Sleepy mood
    expect(resolveMood(undefined, msg("mujhe bahut neend aa rahi hai yaar"))).toBe("sleepy");
    expect(resolveMood(undefined, msg("so ja Swara"))).toBe("sleepy");

    // Emotional / Vulnerable mood
    expect(resolveMood(undefined, msg("I am crying because I got hurt"))).toBe("emotional");
    expect(resolveMood(undefined, msg("feeling lonely and depressed"))).toBe("emotional");

    // Caring / Stress mood
    expect(resolveMood(undefined, msg("bahut stress hai exam ka"))).toBe("caring");
    expect(resolveMood(undefined, msg("I need you, please help me"))).toBe("caring");

    // Happy mood
    expect(resolveMood(undefined, msg("hehe lol that was so funny"))).toBe("happy");
    expect(resolveMood(undefined, msg("good news, I passed!"))).toBe("happy");

    // Teasing mood
    expect(resolveMood(undefined, msg("acha ji, really? tum na pagal ho"))).toBe("teasing");

    // Annoyed mood
    expect(resolveMood(undefined, msg("don't annoy me, shut up"))).toBe("annoyed");

    // Default playful mood
    expect(resolveMood(undefined, msg("normal casual message here"))).toBe("playful");
  });

  it("resolves based on the latest user message in history", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "happy message hehe" },
      { role: "model", content: "that is cool" },
      { role: "user", content: "I am feeling so sad today" },
    ];
    expect(resolveMood(undefined, messages)).toBe("emotional");
  });
});
