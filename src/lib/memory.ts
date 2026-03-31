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
  type User,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const USERS_COLLECTION = "users";
const CHAT_HISTORY_COLLECTION = "chat_history";
const IMAGES_COLLECTION = "images";
const LOCAL_MEMORY_ENABLED_KEY = "memory_enabled_guest";

const MAX_CHAT_HISTORY = 30;
const MAX_IMAGE_HISTORY = 60;
const MAX_PREFERENCES = 20;
const MAX_FACTS = 20;
const MAX_MEMORY_WORDS = 4;
const MAX_MEMORY_KEYWORDS = 4;
const MIN_MEMORY_WORDS = 2;

const GREETING_PATTERN =
  /^(hi|hello|hey|hii|heyy|yo|ok|okay|hmm|hmmm|thik|theek|fine|good|nice|thanks|thank you|sup|kya haal|kaise ho)$/i;
const STATUS_PATTERN =
  /\b(thik hu|theek hu|i am fine|i'm fine|all good|sab thik|bas thik|just fine|okay hu)\b/i;
const EXPLICIT_MEMORY_PATTERN =
  /\b(yaad rakh|yaad rakhna|remember this|remember that|save this|important)\b/i;

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

function toShortPhrase(input: string, maxWords = MAX_MEMORY_WORDS) {
  const cleaned = sanitizeText(input);
  const words = cleaned.split(/\s+/).filter(Boolean).slice(0, maxWords);
  if (!words.length) {
    return undefined;
  }
  return words.join(" ");
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

function summarizeToKeywords(content: string) {
  // Strict instruction equivalent:
  // "Extract facts ONLY if Identity, Preferences, Habits, or Explicit Commands.
  // Ignore greetings, small talk, temporary status. Return 3-4 keywords."
  const text = sanitizeText(content);
  const lower = text.toLowerCase();

  if (isLowValueText(text) || wordCount(text) < MIN_MEMORY_WORDS) {
    return undefined;
  }

  const nameMatch = text.match(/(?:my\s+name\s+is|mera\s+naam)\s+([^.!?\n]{1,60})/i);
  if (nameMatch) {
    const name = toShortPhrase(nameMatch[1], 2);
    return name ? `Name: ${name}` : undefined;
  }

  const ageMatch = lower.match(/\b(?:i am|i'm|age|umr)\s*(\d{1,2})\b/i);
  if (ageMatch) {
    return `Age: ${ageMatch[1]}`;
  }

  const likesMatch = text.match(/(?:i\s+like|mujhe\s+pasand\s+hai|mujhe)\s+([^.!?\n]{1,120})(?:\s+pasand\s+hai)?/i);
  if (likesMatch) {
    const likes = toShortPhrase(likesMatch[1], MAX_MEMORY_WORDS);
    return likes ? `Likes: ${likes}` : undefined;
  }

  const dislikesMatch = text.match(/(?:i\s+don't\s+like|i\s+dislike|mujhe\s+pasand\s+nahi)\s+([^.!?\n]{1,120})/i);
  if (dislikesMatch) {
    const dislikes = toShortPhrase(dislikesMatch[1], MAX_MEMORY_WORDS);
    return dislikes ? `Dislikes: ${dislikes}` : undefined;
  }

  const habitMatch = text.match(/(?:i\s+usually|i\s+always|i\s+often|har\s+roz|daily)\s+([^.!?\n]{1,120})/i);
  if (habitMatch) {
    const habit = toShortPhrase(habitMatch[1], MAX_MEMORY_WORDS);
    return habit ? `Habit: ${habit}` : undefined;
  }

  if (EXPLICIT_MEMORY_PATTERN.test(lower)) {
    const remembered = toShortPhrase(
      text
        .replace(EXPLICIT_MEMORY_PATTERN, "")
        .replace(/[:\-]/g, " ")
        .trim(),
      MAX_MEMORY_WORDS,
    );
    if (remembered) {
      return `Remember: ${remembered}`;
    }
  }

  return undefined;
}

function uniqueValues(values: string[], max: number) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.toLowerCase();
    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
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
      .map((value) => toShortPhrase(value, MAX_MEMORY_WORDS))
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

function mapChatEntry(id: string, raw: unknown): MemoryChatEntry | null {
  if (!isRecord(raw)) {
    return null;
  }

  const role = raw.role === "assistant" ? "assistant" : raw.role === "user" ? "user" : null;
  const content = typeof raw.content === "string" ? toShortPhrase(raw.content, MAX_MEMORY_WORDS) ?? "" : "";
  const timestamp =
    raw.timestamp && isRecord(raw.timestamp) && typeof raw.timestamp.toDate === "function"
      ? raw.timestamp.toDate().toISOString()
      : normalizeIsoTimestamp(raw.timestampIso);

  if (!role || !content || !passesMemoryValidation(content)) {
    return null;
  }

  return { id, role, content, timestamp };
}

function mapImageEntry(id: string, raw: unknown): MemoryImageEntry | null {
  if (!isRecord(raw)) {
    return null;
  }

  const type = raw.type === "generated" ? "generated" : raw.type === "upload" ? "upload" : null;
  const url = typeof raw.url === "string" ? raw.url.trim() : "";
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

export function isMeaningfulMessage(content: string) {
  const trimmed = content.trim();
  if (!trimmed) {
    return false;
  }

  if (trimmed.length < 6 || trimmed.length > 1600) {
    return false;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return false;
  }

  return /[a-zA-Z\u0900-\u097F]/u.test(trimmed);
}

function extractNameFact(text: string) {
  const match = text.match(/(?:my\s+name\s+is|mera\s+naam)\s+([^.!?\n]{1,60})/i);
  const name = match ? normalizeText(match[1], 2, 60) : undefined;
  if (!name) {
    return undefined;
  }
  return `Name: ${toShortPhrase(name, 2)}`;
}

function extractPreference(text: string) {
  const patterns = [
    /i\s+like\s+([^.!?\n]{1,120})/i,
    /mujhe\s+pasand\s+hai\s+([^.!?\n]{1,120})/i,
    /mujhe\s+([^.!?\n]{1,120})\s+pasand\s+hai/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) {
      continue;
    }

    const value = normalizeText(match[1], 2, 120);
    if (value) {
      const short = toShortPhrase(value, MAX_MEMORY_WORDS);
      return short ? `Likes: ${short}` : undefined;
    }
  }

  return undefined;
}

function extractFact(text: string) {
  const patterns: Array<[RegExp, (value: string) => string | undefined]> = [
    [/\bi\s+am\s+from\s+([^.!?\n]{1,120})/i, (value) => {
      const short = toShortPhrase(value, MAX_MEMORY_WORDS);
      return short ? `Remember: from ${short}` : undefined;
    }],
    [/\bmain\s+([^.!?\n]{1,120})\s+se\s+hu/i, (value) => {
      const short = toShortPhrase(value, MAX_MEMORY_WORDS);
      return short ? `Remember: from ${short}` : undefined;
    }],
    [/\bi\s+work\s+as\s+([^.!?\n]{1,120})/i, (value) => {
      const short = toShortPhrase(value, MAX_MEMORY_WORDS);
      return short ? `Habit: work ${short}` : undefined;
    }],
    [/\bi\s+am\s+(\d{1,2})\s+years?\s+old/i, (value) => `Age: ${value}`],
  ];

  for (const [pattern, formatter] of patterns) {
    const match = text.match(pattern);
    if (!match) {
      continue;
    }

    const fact = formatter(match[1]);
    if (fact) {
      return fact;
    }
  }

  return undefined;
}

export function deriveMemoryFields(current: Pick<MemoryProfile, "preferences" | "facts">, text: string) {
  const currentPreferences = normalizeList(current.preferences, MAX_PREFERENCES);
  const currentFacts = normalizeList(current.facts, MAX_FACTS);
  const nextPreferences = [...currentPreferences];
  const nextFacts = [...currentFacts];

  const preference = extractPreference(text);
  if (preference) {
    nextPreferences.unshift(preference);
  }

  const nameFact = extractNameFact(text);
  if (nameFact) {
    nextFacts.unshift(nameFact);
  }

  const fact = extractFact(text);
  if (fact) {
    nextFacts.unshift(fact);
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

  const [chatSnapshot, imageSnapshot] = await Promise.all([
    getDocs(query(getChatHistoryCollection(user), orderBy("timestamp", "desc"), limit(chatLimit))),
    getDocs(query(getImagesCollection(user), orderBy("timestamp", "desc"), limit(imageLimit))),
  ]);

  const chatHistory = chatSnapshot.docs
    .map((entry) => mapChatEntry(entry.id, entry.data()))
    .filter((entry): entry is MemoryChatEntry => Boolean(entry))
    .sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp));

  const images = imageSnapshot.docs
    .map((entry) => mapImageEntry(entry.id, entry.data()))
    .filter((entry): entry is MemoryImageEntry => Boolean(entry))
    .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp));

  return {
    ...base,
    chat_history: chatHistory,
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
) {
  if (!user) {
    return;
  }

  await ensureUserMemoryDoc(user);
  await updateDoc(getUserDocRef(user), {
    preferences: uniqueValues(normalizeList(fields.preferences, MAX_PREFERENCES), MAX_PREFERENCES),
    facts: uniqueValues(normalizeList(fields.facts, MAX_FACTS), MAX_FACTS),
    updatedAt: serverTimestamp(),
  });
}

export async function saveMessage(
  user: User | null,
  payload: {
    role: MemoryMessageRole;
    content: string;
  },
) {
  if (!user) {
    return;
  }

  const content = payload.content.trim();
  if (!content) {
    return;
  }
  const summarized = summarizeToKeywords(content);
  if (!summarized || !passesMemoryValidation(summarized)) {
    return;
  }

  try {
    await ensureUserMemoryDoc(user);
    await addDoc(getChatHistoryCollection(user), {
      role: payload.role,
      content: summarized,
      timestamp: serverTimestamp(),
      timestampIso: new Date().toISOString(),
    });

    const overflowSnapshot = await getDocs(
      query(getChatHistoryCollection(user), orderBy("timestamp", "desc"), limit(MAX_CHAT_HISTORY + 20)),
    );
    const overflowDocs = overflowSnapshot.docs.slice(MAX_CHAT_HISTORY);
    await Promise.all(overflowDocs.map((entry) => deleteDoc(entry.ref)));
  } catch (error) {
    console.error("Memory save failed:", error);
    throw error;
  }
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

  await deleteDoc(doc(db, 'users', user.uid, 'memory', messageId));
}

export async function deleteMemoryImage(user: User | null, imageId: string) {
  if (!user || !imageId) {
    return;
  }

  await deleteDoc(doc(db, 'users', user.uid, 'memory_images', imageId));
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
    chat_history: memory.chat_history.slice(-20),
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

  return triggers.some(t =>
    text.toLowerCase().includes(t)
  );
};

export const isImportant = (text: string) => {
  return text.length > 40;
};

export const saveChatMemory = async (userId: string, content: string) => {
  if (!userId) return;

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

export const saveImageMemory = async (userId: string, imageUrl: string) => {
  if (!userId || !imageUrl) return;

  try {
    await addDoc(
      collection(db, 'users', userId, 'memory_images'),
      {
        url: imageUrl,
        type: 'camera',
        timestamp: serverTimestamp(),
      }
    );
  } catch (err) {
    console.error('Save image memory failed:', err);
  }
};
