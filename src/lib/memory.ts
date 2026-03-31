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
  type User,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const MEMORY_COLLECTION = "memory";
const PROFILE_SUBCOLLECTION = "profile";
const PROFILE_DOC_ID = "main";
const MEMORY_MOMENTS_SUBCOLLECTION = "moments";
const LOCAL_GUEST_MEMORY_KEY = "memory_guest";
const LOCAL_GUEST_MOMENTS_KEY = "memory_guest_moments";
const MEMORY_ENABLED_KEY = "memory_enabled";
const MAX_MOMENTS = 12;
const MAX_MEMORY_ITEMS = {
  preferences: 16,
  facts: 16,
  recent_context: 10,
} as const;

export const CREATOR_NAME = "Alakh";

export interface MemoryProfile {
  preferences: string[];
  facts: string[];
  recent_context: string[];
  updatedAtMs?: number;
}

export interface MemoryMoment {
  id: string;
  imageDataUrl: string;
  createdAt: number;
}

export type MemoryFieldKey = keyof Pick<MemoryProfile, "preferences" | "facts" | "recent_context">;

type FirestoreMemoryProfile = Partial<MemoryProfile> & {
  name?: string;
  tone?: string;
  style?: string;
  moodPattern?: string;
};

function getMemoryDocRef(user: User) {
  return doc(db, MEMORY_COLLECTION, user.uid, PROFILE_SUBCOLLECTION, PROFILE_DOC_ID);
}

function getMemoryMomentsCollectionRef(user: User) {
  return collection(db, MEMORY_COLLECTION, user.uid, MEMORY_MOMENTS_SUBCOLLECTION);
}

export function createEmptyMemoryProfile(): MemoryProfile {
  return {
    preferences: [],
    facts: [],
    recent_context: [],
    updatedAtMs: Date.now(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeMemoryValue(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/[<>{}\[\]]/g, "")
    .trim()
    .replace(/[.,!?]+$/g, "")
    .trim();
}

function capitalizeSentence(value: string) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeMemoryValue(value: string, minLength = 3, maxLength = 160) {
  const cleaned = capitalizeSentence(sanitizeMemoryValue(value));

  if (!cleaned || cleaned.length < minLength || cleaned.length > maxLength) {
    return undefined;
  }

  return cleaned;
}

function normalizeName(rawName: string): string | undefined {
  const cleaned = sanitizeMemoryValue(rawName)
    .replace(/\b(hai|hoon|hu|hun|ho)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || cleaned.length > 40 || cleaned.split(" ").length > 4) {
    return undefined;
  }

  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

function uniqueMemoryItems(values: string[], maxItems: number) {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const value of values) {
    const normalized = value.toLowerCase();
    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    deduped.push(value);

    if (deduped.length >= maxItems) {
      break;
    }
  }

  return deduped;
}

function normalizeBucket(values: unknown, bucket: MemoryFieldKey): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return uniqueMemoryItems(
    values
      .filter((value): value is string => typeof value === "string")
      .map((value) => normalizeMemoryValue(value))
      .filter((value): value is string => Boolean(value)),
    MAX_MEMORY_ITEMS[bucket],
  );
}

function legacyFacts(profile: FirestoreMemoryProfile) {
  const facts: string[] = [];

  if (typeof profile.name === "string") {
    const name = normalizeName(profile.name);
    if (name) {
      facts.push(`Name: ${name}`);
    }
  }

  if (typeof profile.tone === "string") {
    const tone = normalizeMemoryValue(`Preferred tone: ${profile.tone}`);
    if (tone) {
      facts.push(tone);
    }
  }

  if (typeof profile.style === "string") {
    const style = normalizeMemoryValue(`Preferred response style: ${profile.style}`);
    if (style) {
      facts.push(style);
    }
  }

  if (typeof profile.moodPattern === "string") {
    const moodPattern = normalizeMemoryValue(`Conversation mood: ${profile.moodPattern}`);
    if (moodPattern) {
      facts.push(moodPattern);
    }
  }

  return facts;
}

function normalizeProfile(profile: unknown): MemoryProfile {
  const empty = createEmptyMemoryProfile();

  if (!isRecord(profile)) {
    return empty;
  }

  const storedProfile = profile as FirestoreMemoryProfile;
  const preferences = normalizeBucket(storedProfile.preferences, "preferences");
  const facts = uniqueMemoryItems(
    [...normalizeBucket(storedProfile.facts, "facts"), ...legacyFacts(storedProfile)],
    MAX_MEMORY_ITEMS.facts,
  );
  const recentContext = normalizeBucket(storedProfile.recent_context, "recent_context");

  return {
    preferences,
    facts,
    recent_context: recentContext,
    updatedAtMs: typeof storedProfile.updatedAtMs === "number" ? storedProfile.updatedAtMs : empty.updatedAtMs,
  };
}

function readGuestMemory(): MemoryProfile {
  try {
    const raw = localStorage.getItem(LOCAL_GUEST_MEMORY_KEY);
    if (!raw) {
      return createEmptyMemoryProfile();
    }

    return normalizeProfile(JSON.parse(raw));
  } catch (error) {
    console.warn("Failed to read guest memory", error);
    return createEmptyMemoryProfile();
  }
}

function writeGuestMemory(profile: MemoryProfile) {
  try {
    localStorage.setItem(LOCAL_GUEST_MEMORY_KEY, JSON.stringify(profile));
  } catch (error) {
    console.warn("Failed to persist guest memory", error);
  }
}

function readGuestMoments(): MemoryMoment[] {
  try {
    const raw = localStorage.getItem(LOCAL_GUEST_MOMENTS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as MemoryMoment[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to read guest memory moments", error);
    return [];
  }
}

function writeGuestMoments(moments: MemoryMoment[]) {
  try {
    localStorage.setItem(LOCAL_GUEST_MOMENTS_KEY, JSON.stringify(moments.slice(0, MAX_MOMENTS)));
  } catch (error) {
    console.warn("Failed to persist guest memory moments", error);
  }
}

function extractNameFact(text: string) {
  const match = text.match(/(?:my\s+name\s+is|mera\s+naam)\s+([^.!?\n]{1,40})/i);
  const name = match ? normalizeName(match[1]) : undefined;
  return name ? `Name: ${name}` : undefined;
}

function normalizePreference(rawPreference: string) {
  const cleaned = sanitizeMemoryValue(rawPreference)
    .replace(/\b(bahut|bohot|bahot|really|very)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || cleaned.length < 2 || cleaned.length > 80) {
    return undefined;
  }

  return capitalizeSentence(cleaned);
}

function extractPreference(text: string) {
  const trailingPreferenceMatch = text.match(/mujhe\s+pasand\s+hai\s+([^.!?\n]{1,80})/i);
  if (trailingPreferenceMatch) {
    const preference = normalizePreference(trailingPreferenceMatch[1]);
    return preference ? `Likes ${preference}` : undefined;
  }

  const leadingPreferenceMatch = text.match(/mujhe\s+([^.!?\n]{1,80})\s+pasand\s+hai/i);
  if (leadingPreferenceMatch) {
    const preference = normalizePreference(leadingPreferenceMatch[1]);
    return preference ? `Likes ${preference}` : undefined;
  }

  const englishMatch = text.match(/i\s+like\s+([^.!?\n]{1,80})/i);
  if (englishMatch) {
    const preference = normalizePreference(englishMatch[1]);
    return preference ? `Likes ${preference}` : undefined;
  }

  return undefined;
}

function extractFact(text: string) {
  const matchers: Array<[RegExp, (value: string) => string | undefined]> = [
    [/\bi\s+am\s+from\s+([^.!?\n]{1,80})/i, (value) => normalizeMemoryValue(`From ${value}`)],
    [/\bmain\s+([^.!?\n]{1,80})\s+se\s+hu/i, (value) => normalizeMemoryValue(`From ${value}`)],
    [/\bi\s+work\s+as\s+([^.!?\n]{1,80})/i, (value) => normalizeMemoryValue(`Works as ${value}`)],
    [/\bi\s+study\s+([^.!?\n]{1,80})/i, (value) => normalizeMemoryValue(`Studies ${value}`)],
    [/\bi\s+am\s+(\d{1,2})\s+years?\s+old/i, (value) => normalizeMemoryValue(`Age: ${value}`)],
  ];

  for (const [pattern, formatter] of matchers) {
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

function shouldStoreAsRecentContext(text: string) {
  const trimmed = text.trim();

  if (!trimmed || trimmed.length < 8 || trimmed.length > 180) {
    return false;
  }

  if (/https?:\/\//i.test(trimmed)) {
    return false;
  }

  if (!/[a-z]/i.test(trimmed) && !/[\u0900-\u097F]/u.test(trimmed)) {
    return false;
  }

  return true;
}

function mergeBucket(currentValues: string[], incomingValues: string[] | undefined, bucket: MemoryFieldKey) {
  return uniqueMemoryItems(
    [
      ...(incomingValues ?? [])
        .map((value) => normalizeMemoryValue(value))
        .filter((value): value is string => Boolean(value)),
      ...currentValues,
    ],
    MAX_MEMORY_ITEMS[bucket],
  );
}

function profilesEqual(left: MemoryProfile, right: MemoryProfile) {
  return (
    left.preferences.join("|") === right.preferences.join("|") &&
    left.facts.join("|") === right.facts.join("|") &&
    left.recent_context.join("|") === right.recent_context.join("|")
  );
}

export function mergeMemoryProfile(
  currentProfile: MemoryProfile | null,
  partialProfile: Partial<Pick<MemoryProfile, "preferences" | "facts" | "recent_context">>,
): MemoryProfile {
  const current = normalizeProfile(currentProfile);
  const nextProfile: MemoryProfile = {
    preferences: mergeBucket(current.preferences, partialProfile.preferences, "preferences"),
    facts: mergeBucket(current.facts, partialProfile.facts, "facts"),
    recent_context: mergeBucket(current.recent_context, partialProfile.recent_context, "recent_context"),
    updatedAtMs: Date.now(),
  };

  return nextProfile;
}

export function isMemoryEnabled() {
  const value = localStorage.getItem(MEMORY_ENABLED_KEY);
  return value !== "false";
}

export function setMemoryEnabled(enabled: boolean) {
  localStorage.setItem(MEMORY_ENABLED_KEY, String(enabled));
}

export function deriveNextMemoryProfile(currentProfile: MemoryProfile | null, message: string): MemoryProfile | null {
  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    return normalizeProfile(currentProfile);
  }

  const factAdditions = [extractNameFact(trimmedMessage), extractFact(trimmedMessage)].filter(
    (value): value is string => Boolean(value),
  );
  const preferenceAdditions = [extractPreference(trimmedMessage)].filter((value): value is string => Boolean(value));
  const recentContextAdditions =
    shouldStoreAsRecentContext(trimmedMessage) && factAdditions.length === 0 && preferenceAdditions.length === 0
      ? [trimmedMessage]
      : [];

  const nextProfile = mergeMemoryProfile(currentProfile, {
    preferences: preferenceAdditions,
    facts: factAdditions,
    recent_context: recentContextAdditions,
  });

  const current = normalizeProfile(currentProfile);
  return profilesEqual(current, nextProfile) ? current : nextProfile;
}

export async function loadMemoryProfile(user: User | null): Promise<MemoryProfile | null> {
  if (!user) {
    return readGuestMemory();
  }

  const snapshot = await getDoc(getMemoryDocRef(user));
  if (!snapshot.exists()) {
    return createEmptyMemoryProfile();
  }

  return normalizeProfile(snapshot.data());
}

export async function persistMemoryProfile(user: User | null, profile: MemoryProfile | null): Promise<void> {
  if (!profile) {
    return;
  }

  const normalized = {
    ...normalizeProfile(profile),
    updatedAtMs: Date.now(),
  };

  if (!user) {
    writeGuestMemory(normalized);
    return;
  }

  await setDoc(getMemoryDocRef(user), {
    ...normalized,
    updatedAt: serverTimestamp(),
  });
}

export function deleteMemoryEntry(profile: MemoryProfile | null, field: MemoryFieldKey, value: string): MemoryProfile {
  const nextProfile = normalizeProfile(profile);
  nextProfile[field] = nextProfile[field].filter((item) => item.toLowerCase() !== value.toLowerCase());
  nextProfile.updatedAtMs = Date.now();
  return nextProfile;
}

export async function loadMemoryMoments(user: User | null): Promise<MemoryMoment[]> {
  if (!user) {
    return readGuestMoments().sort((left, right) => right.createdAt - left.createdAt);
  }

  const snapshot = await getDocs(query(getMemoryMomentsCollectionRef(user), orderBy("createdAt", "desc"), limit(MAX_MOMENTS)));
  return snapshot.docs
    .map((momentDoc) => {
      const data = momentDoc.data();

      return {
        id: momentDoc.id,
        imageDataUrl: typeof data.imageDataUrl === "string" ? data.imageDataUrl : "",
        createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
      };
    })
    .filter((moment) => moment.imageDataUrl);
}

export async function saveMemoryMoment(user: User | null, imageBase64OrDataUrl: string): Promise<void> {
  const imageDataUrl = imageBase64OrDataUrl.startsWith("data:image")
    ? imageBase64OrDataUrl
    : `data:image/jpeg;base64,${imageBase64OrDataUrl}`;
  const createdAt = Date.now();

  if (!user) {
    const moments = readGuestMoments();
    const nextMoments = [{ id: String(createdAt), imageDataUrl, createdAt }, ...moments];
    writeGuestMoments(nextMoments);
    return;
  }

  await addDoc(getMemoryMomentsCollectionRef(user), {
    imageDataUrl,
    createdAt,
    createdAtServer: serverTimestamp(),
  });
}

export async function deleteMemoryMoment(user: User | null, momentId: string): Promise<void> {
  if (!user) {
    const nextMoments = readGuestMoments().filter((moment) => moment.id !== momentId);
    writeGuestMoments(nextMoments);
    return;
  }

  await deleteDoc(doc(db, MEMORY_COLLECTION, user.uid, MEMORY_MOMENTS_SUBCOLLECTION, momentId));
}
