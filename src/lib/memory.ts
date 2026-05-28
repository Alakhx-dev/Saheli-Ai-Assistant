import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentReference,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import { shouldSaveToMemory } from "@/lib/shouldSaveToMemory";

const USERS_COLLECTION = "users";
const CHAT_HISTORY_COLLECTION = "chat_history";
const IMAGES_COLLECTION = "images";
const LOCAL_MEMORY_ENABLED_KEY = "memory_enabled_guest";

const MAX_IMAGE_HISTORY = 60;
const MAX_PREFERENCES = 20;
const MAX_FACTS = 20;
const MAX_MEMORY_WORDS = 8;

const GREETING_PATTERN =
  /^(hi|hello|hey|hii|heyy|yo|ok|okay|hmm|hmmm|thik|theek|fine|good|nice|thanks|thank you|sup|kya haal|kaise ho)$/i;
const STATUS_PATTERN =
  /\b(thik hu|theek hu|i am fine|i'm fine|all good|sab thik|bas thik|just fine|okay hu)\b/i;
const EXPLICIT_MEMORY_PATTERN =
  /\b(yaad\s*rakh(?:na)?|remember\s+(?:this|that)|remember|note\s+this|save\s+this|important)\b/i;
const FORGET_MEMORY_PATTERN =
  /\b(bhool\s*jao|mat\s+yaad\s*rakhna|forget\s+(?:this|that)|don't\s+remember\s+this|dont\s+remember\s+this)\b/i;
const PERSONAL_SIGNAL_PATTERN =
  /\b(i\s+am|i'm|my|i\s+like|i\s+love|i\s+prefer|i\s+want|i\s+usually|i\s+often|mera|mujhe|main|har\s+roz)\b/i;

export const STRICT_MEMORY_EXTRACTION_INSTRUCTION =
  "Extract facts ONLY if they are identity (name/age), preferences (likes/dislikes), habits, or explicit remember commands. Ignore greetings, small talk, and temporary status.";

export const CREATOR_NAME = "Alakh";

export type MemoryImageType = "upload" | "generated";
export type MemoryMessageRole = "user" | "assistant";
export type MemoryFieldKey = "preferences" | "facts";

export interface MemoryChatEntry {
  id: string;
  role: MemoryMessageRole;
  content: string;
  timestamp: string;
}

export interface MemoryImageEntry {
  id: string;
  type: MemoryImageType;
  url: string;
  prompt?: string;
  caption?: string;
  timestamp: string;
  storagePath?: string;
}

export interface MemoryProfile {
  preferences: string[];
  facts: string[];
  memoryEnabled: boolean;
  chat_history: MemoryChatEntry[];
  images: MemoryImageEntry[];
}

interface MemoryDocShape {
  preferences?: string[];
  facts?: string[];
  memoryEnabled?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeText(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/[<>{}\[\]]/g, "")
    .trim();
}

function normalizeText(value: string, min = 2, max = 280) {
  const cleaned = sanitizeText(value);
  if (!cleaned || cleaned.length < min || cleaned.length > max) {
    return undefined;
  }

  return cleaned;
}

function normalizeSemanticKey(value: string) {
  return sanitizeText(value)
    .toLowerCase()
    .replace(/^user\s+(prefers|dislikes|often|goal|is\s+from|works\s+as|studies\s+in|name\s+is):?\s*/i, "")
    .replace(/^remember:\s*/i, "")
    .replace(/\b(the|a|an|very|really|just|to|for|in|on|at|of|and)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toShortPhrase(input: string, maxWords = MAX_MEMORY_WORDS) {
  const cleaned = sanitizeText(input);
  const words = cleaned.split(/\s+/).filter(Boolean).slice(0, maxWords);
  if (!words.length) {
    return undefined;
  }
  return words.join(" ");
}

function hasAlphabet(text: string) {
  return /[a-zA-Z\u0900-\u097F]/u.test(text);
}

function wordCount(text: string) {
  return sanitizeText(text).split(/\s+/).filter(Boolean).length;
}

function isLowValueText(text: string) {
  const cleaned = sanitizeText(text).toLowerCase();
  if (!cleaned) {
    return true;
  }

  if (GREETING_PATTERN.test(cleaned) || STATUS_PATTERN.test(cleaned)) {
    return true;
  }

  return false;
}

function isAllowedMemoryShape(value: string) {
  return /^(Name|Age|Likes|Dislikes|Habit|Remember):/i.test(value.trim());
}

function passesMemoryValidation(value: string) {
  if (isLowValueText(value)) {
    return false;
  }

  if (!isAllowedMemoryShape(value)) {
    return false;
  }

  const count = wordCount(value);
  if (/^(Name|Age):/i.test(value.trim())) {
    return count >= 2;
  }

  return count >= 3;
}

function rememberSummary(content: string) {
  const short = toShortPhrase(content, MAX_MEMORY_WORDS);
  if (!short) {
    return undefined;
  }

  return `Remember: ${short}`;
}

function extractExplicitMemoryPayload(text: string) {
  if (!EXPLICIT_MEMORY_PATTERN.test(text)) {
    return undefined;
  }

  const cleaned = sanitizeText(text)
    .replace(EXPLICIT_MEMORY_PATTERN, " ")
    .replace(/^[:\-\s]+/, "")
    .trim();

  return cleaned;
}

function extractForgetTopic(text: string) {
  if (!FORGET_MEMORY_PATTERN.test(text)) {
    return undefined;
  }

  const cleaned = sanitizeText(text)
    .replace(FORGET_MEMORY_PATTERN, " ")
    .replace(/^[:\-\s]+/, "")
    .trim();

  return cleaned || "__all__";
}

function extractImplicitMemories(text: string) {
  const memories: Array<{ key: MemoryFieldKey; value: string }> = [];

  const nameMatch = text.match(/(?:my\s+name\s+is|mera\s+naam\s+hai|mera\s+naam)\s+([^.!?\n]{1,60})/i);
  if (nameMatch) {
    const name = toShortPhrase(nameMatch[1], 3);
    if (name) {
      memories.push({ key: "facts", value: `User name is ${name}` });
    }
  }

  const likesMatch = text.match(/(?:i\s+(?:like|love|prefer|enjoy))\s+([^.!?\n]{1,120})|(?:mujhe\s+([^.!?\n]{1,120})\s+pasand\s+hai)/i);
  if (likesMatch) {
    const pref = toShortPhrase(likesMatch[1] ?? likesMatch[2], MAX_MEMORY_WORDS);
    if (pref && !/^(you|tum)\b/i.test(pref)) {
      memories.push({ key: "preferences", value: `User prefers ${pref}` });
    }
  }

  const dislikesMatch = text.match(/(?:i\s+(?:don't\s+like|dislike|hate)|mujhe\s+pasand\s+nahi)\s+([^.!?\n]{1,120})/i);
  if (dislikesMatch) {
    const pref = toShortPhrase(dislikesMatch[1], MAX_MEMORY_WORDS);
    if (pref) {
      memories.push({ key: "preferences", value: `User dislikes ${pref}` });
    }
  }

  const habitMatch = text.match(/(?:i\s+(?:usually|often|always)|har\s+roz|daily|every\s+day)\s+([^.!?\n]{1,120})/i);
  if (habitMatch) {
    const habit = toShortPhrase(habitMatch[1], MAX_MEMORY_WORDS);
    if (habit) {
      memories.push({ key: "facts", value: `User often ${habit}` });
    }
  }

  const fromEnglish = text.match(/(?:i\s+am\s+from|my\s+home\s+is\s+in)\s+([^.!?\n]{1,120})/i);
  const fromHindi = text.match(/main\s+([^.!?\n]{1,120})\s+se\s+hu/i);
  const place = toShortPhrase(fromEnglish?.[1] ?? fromHindi?.[1] ?? "", MAX_MEMORY_WORDS);
  if (place) {
    memories.push({ key: "facts", value: `User is from ${place}` });
  }

  const roleMatch = text.match(/(?:i\s+work\s+as|main\s+ek)\s+([^.!?\n]{1,120})/i);
  if (roleMatch) {
    const role = toShortPhrase(roleMatch[1], MAX_MEMORY_WORDS);
    if (role) {
      memories.push({ key: "facts", value: `User works as ${role}` });
    }
  }

  const goalEnglish = text.match(/(?:my\s+goal\s+is|i\s+want\s+to)\s+([^.!?\n]{1,120})/i);
  const goalHindi = text.match(/mujhe\s+([^.!?\n]{1,120})\s+karna\s+hai/i);
  const goal = toShortPhrase(goalEnglish?.[1] ?? goalHindi?.[1] ?? "", MAX_MEMORY_WORDS);
  if (goal) {
    memories.push({ key: "facts", value: `User goal: ${goal}` });
  }

  return memories;
}

function logMemoryDecision(message: string, save: boolean, type: string) {
  void message;
  void save;
  void type;
}

function uniqueValues(values: string[], max: number) {
  const seen = new Set<string>();
  const semanticSeen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.toLowerCase();
    const semantic = normalizeSemanticKey(value);
    if (seen.has(normalized) || (semantic && semanticSeen.has(semantic))) {
      continue;
    }

    seen.add(normalized);
    if (semantic) {
      semanticSeen.add(semantic);
    }
    result.push(value);

    if (result.length >= max) {
      break;
    }
  }

  return result;
}

function normalizeList(values: unknown, max: number) {
  if (!Array.isArray(values)) {
    return [];
  }

  return uniqueValues(
    values
      .filter((value): value is string => typeof value === "string")
      .map((value) => sanitizeText(value))
      .map((value) => (value ? normalizeText(value, 2, 80) : undefined))
      .filter((value): value is string => Boolean(value)),
    max,
  );
}

function normalizeIsoTimestamp(value: unknown) {
  if (typeof value !== "string") {
    return new Date(0).toISOString();
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return new Date(0).toISOString();
  }

  return new Date(parsed).toISOString();
}

const MEMORY_STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "in",
  "on",
  "at",
  "for",
  "is",
  "am",
  "are",
  "was",
  "were",
  "very",
  "really",
  "just",
  "my",
  "your",
  "user",
  "me",
  "i",
]);

function tokenizeMemoryValue(value: string) {
  return sanitizeText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")

    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && !MEMORY_STOP_WORDS.has(word));
}

function hasSimilarMemoryValue(left: string, right: string) {
  const leftTokens = tokenizeMemoryValue(left);
  const rightTokens = tokenizeMemoryValue(right);
  if (!leftTokens.length || !rightTokens.length) {
    return false;
  }

  const rightSet = new Set(rightTokens);
  const sharedTokens = leftTokens.filter((token) => rightSet.has(token)).length;
  const ratio = sharedTokens / Math.max(leftTokens.length, rightTokens.length);
  return ratio >= 0.6;
}

async function filterMemoryCandidates(values: string[]) {
  const accepted: string[] = [];

  for (const value of uniqueValues(normalizeList(values, MAX_FACTS), MAX_FACTS)) {
    const decision = await shouldSaveToMemory(value);
    if (!decision.save) {
      continue;
    }

    if (accepted.some((existing) => hasSimilarMemoryValue(existing, value))) {
      continue;
    }

    accepted.push(value);

    if (accepted.length >= MAX_FACTS) {
      break;
    }
  }

  return accepted;
}

function getUserDocRef(user: User): DocumentReference {
  return doc(db, USERS_COLLECTION, user.uid);
}

function getChatHistoryCollection(user: User) {
  return collection(db, USERS_COLLECTION, user.uid, CHAT_HISTORY_COLLECTION);
}

function getImagesCollection(user: User) {
  return collection(db, USERS_COLLECTION, user.uid, IMAGES_COLLECTION);
}

function mapMemoryDoc(data: MemoryDocShape | undefined): Omit<MemoryProfile, "chat_history" | "images"> {
  return {
    preferences: normalizeList(data?.preferences, MAX_PREFERENCES),
    facts: normalizeList(data?.facts, MAX_FACTS),
    memoryEnabled: typeof data?.memoryEnabled === "boolean" ? data.memoryEnabled : true,
  };
}

function mapImageEntry(id: string, raw: unknown): MemoryImageEntry | null {
  if (!isRecord(raw)) {
    return null;
  }

  const type = raw.type === "generated" ? "generated" : raw.type === "upload" ? "upload" : null;
  const storedUrl = typeof raw.url === "string" ? raw.url.trim() : "";
  const storedBase64 = typeof raw.base64 === "string" ? raw.base64.trim() : "";
  const storedImage = typeof raw.image === "string" ? raw.image.trim() : "";
  const source = storedUrl || storedBase64 || storedImage;
  const url = source
    ? /^(data:|https?:|blob:|file:)/i.test(source)
      ? source
      : `data:image/jpeg;base64,${source}`
    : "";
  const prompt = typeof raw.prompt === "string" ? raw.prompt : undefined;
  const caption = typeof raw.caption === "string" ? raw.caption : undefined;
  const storagePath = typeof raw.storagePath === "string" ? raw.storagePath : undefined;
  const timestamp =
    raw.timestamp && isRecord(raw.timestamp) && typeof raw.timestamp.toDate === "function"
      ? raw.timestamp.toDate().toISOString()
      : normalizeIsoTimestamp(raw.timestampIso);

  if (!type || !url) {
    return null;
  }

  return { id, type, url, prompt, caption, timestamp, storagePath };
}

export function createEmptyMemoryProfile(): MemoryProfile {
  return {
    preferences: [],
    facts: [],
    memoryEnabled: true,
    chat_history: [],
    images: [],
  };
}

export function deriveMemoryFields(current: Pick<MemoryProfile, "preferences" | "facts">, text: string) {
  const currentPreferences = normalizeList(current.preferences, MAX_PREFERENCES);
  const currentFacts = normalizeList(current.facts, MAX_FACTS);
  const nextPreferences = [...currentPreferences];
  const nextFacts = [...currentFacts];

  const cleaned = sanitizeText(text);
  if (!cleaned) {
    logMemoryDecision(text, false, "ignored-empty");
    return {
      preferences: currentPreferences,
      facts: currentFacts,
    };
  }

  // Highest priority: explicit user memory request should always be saved.
  const explicitPayload = extractExplicitMemoryPayload(cleaned);
  if (typeof explicitPayload === "string") {
    const explicitInsights = explicitPayload ? extractImplicitMemories(explicitPayload) : [];

    if (explicitInsights.length) {
      for (const memory of explicitInsights) {
        if (memory.key === "preferences") {
          nextPreferences.unshift(memory.value);
        } else {
          nextFacts.unshift(memory.value);
        }
      }
      logMemoryDecision(text, true, "explicit-structured");
    } else {
      const fallback = rememberSummary(explicitPayload) ?? "Remember: user requested memory";
      nextFacts.unshift(fallback);
      logMemoryDecision(text, true, "explicit-fallback");
    }

    return {
      preferences: uniqueValues(nextPreferences, MAX_PREFERENCES),
      facts: uniqueValues(nextFacts, MAX_FACTS),
    };
  }

  const forgetTopic = extractForgetTopic(cleaned);
  if (forgetTopic) {
    if (forgetTopic === "__all__") {
      logMemoryDecision(text, true, "forget-all");
      return {
        preferences: [],
        facts: [],
      };
    }

    const normalizedTopic = normalizeSemanticKey(forgetTopic);
    const keepByTopic = (value: string) => {
      const memoryKey = normalizeSemanticKey(value);
      return !memoryKey.includes(normalizedTopic) && !normalizedTopic.includes(memoryKey);
    };

    const next = {
      preferences: currentPreferences.filter(keepByTopic),
      facts: currentFacts.filter(keepByTopic),
    };
    logMemoryDecision(text, true, "forget-topic");
    return next;
  }

  const hasPersonalSignal = PERSONAL_SIGNAL_PATTERN.test(cleaned);
  const isImplicitCandidate = cleaned.length > 15 || hasPersonalSignal;

  if (!isImplicitCandidate || (isLowValueText(cleaned) && !hasPersonalSignal)) {
    logMemoryDecision(text, false, "ignored-random");
    return {
      preferences: currentPreferences,
      facts: currentFacts,
    };
  }

  const implicitMemories = extractImplicitMemories(cleaned);
  for (const memory of implicitMemories) {
    if (memory.key === "preferences") {
      nextPreferences.unshift(memory.value);
    } else {
      nextFacts.unshift(memory.value);
    }
  }

  if (!implicitMemories.length) {
    const lowConfidence = rememberSummary(cleaned);
    if (lowConfidence) {
      nextFacts.unshift(lowConfidence);
      logMemoryDecision(text, true, "fallback-low-confidence");
    } else {
      logMemoryDecision(text, false, "ignored-unparsable");
    }
  } else {
    logMemoryDecision(text, true, "implicit-structured");
  }

  return {
    preferences: uniqueValues(nextPreferences, MAX_PREFERENCES),
    facts: uniqueValues(nextFacts, MAX_FACTS),
  };
}

export async function ensureUserMemoryDoc(user: User) {
  const ref = getUserDocRef(user);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) {
    return;
  }

  await setDoc(ref, {
    preferences: [],
    facts: [],
    memoryEnabled: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function fetchMemory(
  user: User | null,
  options?: {
    chatLimit?: number;
    imageLimit?: number;
  },
): Promise<MemoryProfile> {
  if (!user) {
    return {
      ...createEmptyMemoryProfile(),
      memoryEnabled: localStorage.getItem(LOCAL_MEMORY_ENABLED_KEY) !== "false",
    };
  }

  await ensureUserMemoryDoc(user);
  const userSnapshot = await getDoc(getUserDocRef(user));
  const base = mapMemoryDoc(userSnapshot.data() as MemoryDocShape | undefined);

  const chatLimit = options?.chatLimit ?? 20;
  const imageLimit = options?.imageLimit ?? 20;

  const imageSnapshot = await getDocs(query(getImagesCollection(user), orderBy("timestamp", "desc"), limit(imageLimit)));

  const visibleInsights: MemoryChatEntry[] = [
    ...base.preferences.map((value, index) => ({
      id: `preference:${index}`,
      role: "user" as const,
      content: value,
      timestamp: new Date(0).toISOString(),
    })),
    ...base.facts.map((value, index) => ({
      id: `fact:${index}`,
      role: "user" as const,
      content: value,
      timestamp: new Date(0).toISOString(),
    })),
  ].slice(0, chatLimit);

  const images = imageSnapshot.docs
    .map((entry) => mapImageEntry(entry.id, entry.data()))
    .filter((entry): entry is MemoryImageEntry => Boolean(entry))
    .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp));

  return {
    ...base,
    chat_history: visibleInsights,
    images,
  };
}

export async function setMemoryEnabled(user: User | null, enabled: boolean) {
  if (!user) {
    localStorage.setItem(LOCAL_MEMORY_ENABLED_KEY, String(enabled));
    return;
  }

  await ensureUserMemoryDoc(user);
  await updateDoc(getUserDocRef(user), {
    memoryEnabled: enabled,
    updatedAt: serverTimestamp(),
  });
}

export async function saveMemoryFields(
  user: User | null,
  fields: Pick<MemoryProfile, "preferences" | "facts">,
  options?: { skipAiFilter?: boolean },
) {
  if (!user) {
    return;
  }

  await ensureUserMemoryDoc(user);

  const nextPreferencesSource = uniqueValues(normalizeList(fields.preferences, MAX_PREFERENCES), MAX_PREFERENCES);
  const nextFactsSource = uniqueValues(normalizeList(fields.facts, MAX_FACTS), MAX_FACTS);

  const nextPreferences = options?.skipAiFilter
    ? nextPreferencesSource
    : await filterMemoryCandidates(nextPreferencesSource);
  const nextFacts = options?.skipAiFilter
    ? nextFactsSource
    : await filterMemoryCandidates(nextFactsSource);

  await updateDoc(getUserDocRef(user), {
    preferences: uniqueValues(nextPreferences, MAX_PREFERENCES),
    facts: uniqueValues(nextFacts, MAX_FACTS),
    updatedAt: serverTimestamp(),
  });
}

export async function saveImage(
  user: User | null,
  payload: {
    type: MemoryImageType;
    url: string;
    prompt?: string;
    caption?: string;
    storagePath?: string;
  },
) {
  if (!user) {
    return;
  }

  const cleanedUrl = payload.url.trim();
  if (!cleanedUrl) {
    return;
  }

  try {
    await ensureUserMemoryDoc(user);
    await addDoc(getImagesCollection(user), {
      type: payload.type,
      url: cleanedUrl,
      prompt: payload.prompt?.trim() || null,
      caption: payload.caption?.trim() || null,
      storagePath: payload.storagePath || null,
      timestamp: serverTimestamp(),
      timestampIso: new Date().toISOString(),
    });

    const overflowSnapshot = await getDocs(
      query(getImagesCollection(user), orderBy("timestamp", "desc"), limit(MAX_IMAGE_HISTORY + 20)),
    );
    const overflowDocs = overflowSnapshot.docs.slice(MAX_IMAGE_HISTORY);
    await Promise.all(overflowDocs.map((entry) => deleteDoc(entry.ref)));
  } catch (error) {
    console.error("Memory image save failed:", error);
    throw error;
  }
}

export async function deleteMemoryChat(user: User | null, messageId: string) {
  if (!user || !messageId) {
    return;
  }

  const snapshot = await getDoc(getUserDocRef(user));
  const current = mapMemoryDoc(snapshot.data() as MemoryDocShape | undefined);
  const [bucket, rawIndex] = messageId.split(":");
  const index = Number(rawIndex);

  if ((bucket === "preference" || bucket === "fact") && Number.isInteger(index) && index >= 0) {
    const nextPreferences = [...current.preferences];
    const nextFacts = [...current.facts];

    if (bucket === "preference") {
      nextPreferences.splice(index, 1);
    } else {
      nextFacts.splice(index, 1);
    }

    await saveMemoryFields(user, {
      preferences: nextPreferences,
      facts: nextFacts,
    }, { skipAiFilter: true });
    return;
  }

  await deleteDoc(doc(db, USERS_COLLECTION, user.uid, CHAT_HISTORY_COLLECTION, messageId));
}

export async function deleteMemoryImage(user: User | null, imageId: string) {
  if (!user || !imageId) {
    return;
  }

  await deleteDoc(doc(db, USERS_COLLECTION, user.uid, IMAGES_COLLECTION, imageId));
}

export async function clearAllMemory(user: User | null) {
  if (!user) {
    localStorage.setItem(LOCAL_MEMORY_ENABLED_KEY, "true");
    return;
  }

  await ensureUserMemoryDoc(user);

  const [chatSnapshot, imageSnapshot] = await Promise.all([
    getDocs(query(getChatHistoryCollection(user), limit(500))),
    getDocs(query(getImagesCollection(user), limit(500))),
  ]);

  await Promise.all([
    ...chatSnapshot.docs.map((entry) => deleteDoc(entry.ref)),
    ...imageSnapshot.docs.map((entry) => deleteDoc(entry.ref)),
  ]);

  await updateDoc(getUserDocRef(user), {
    preferences: [],
    facts: [],
    updatedAt: serverTimestamp(),
  });
}

export async function pruneLowValueMemories(user: User | null, scanLimit = 500) {
  if (!user) {
    return 0;
  }

  const snapshot = await getDocs(
    query(getChatHistoryCollection(user), orderBy("timestamp", "desc"), limit(scanLimit)),
  );

  const trashDocs = snapshot.docs.filter((entry) => {
    const raw = entry.data();
    const content = typeof raw.content === "string" ? raw.content : "";
    return !passesMemoryValidation(content);
  });

  if (!trashDocs.length) {
    return 0;
  }

  await Promise.all(trashDocs.map((entry) => deleteDoc(entry.ref)));
  return trashDocs.length;
}

export function buildPromptMemoryContext(memory: MemoryProfile) {
  return {
    preferences: memory.preferences.slice(0, 10),
    facts: memory.facts.slice(0, 10),
    memoryEnabled: memory.memoryEnabled,
    chat_history: [],
    images: memory.images.slice(0, 12),
  };
}

export const shouldSaveMemory = (text: string) => {
  const triggers = [
    'remember',
    'yaad rakh',
    'save this',
    'important',
  ];

  return triggers.some((trigger) => text.toLowerCase().includes(trigger));
};

export const isImportant = (text: string) => {
  return text.length > 40;
};

export const saveChatMemory = async (userId: string, content: string) => {
  if (!userId || !(await shouldSaveToMemory(content)).save) {
    return;
  }

  try {
    await addDoc(
      collection(db, 'users', userId, 'memory'),
      {
        role: 'user',
        content,
        timestamp: serverTimestamp(),
      }
    );
  } catch (err) {
    console.error('Save memory failed:', err);
  }
};

export const saveImageMemory = async (_userId: string, _imageUrl: string) => {
  return;
};
