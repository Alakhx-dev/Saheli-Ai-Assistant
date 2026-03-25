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
const MIN_OBSERVATIONS_FOR_ADAPTATION = 5;
const MAX_PREFERENCES = 6;
const MAX_MOMENTS = 12;
export const CREATOR_NAME = "Alakh";

type MemoryTone = "hindi" | "english" | "hinglish";
type LengthBucket = "short" | "medium" | "long";
type MoodBucket = "serious" | "funny" | "flirty" | "playful";

interface MemoryLearningState {
  sampleCount: number;
  toneCounts: Record<MemoryTone, number>;
  lengthCounts: Record<LengthBucket, number>;
  moodCounts: Record<MoodBucket, number>;
}

export interface MemoryProfile {
  name?: string;
  tone?: MemoryTone;
  style?: string;
  moodPattern?: string;
  preferences?: string[];
  learning?: MemoryLearningState;
  updatedAtMs?: number;
}

export interface MemoryMoment {
  id: string;
  imageDataUrl: string;
  createdAt: number;
}

export type MemoryFieldKey = "name" | "tone" | "style" | "moodPattern" | "preference";

type FirestoreMemoryProfile = Partial<MemoryProfile> & {
  learning?: Partial<MemoryLearningState>;
};

function readGuestMemory(): MemoryProfile | null {
  try {
    const raw = localStorage.getItem(LOCAL_GUEST_MEMORY_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as MemoryProfile;
  } catch (error) {
    console.warn("Failed to read guest memory", error);
    return null;
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

const ROMAN_HINDI_HINTS = [
  "main",
  "mera",
  "meri",
  "mujhe",
  "tum",
  "tujhe",
  "kaisa",
  "lag",
  "raha",
  "rahi",
  "nahi",
  "kyun",
  "acha",
  "yaar",
  "thoda",
  "baat",
  "pasand",
  "hoon",
  "hai",
];

const FLIRTY_HINTS = ["love", "miss", "baby", "cutie", "jaan", "romantic", "cute", "kiss", "date", "sexy"];
const FUNNY_HINTS = ["haha", "hehe", "lol", "lmao", "roast", "masti", "joke", "funny", "meme"];
const SERIOUS_HINTS = ["help", "problem", "issue", "tension", "sad", "upset", "anxious", "important", "serious", "worried"];
const PLAYFUL_HINTS = ["tease", "pagal", "drama", "chal", "oye", "acha ji", "huh", "hehe", "na", "uff"];

function getMemoryDocRef(user: User) {
  return doc(db, MEMORY_COLLECTION, user.uid, PROFILE_SUBCOLLECTION, PROFILE_DOC_ID);
}

function getMemoryMomentsCollectionRef(user: User) {
  return collection(db, MEMORY_COLLECTION, user.uid, MEMORY_MOMENTS_SUBCOLLECTION);
}

function createEmptyLearningState(): MemoryLearningState {
  return {
    sampleCount: 0,
    toneCounts: {
      hindi: 0,
      english: 0,
      hinglish: 0,
    },
    lengthCounts: {
      short: 0,
      medium: 0,
      long: 0,
    },
    moodCounts: {
      serious: 0,
      funny: 0,
      flirty: 0,
      playful: 0,
    },
  };
}

function normalizeLearningState(learning?: Partial<MemoryLearningState>): MemoryLearningState {
  const fallback = createEmptyLearningState();

  return {
    sampleCount: typeof learning?.sampleCount === "number" ? learning.sampleCount : 0,
    toneCounts: {
      hindi: typeof learning?.toneCounts?.hindi === "number" ? learning.toneCounts.hindi : fallback.toneCounts.hindi,
      english: typeof learning?.toneCounts?.english === "number" ? learning.toneCounts.english : fallback.toneCounts.english,
      hinglish: typeof learning?.toneCounts?.hinglish === "number" ? learning.toneCounts.hinglish : fallback.toneCounts.hinglish,
    },
    lengthCounts: {
      short: typeof learning?.lengthCounts?.short === "number" ? learning.lengthCounts.short : fallback.lengthCounts.short,
      medium: typeof learning?.lengthCounts?.medium === "number" ? learning.lengthCounts.medium : fallback.lengthCounts.medium,
      long: typeof learning?.lengthCounts?.long === "number" ? learning.lengthCounts.long : fallback.lengthCounts.long,
    },
    moodCounts: {
      serious: typeof learning?.moodCounts?.serious === "number" ? learning.moodCounts.serious : fallback.moodCounts.serious,
      funny: typeof learning?.moodCounts?.funny === "number" ? learning.moodCounts.funny : fallback.moodCounts.funny,
      flirty: typeof learning?.moodCounts?.flirty === "number" ? learning.moodCounts.flirty : fallback.moodCounts.flirty,
      playful: typeof learning?.moodCounts?.playful === "number" ? learning.moodCounts.playful : fallback.moodCounts.playful,
    },
  };
}

function sanitizeFragment(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/[<>{}[\]]/g, "")
    .trim()
    .replace(/[.,!?]+$/g, "")
    .trim();
}

function normalizeName(rawName: string): string | undefined {
  const cleaned = sanitizeFragment(rawName)
    .replace(/\b(hai|hoon|hu|hun|h|ho)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || cleaned.length > 40 || cleaned.split(" ").length > 4) {
    return undefined;
  }

  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizePreference(rawPreference: string): string | undefined {
  const cleaned = sanitizeFragment(rawPreference)
    .replace(/\b(bahut|bohot|bahot|really|very)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || cleaned.length < 2 || cleaned.length > 60) {
    return undefined;
  }

  return cleaned;
}

function extractName(text: string): string | undefined {
  const match = text.match(/(?:mera\s+naam|my\s+name\s+is)\s+([^.!?\n]{1,40})/i);
  return match ? normalizeName(match[1]) : undefined;
}

function extractPreference(text: string): string | undefined {
  const trailingPreferenceMatch = text.match(/mujhe\s+pasand\s+hai\s+([^.!?\n]{1,60})/i);
  if (trailingPreferenceMatch) {
    return normalizePreference(trailingPreferenceMatch[1]);
  }

  const leadingPreferenceMatch = text.match(/mujhe\s+([^.!?\n]{1,60})\s+pasand\s+hai/i);
  if (leadingPreferenceMatch) {
    return normalizePreference(leadingPreferenceMatch[1]);
  }

  const englishMatch = text.match(/i\s+like\s+([^.!?\n]{1,60})/i);
  return englishMatch ? normalizePreference(englishMatch[1]) : undefined;
}

function extractExplicitMoodPattern(text: string): string | undefined {
  const lowered = text.toLowerCase();

  if (/(romantic|flirty|ishq|pyaar)/i.test(lowered)) {
    return "romantic + playful";
  }

  if (/(funny|masti|mazaak|mazak|playful)/i.test(lowered)) {
    return "playful + teasing";
  }

  if (/(serious|calm|sorted|simple|introvert|shy)/i.test(lowered)) {
    return "calm + thoughtful";
  }

  return undefined;
}

function shouldObserveMessage(text: string): boolean {
  const trimmed = text.trim();

  if (!trimmed || trimmed.length < 3 || trimmed.length > 240) {
    return false;
  }

  if (/https?:\/\//i.test(trimmed)) {
    return false;
  }

  if (!/[a-z]/i.test(trimmed) && !/[\u0900-\u097F]/u.test(trimmed)) {
    return false;
  }

  if (/^([a-z])\1{5,}$/i.test(trimmed.replace(/\s+/g, ""))) {
    return false;
  }

  return true;
}

function detectTone(text: string): MemoryTone {
  const lowered = text.toLowerCase();
  const latinWords = lowered.match(/\b[a-z]{2,}\b/g) ?? [];
  const hindiHintMatches = ROMAN_HINDI_HINTS.filter((hint) => lowered.includes(hint)).length;
  const hasHindiScript = /[\u0900-\u097f]/.test(text);
  const englishWordCount = latinWords.filter((word) => !ROMAN_HINDI_HINTS.includes(word)).length;

  if ((hasHindiScript || hindiHintMatches >= 2) && englishWordCount >= 2) {
    return "hinglish";
  }

  if (hasHindiScript || hindiHintMatches >= 2) {
    return "hindi";
  }

  return "english";
}

function detectLength(text: string): LengthBucket {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  if (wordCount <= 8) {
    return "short";
  }

  if (wordCount >= 20) {
    return "long";
  }

  return "medium";
}

function detectMood(text: string): MoodBucket {
  const lowered = text.toLowerCase();
  const scores: Record<MoodBucket, number> = {
    serious: 0,
    funny: 0,
    flirty: 0,
    playful: 0,
  };

  for (const hint of SERIOUS_HINTS) {
    if (lowered.includes(hint)) {
      scores.serious += 1;
    }
  }

  for (const hint of FUNNY_HINTS) {
    if (lowered.includes(hint)) {
      scores.funny += 1;
    }
  }

  for (const hint of FLIRTY_HINTS) {
    if (lowered.includes(hint)) {
      scores.flirty += 1;
    }
  }

  for (const hint of PLAYFUL_HINTS) {
    if (lowered.includes(hint)) {
      scores.playful += 1;
    }
  }

  const highestScore = Math.max(...Object.values(scores));
  if (highestScore === 0) {
    return "playful";
  }

  return (Object.entries(scores).find(([, score]) => score === highestScore)?.[0] as MoodBucket) ?? "playful";
}

function pickDominantBucket<TBucket extends string>(counts: Record<TBucket, number>): TBucket {
  return (Object.entries(counts).sort((left, right) => right[1] - left[1])[0]?.[0] as TBucket) ?? Object.keys(counts)[0] as TBucket;
}

function deriveStyle(length: LengthBucket, mood: MoodBucket): string {
  if (length === "short" && (mood === "flirty" || mood === "playful")) {
    return "short + teasing";
  }

  if (length === "short" && mood === "serious") {
    return "short + direct";
  }

  if (length === "long" && mood === "serious") {
    return "detailed + thoughtful";
  }

  if (length === "long" && (mood === "flirty" || mood === "funny" || mood === "playful")) {
    return "expressive + playful";
  }

  if (mood === "serious") {
    return "calm + thoughtful";
  }

  if (mood === "funny") {
    return "casual + witty";
  }

  if (mood === "flirty") {
    return "short + teasing";
  }

  return "casual + playful";
}

function deriveMoodPattern(moodCounts: Record<MoodBucket, number>): string {
  const sortedMoods = Object.entries(moodCounts).sort((left, right) => right[1] - left[1]);
  const primaryMood = (sortedMoods[0]?.[0] as MoodBucket | undefined) ?? "playful";
  const secondaryMood = (sortedMoods[1]?.[0] as MoodBucket | undefined) ?? primaryMood;

  if (primaryMood === "flirty") {
    return secondaryMood === "serious" ? "romantic + caring" : "romantic + playful";
  }

  if (primaryMood === "serious") {
    return secondaryMood === "flirty" ? "calm + caring" : "calm + thoughtful";
  }

  if (primaryMood === "funny") {
    return "funny + light";
  }

  return secondaryMood === "flirty" ? "romantic + playful" : "playful + teasing";
}

function addPreference(preferences: string[] | undefined, preference: string): string[] {
  const nextPreferences = [...(preferences ?? [])];

  if (!nextPreferences.some((item) => item.toLowerCase() === preference.toLowerCase())) {
    nextPreferences.unshift(preference);
  }

  return nextPreferences.slice(0, MAX_PREFERENCES);
}

function normalizeProfile(profile: FirestoreMemoryProfile): MemoryProfile {
  return {
    name: typeof profile.name === "string" ? profile.name : undefined,
    tone: profile.tone === "hindi" || profile.tone === "english" || profile.tone === "hinglish" ? profile.tone : undefined,
    style: typeof profile.style === "string" ? profile.style : undefined,
    moodPattern: typeof profile.moodPattern === "string" ? profile.moodPattern : undefined,
    preferences: Array.isArray(profile.preferences)
      ? profile.preferences.filter((value): value is string => typeof value === "string").slice(0, MAX_PREFERENCES)
      : [],
    learning: normalizeLearningState(profile.learning),
    updatedAtMs: typeof profile.updatedAtMs === "number" ? profile.updatedAtMs : undefined,
  };
}

export function isMemoryEnabled() {
  const value = localStorage.getItem(MEMORY_ENABLED_KEY);
  return value !== "false";
}

export function setMemoryEnabled(enabled: boolean) {
  localStorage.setItem(MEMORY_ENABLED_KEY, String(enabled));
}

function getDefaultProfile(user: User | null): MemoryProfile {
  if (!user) {
    return {
      name: CREATOR_NAME,
      tone: "hinglish",
      style: "short + teasing",
      moodPattern: "romantic + playful",
      preferences: [],
      learning: createEmptyLearningState(),
      updatedAtMs: Date.now(),
    };
  }

  return {
    name: sanitizeFragment(user.displayName || "User") || "User",
    preferences: [],
    learning: createEmptyLearningState(),
  };
}

export function deriveNextMemoryProfile(currentProfile: MemoryProfile | null, message: string): MemoryProfile | null {
  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    return currentProfile;
  }

  const nextProfile = normalizeProfile(currentProfile ?? {});
  let hasChanges = false;

  const explicitName = extractName(trimmedMessage);
  if (explicitName && explicitName !== nextProfile.name) {
    nextProfile.name = explicitName;
    hasChanges = true;
  }

  const explicitPreference = extractPreference(trimmedMessage);
  if (explicitPreference) {
    const nextPreferences = addPreference(nextProfile.preferences, explicitPreference);
    if (nextPreferences.join("|") !== (nextProfile.preferences ?? []).join("|")) {
      nextProfile.preferences = nextPreferences;
      hasChanges = true;
    }
  }

  const explicitMoodPattern = extractExplicitMoodPattern(trimmedMessage);
  if (explicitMoodPattern && explicitMoodPattern !== nextProfile.moodPattern) {
    nextProfile.moodPattern = explicitMoodPattern;
    hasChanges = true;
  }

  if (shouldObserveMessage(trimmedMessage)) {
    const learning = normalizeLearningState(nextProfile.learning);
    const tone = detectTone(trimmedMessage);
    const length = detectLength(trimmedMessage);
    const mood = detectMood(trimmedMessage);

    learning.sampleCount += 1;
    learning.toneCounts[tone] += 1;
    learning.lengthCounts[length] += 1;
    learning.moodCounts[mood] += 1;
    nextProfile.learning = learning;
    hasChanges = true;

    if (learning.sampleCount >= MIN_OBSERVATIONS_FOR_ADAPTATION) {
      nextProfile.tone = pickDominantBucket(learning.toneCounts);
      nextProfile.style = deriveStyle(
        pickDominantBucket(learning.lengthCounts),
        pickDominantBucket(learning.moodCounts),
      );

      if (!explicitMoodPattern) {
        nextProfile.moodPattern = deriveMoodPattern(learning.moodCounts);
      }
    }
  }

  if (!hasChanges) {
    return currentProfile;
  }

  nextProfile.updatedAtMs = Date.now();
  return nextProfile;
}

export async function loadMemoryProfile(user: User | null): Promise<MemoryProfile | null> {
  if (!user) {
    const guestProfile = readGuestMemory();
    return normalizeProfile(guestProfile ?? getDefaultProfile(null));
  }

  const snapshot = await getDoc(getMemoryDocRef(user));
  if (!snapshot.exists()) {
    return normalizeProfile(getDefaultProfile(user));
  }

  const storedProfile = normalizeProfile(snapshot.data() as FirestoreMemoryProfile);
  return normalizeProfile({
    ...getDefaultProfile(user),
    ...storedProfile,
    learning: storedProfile.learning,
    preferences: storedProfile.preferences,
  });
}

export async function persistMemoryProfile(user: User | null, profile: MemoryProfile | null): Promise<void> {
  if (!profile) {
    return;
  }

  const normalized = normalizeProfile(profile);

  if (!user) {
    writeGuestMemory(normalized);
    return;
  }

  await setDoc(
    getMemoryDocRef(user),
    {
      ...normalized,
      updatedAt: serverTimestamp(),
      updatedAtMs: normalized.updatedAtMs ?? Date.now(),
    },
  );
}

export function deleteMemoryEntry(profile: MemoryProfile | null, field: MemoryFieldKey, preferenceValue?: string): MemoryProfile | null {
  const nextProfile = normalizeProfile(profile ?? {});

  if (field === "preference" && preferenceValue) {
    nextProfile.preferences = (nextProfile.preferences ?? []).filter(
      (item) => item.toLowerCase() !== preferenceValue.toLowerCase(),
    );
  } else {
    delete nextProfile[field];
  }

  if (field === "tone" || field === "style" || field === "moodPattern") {
    nextProfile.learning = createEmptyLearningState();
  }

  nextProfile.updatedAtMs = Date.now();
  return nextProfile;
}

export async function loadMemoryMoments(user: User | null): Promise<MemoryMoment[]> {
  if (!user) {
    return readGuestMoments().sort((left, right) => right.createdAt - left.createdAt);
  }

  const snapshot = await getDocs(query(getMemoryMomentsCollectionRef(user), orderBy("createdAt", "desc"), limit(MAX_MOMENTS)));
  return snapshot.docs.map((momentDoc) => {
    const data = momentDoc.data();

    return {
      id: momentDoc.id,
      imageDataUrl: typeof data.imageDataUrl === "string" ? data.imageDataUrl : "",
      createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
    };
  }).filter((moment) => moment.imageDataUrl);
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
