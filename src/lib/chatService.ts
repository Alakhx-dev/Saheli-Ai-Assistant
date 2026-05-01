import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ChatMemoryItem = {
  type: "explicit" | "implicit";
  content: string;
};

export type MemoryDetectionResult = {
  save: boolean;
  type?: "explicit" | "implicit";
  content?: string;
};

export type MemorySaveResult = {
  saved: boolean;
  message: string;
  aiResponse: string;
};

export async function saveMessageToDB(content: string, role: string, userId?: string) {
  if (!userId) return;
  try {
    await addDoc(collection(db, "chats"), {
      userId,
      content,
      role,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Failed to save message to new DB structure", err);
  }
}

export function cleanMemory(message: string) {
  return message
    .replace(/yaad\s*rakhna|remember\s*this|note\s*this/gi, "")
    .trim();
}

function normalizeMemoryContent(content: string) {
  return content
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export async function memoryExists(userId: string, content: string) {
  const trimmed = content.trim();
  if (!userId || !trimmed) {
    return false;
  }

  const normalized = normalizeMemoryContent(trimmed);

  const normalizedQuery = query(
    collection(db, "memories"),
    where("userId", "==", userId),
    where("contentNormalized", "==", normalized),
  );

  const normalizedSnapshot = await getDocs(normalizedQuery);
  if (!normalizedSnapshot.empty) {
    return true;
  }

  const exactQuery = query(
    collection(db, "memories"),
    where("userId", "==", userId),
    where("content", "==", trimmed),
  );
  const exactSnapshot = await getDocs(exactQuery);
  return !exactSnapshot.empty;
}

export function detectMemory(message: string): MemoryDetectionResult {
  const msg = message.toLowerCase();

  if (
    msg.includes("yaad rakhna") ||
    msg.includes("remember this") ||
    msg.includes("note this")
  ) {
    const result: MemoryDetectionResult = {
      save: true,
      type: "explicit",
      content: cleanMemory(message),
    };
    console.log("Memory Check:", result);
    return result;
  }

  if (
    msg.includes("mera") ||
    msg.includes("mujhe") ||
    msg.includes("i am") ||
    msg.includes("i like") ||
    msg.includes("pasand")
  ) {
    const result: MemoryDetectionResult = {
      save: true,
      type: "implicit",
      content: cleanMemory(message),
    };
    console.log("Memory Check:", result);
    return result;
  }

  const result: MemoryDetectionResult = { save: false };
  console.log("Memory Check:", result);
  return result;
}

export async function saveMemoryToDB(memoryItem: ChatMemoryItem, userId?: string): Promise<MemorySaveResult> {
  if (!userId || !memoryItem.content?.trim()) {
    return {
      saved: false,
      message: "Invalid memory payload",
      aiResponse: "",
    };
  }

  const content = memoryItem.content.trim();

  try {
    const exists = await memoryExists(userId, content);
    if (exists) {
      return {
        saved: false,
        message: "Already saved",
        aiResponse: "maine ye already yaad rakha hai 😉",
      };
    }

    await addDoc(collection(db, "memories"), {
      userId,
      ...memoryItem,
      content,
      contentNormalized: normalizeMemoryContent(content),
      createdAt: serverTimestamp(),
    });

    return {
      saved: true,
      message: "Saved successfully",
      aiResponse: "ye yaad rakh liya 💖",
    };
  } catch (err) {
    console.error("Failed to save auto memory", err);

    return {
      saved: false,
      message: "Save failed",
      aiResponse: "",
    };
  }
}

export async function saveImageMemoryDB(imageUrl: string, userId?: string) {
  if (!userId) return;
  try {
    await addDoc(collection(db, "imageMemory"), {
      userId,
      imageUrl,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Failed to save image memory", err);
  }
}

/**
 * Save a vision-captured image directly to Firestore as base64.
 * No Firebase Storage upload — avoids CORS preflight issues entirely.
 * Only the raw image is stored; analysis text is NOT saved.
 */
export async function saveVisionImageMemory(base64Image: string, userId?: string, description?: string) {
  if (!userId || !base64Image) return;
  try {
    const cleanBase64 = base64Image.startsWith("data:image")
      ? base64Image.split(",")[1]
      : base64Image;
    await addDoc(collection(db, "image_memories"), {
      userId,
      type: "image",
      timestamp: Date.now(),
      base64: cleanBase64,
      image: cleanBase64,
      description: description?.trim() || "",
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Failed to save vision image memory", err);
  }
}

export async function deleteChatDoc(id: string) {
  await deleteDoc(doc(db, "chats", id));
}

export async function deleteImageMemoryDoc(id: string) {
  await deleteDoc(doc(db, "imageMemory", id));
}


