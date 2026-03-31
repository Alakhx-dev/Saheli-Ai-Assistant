import { addDoc, collection, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ChatMemoryItem = {
  type: string;
  value: string;
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
    console.warn("Failed to save message to new DB structure", err);
  }
}

export function autoMemoryExtract(text: string): ChatMemoryItem[] {
  const memory: ChatMemoryItem[] = [];
  const lowerText = text.toLowerCase();

  const nameMatch = lowerText.match(/(?:mera naam|my name is)\s+([^.!?\n]+)/i);
  if (nameMatch) {
    memory.push({ type: "name", value: nameMatch[1].trim() });
  }

  if (lowerText.includes("mujhe pasand")) {
    memory.push({ type: "preference", value: text });
  }

  if (lowerText.includes("yaad rakh")) {
    memory.push({ type: "custom", value: text });
  }

  return memory;
}

export async function saveMemoryToDB(memoryItem: ChatMemoryItem, userId?: string) {
  if (!userId) return;
  try {
    await addDoc(collection(db, "memory"), {
      userId,
      ...memoryItem,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Failed to save auto memory", err);
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
    console.warn("Failed to save image memory", err);
  }
}

export async function deleteChatDoc(id: string) {
  await deleteDoc(doc(db, "chats", id));
}

export async function deleteImageMemoryDoc(id: string) {
  await deleteDoc(doc(db, "imageMemory", id));
}

