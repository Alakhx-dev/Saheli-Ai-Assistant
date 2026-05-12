import { create } from "zustand";

type AppUser = any;
type AppChat = any;
type AppMemory = any;

type AppState = {
  user: AppUser;
  chats: AppChat[];
  memory: AppMemory;
  settings: {
    memoryEnabled: boolean;
    language: string;
    speakingRate: number;
    temperature: number;
    selectedModelId: string;
  };
  setUser: (user: AppUser) => void;
  setChats: (chats: AppChat[]) => void;
  addMessage: (chatId: string, message: any) => void;
  updateStreamingMessage: (chatId: string, content: string) => void;
  saveFinalMessage: (chatId: string, message: any) => void;
  setMemory: (memory: AppMemory) => void;
  setSettings: (settings: Partial<AppState["settings"]>) => void;
};

export const useAppStore = create<AppState>((set) => ({
  user: null,
  chats: [],
  memory: null,
  settings: {
    memoryEnabled: true,
    language: "auto",
    speakingRate: 0.96,
    temperature: 0.8,
    selectedModelId: "qwen/qwen-2.5-72b-instruct",
  },
  setUser: (user) => set({ user }),
  setChats: (chats) => set({ chats }),
  addMessage: (chatId, message) =>
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === chatId
          ? { ...chat, messages: [...(chat.messages ?? []), message] }
          : chat,
      ),
    })),
  updateStreamingMessage: (chatId, content) =>
    set((state) => ({
      chats: state.chats.map((chat) => {
        if (chat.id !== chatId) {
          return chat;
        }

        const nextMessages = [...(chat.messages ?? [])];
        if (!nextMessages.length) {
          return { ...chat, messages: [{ role: "model", content, streaming: true }] };
        }

        const lastIndex = nextMessages.length - 1;
        const lastMessage = nextMessages[lastIndex];
        if (lastMessage?.role === "model") {
          nextMessages[lastIndex] = { ...lastMessage, content, streaming: true };
        } else {
          nextMessages.push({ role: "model", content, streaming: true });
        }

        return { ...chat, messages: nextMessages };
      }),
    })),
  saveFinalMessage: (chatId, message) =>
    set((state) => ({
      chats: state.chats.map((chat) => {
        if (chat.id !== chatId) {
          return chat;
        }

        const nextMessages = [...(chat.messages ?? [])];
        if (nextMessages.length && nextMessages[nextMessages.length - 1]?.role === "model") {
          nextMessages[nextMessages.length - 1] = { ...message };
        } else {
          nextMessages.push(message);
        }

        return { ...chat, messages: nextMessages };
      }),
    })),
  setMemory: (memory) => set({ memory }),
  setSettings: (settings) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ...settings,
      },
    })),
}));
