export async function shouldSaveToMemory(fact: string): Promise<{ save: boolean; reason: string }> {
  const trimmedFact = fact.trim();
  if (!trimmedFact) {
    return { save: false, reason: "empty fact" };
  }

  const normalized = trimmedFact.toLowerCase();
  const personalSignals = [
    /\b(i am|i'm|my name is|name is|mera naam|mai hu|main hoon|mera naam hai)\b/,
    /\b(i like|i love|i hate|i work|i live|i'm from|from|born in|birthday)\b/,
    /\b(pasand|rehta hu|rehti hu|kaam|job|office|study|student|city|gaon|shehar|relationship|married|single)\b/,
    /\b(hobby|favorite|favourite|prefer|prefers|always|usually)\b/,
  ];

  const lowValueSignals = [
    /\b(hi|hello|hey|thanks|thank you|ok|okay|lol|haha|good morning|good night)\b/,
    /\b(camera|image|photo|picture|selfie|screenshot)\b/,
  ];

  if (lowValueSignals.some((pattern) => pattern.test(normalized))) {
    return { save: false, reason: "not a durable memory" };
  }

  if (personalSignals.some((pattern) => pattern.test(normalized))) {
    return { save: true, reason: "personal detail detected" };
  }

  return { save: false, reason: "not specific enough" };
}
