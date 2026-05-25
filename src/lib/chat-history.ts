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

export function getChatEmoji(title: string): string {
  const lower = title.toLowerCase();

  // 1. Broad keyword mappings for common topics
  if (/\b(code|coding|program|programming|c\+\+|python|java|javascript|react|html|css|developer|dev|bug|debug|syntax|algorithm|loop|recursion|function|git|github|compile|build|database|sql|json|api|npm|node|terminal|bash)\b/i.test(lower)) {
    return "💻";
  }
  
  if (/\b(study|coach|mentor|learn|class|math|physics|chemistry|biology|science|exam|test|assignment|homework|notes|academic|book|read|study coach|college|university|lecture|school|teach|teacher|lesson|history|geography)\b/i.test(lower)) {
    return "📚";
  }
  
  if (/\b(music|song|songs|sing|singing|playlist|tune|beat|beats|rap|guitar|piano|lyrics|audio|mp3|band|concert|dance|dancing)\b/i.test(lower)) {
    return "🎵";
  }
  
  if (/\b(love|feelings|feeling|heart|romantic|care|caring|sad|emotional|happy|bestie|friend|crush|date|relationship|mood|dil|gf|bf|boyfriend|girlfriend|marriage|couple|hug|kiss|smile|cute)\b/i.test(lower)) {
    return "💖";
  }
  
  if (/\b(travel|trip|tour|explore|journey|flight|vacation|holiday|hill|mountain|beach|trek|trekking|goa|adventure|car|bike|drive|road|map|world|passport|hotel|camp|camping)\b/i.test(lower)) {
    return "✈️";
  }
  
  if (/\b(movie|movies|film|films|show|shows|series|reels|reel|youtube|video|videos|cinema|theatre|drama|netflix|actor|actress|popcorn|watch)\b/i.test(lower)) {
    return "🎬";
  }
  
  if (/\b(night|chill|sleep|sleepy|lazy|relax|tired|bed|late night|calm|peace|dream|dreams|chatting|bakbak|baatein|gup|coffee|tea|cafe|evening|morning|weather|rain|sunset)\b/i.test(lower)) {
    return "🌙";
  }

  if (/\b(money|rich|business|cash|finance|rupee|dollar|shop|shopping|buy|price|sell|market|crypto|coin|coins)\b/i.test(lower)) {
    return "💰";
  }

  if (/\b(food|eat|hungry|dinner|lunch|breakfast|pizza|burger|maggi|chai|samosa|biryani|kitchen|cook|cooking|sweet|chocolate|cake)\b/i.test(lower)) {
    return "🍕";
  }

  if (/\b(game|games|gaming|play|pubg|freefire|chess|xbox|ps5|console|controller|pc)\b/i.test(lower)) {
    return "🎮";
  }

  if (/\b(art|paint|painting|draw|drawing|sketch|design|creative|photo|photography|camera|pics|picture|gallery)\b/i.test(lower)) {
    return "🎨";
  }

  if (/\b(health|gym|fit|fitness|workout|run|running|exercise|doctor|medicine|yoga)\b/i.test(lower)) {
    return "💪";
  }

  // 2. Hash-based fallback using a large collection of unique, cute emojis
  // This guarantees that almost every chat title gets a different, unique emoji that remains consistent!
  const uniqueEmojis = [
    "🌸", "🦋", "🐼", "🍦", "☕", "🚀", "💡", "🔮", "🍀", "🧁", "🍩", "🥑", "🐙",
    "🦄", "🦊", "🐯", "🦁", "🐨", "🐱", "🐶", "🌈", "⚡", "🍿", "🎸", "🧩", "🏖️",
    "⛺", "🛸", "🧗", "🧘", "🧸", "🪞", "🧪", "🔭", "🛹", "🏎️", "🏄", "🎒", "👒",
    "🕶️", "💄", "💍", "🎀", "🎈", "🎁", "🪄", "🔑", "🗺️", "🎡", "👾", "🧞", "🧜",
    "👻", "👽", "🦉", "🐧", "🦕", "🐢", "🌾", "🍁", "🔥", "💧"
  ];

  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % uniqueEmojis.length;
  return uniqueEmojis[index];
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  emoji?: string;
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

    const parsed = JSON.parse(raw) as LocalChatsMap | LocalChatRecord[];
    // Handle legacy array format from old saveLocal() - convert to object
    if (Array.isArray(parsed)) {
      console.warn("[chat-history] Legacy array format detected in localStorage, migrating...");
      const migrated: LocalChatsMap = {};
      for (const item of parsed) {
        if (item && typeof item === "object" && "id" in item) {
          migrated[(item as LocalChatRecord).id] = item as LocalChatRecord;
        }
      }
      writeLocalChats(migrated);
      return migrated;
    }
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
  const emoji = "💬";

  if (isGuestMode(user)) {
    const chats = readLocalChats();
    chats[chatId] = {
      id: chatId,
      title: "New Chat",
      emoji,
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
    emoji,
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
  const emoji = getChatEmoji(trimmedTitle);

  if (isGuestMode(user)) {
    const chats = readLocalChats();
    const existingChat = chats[chatId];
    if (!existingChat) {
      return;
    }

    existingChat.title = trimmedTitle;
    existingChat.emoji = emoji;
    existingChat.titleGenerated = true;
    existingChat.updatedAt = Date.now();
    chats[chatId] = existingChat;
    writeLocalChats(chats);
    return;
  }

  await updateDoc(doc(db, "chats", chatId), {
    title: trimmedTitle,
    emoji: emoji,
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
        emoji: chat.emoji || getChatEmoji(chat.title),
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
      const title = typeof data.title === "string" ? data.title : "New Chat";
      return {
        id: chatDoc.id,
        title,
        emoji: typeof data.emoji === "string" ? data.emoji : getChatEmoji(title),
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

