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
      .map((value) => normalizeText(value))
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
  const content = typeof raw.content === "string" ? raw.content.trim() : "";
  const timestamp =
    raw.timestamp && isRecord(raw.timestamp) && typeof raw.timestamp.toDate === "function"
      ? raw.timestamp.toDate().toISOString()
      : normalizeIsoTimestamp(raw.timestampIso);

  if (!role || !content) {
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
  return name ? `Name: ${name}` : undefined;
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
      return value;
    }
  }

  return undefined;
}

function extractFact(text: string) {
  const patterns: Array<[RegExp, (value: string) => string | undefined]> = [
    [/\bi\s+am\s+from\s+([^.!?\n]{1,120})/i, (value) => normalizeText(`From ${value}`, 4, 140)],
    [/\bmain\s+([^.!?\n]{1,120})\s+se\s+hu/i, (value) => normalizeText(`From ${value}`, 4, 140)],
    [/\bi\s+work\s+as\s+([^.!?\n]{1,120})/i, (value) => normalizeText(`Works as ${value}`, 4, 140)],
    [/\bi\s+am\s+(\d{1,2})\s+years?\s+old/i, (value) => normalizeText(`Age ${value}`, 4, 140)],
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

  await ensureUserMemoryDoc(user);

  if (!isMeaningfulMessage(payload.content)) {
    return;
  }

  await addDoc(getChatHistoryCollection(user), {
    role: payload.role,
    content: payload.content.trim(),
    timestamp: serverTimestamp(),
    timestampIso: new Date().toISOString(),
  });

  const overflowSnapshot = await getDocs(
    query(getChatHistoryCollection(user), orderBy("timestamp", "desc"), limit(MAX_CHAT_HISTORY + 20)),
  );
  const overflowDocs = overflowSnapshot.docs.slice(MAX_CHAT_HISTORY);
  await Promise.all(overflowDocs.map((entry) => deleteDoc(entry.ref)));
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

  await ensureUserMemoryDoc(user);
  const cleanedUrl = payload.url.trim();
  if (!cleanedUrl) {
    return;
  }

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
}

export async function deleteMemoryChat(user: User | null, messageId: string) {
  if (!user || !messageId) {
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

export function buildPromptMemoryContext(memory: MemoryProfile) {
  return {
    preferences: memory.preferences.slice(0, 10),
    facts: memory.facts.slice(0, 10),
    memoryEnabled: memory.memoryEnabled,
    chat_history: memory.chat_history.slice(-20),
    images: memory.images.slice(0, 12),
  };
}
