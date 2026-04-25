import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type User,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ChatMessage } from "@/lib/ai-service";

const LOCAL_CHATS_KEY = "chats";
const MAX_CHAT_TITLE_LENGTH = 60;

export interface ChatSessionSummary {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  titleGenerated?: boolean;
}

export interface StoredChatMessage extends ChatMessage {
  createdAt: number;
}

interface LocalChatRecord extends ChatSessionSummary {
  messages: StoredChatMessage[];
}

type LocalChatsMap = Record<string, LocalChatRecord>;

function readLocalChats(): LocalChatsMap {
  try {
    const raw = localStorage.getItem(LOCAL_CHATS_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as LocalChatsMap;
    return parsed ?? {};
  } catch (error) {
    console.error("Failed to read local chat history", error);
    return {};
  }
}

function writeLocalChats(chats: LocalChatsMap) {
  localStorage.setItem(LOCAL_CHATS_KEY, JSON.stringify(chats));
}

function sortSessionsByRecent(sessions: ChatSessionSummary[]) {
  return [...sessions].sort((left, right) => right.updatedAt - left.updatedAt);
}

export function isGuestMode(user: User | null) {
  return !user;
}

export async function createChatSession(user: User | null): Promise<string> {
  const chatId = Date.now().toString();
  const now = Date.now();

  if (isGuestMode(user)) {
    const chats = readLocalChats();
    chats[chatId] = {
      id: chatId,
      title: "New Chat",
      createdAt: now,
      updatedAt: now,
      titleGenerated: false,
      messages: [],
    };
    writeLocalChats(chats);
    return chatId;
  }

  await setDoc(doc(db, "chats", chatId), {
    userId: user.uid,
    title: "New Chat",
    titleGenerated: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdAtMs: now,
    updatedAtMs: now,
  });

  return chatId;
}

export async function saveChatMessage(chatId: string, message: StoredChatMessage, user: User | null) {
  if (isGuestMode(user)) {
    const chats = readLocalChats();
    const existingChat = chats[chatId] ?? {
      id: chatId,
      title: "New Chat",
      createdAt: message.createdAt,
      updatedAt: message.createdAt,
      titleGenerated: false,
      messages: [],
    };

    existingChat.messages.push(message);
    existingChat.updatedAt = message.createdAt;
    chats[chatId] = existingChat;
    writeLocalChats(chats);
    return;
  }

  await addDoc(collection(db, "chats", chatId, "messages"), {
    ...message,
    createdAtServer: serverTimestamp(),
  });

  await updateDoc(doc(db, "chats", chatId), {
    updatedAt: serverTimestamp(),
    updatedAtMs: message.createdAt,
  });
}

export async function updateChatSessionTitle(chatId: string, title: string, user: User | null) {
  const trimmedTitle = Array.from(title.trim()).slice(0, MAX_CHAT_TITLE_LENGTH).join("") || "New Chat";

  if (isGuestMode(user)) {
    const chats = readLocalChats();
    const existingChat = chats[chatId];
    if (!existingChat) {
      return;
    }

    existingChat.title = trimmedTitle;
    existingChat.titleGenerated = true;
    existingChat.updatedAt = Date.now();
    chats[chatId] = existingChat;
    writeLocalChats(chats);
    return;
  }

  await updateDoc(doc(db, "chats", chatId), {
    title: trimmedTitle,
    titleGenerated: true,
    updatedAt: serverTimestamp(),
    updatedAtMs: Date.now(),
  });
}

export async function loadChatSessions(user: User | null): Promise<ChatSessionSummary[]> {
  if (isGuestMode(user)) {
    const chats = readLocalChats();
    return sortSessionsByRecent(
      Object.values(chats).map((chat) => ({
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        titleGenerated: typeof chat.titleGenerated === "boolean" ? chat.titleGenerated : chat.title !== "New Chat",
      })),
    );
  }

  const snapshot = await getDocs(query(collection(db, "chats"), where("userId", "==", user.uid)));
  return sortSessionsByRecent(
    snapshot.docs.map((chatDoc) => {
      const data = chatDoc.data();
      return {
        id: chatDoc.id,
        title: typeof data.title === "string" ? data.title : "New Chat",
        createdAt: typeof data.createdAtMs === "number" ? data.createdAtMs : 0,
        updatedAt: typeof data.updatedAtMs === "number" ? data.updatedAtMs : 0,
        titleGenerated: typeof data.titleGenerated === "boolean"
          ? data.titleGenerated
          : (typeof data.title === "string" ? data.title !== "New Chat" : false),
      };
    }),
  );
}

export async function loadChatMessages(chatId: string, user: User | null): Promise<StoredChatMessage[]> {
  if (isGuestMode(user)) {
    const chats = readLocalChats();
    return chats[chatId]?.messages ?? [];
  }

  const snapshot = await getDocs(query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc")));
  return snapshot.docs.map((messageDoc) => {
    const data = messageDoc.data();
    return {
      role: data.role === "user" ? "user" : "model",
      content: typeof data.content === "string" ? data.content : "",
      createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
    };
  });
}

export async function deleteChatSession(chatId: string, user: User | null) {
  if (isGuestMode(user)) {
    const chats = readLocalChats();
    if (chats[chatId]) {
      delete chats[chatId];
      writeLocalChats(chats);
    }
    return;
  }

  const snapshot = await getDocs(collection(db, "chats", chatId, "messages"));
  await Promise.all(snapshot.docs.map((messageDoc) => deleteDoc(messageDoc.ref)));
  await deleteDoc(doc(db, "chats", chatId));
}

