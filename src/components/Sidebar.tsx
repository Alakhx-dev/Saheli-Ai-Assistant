import React, { memo, useEffect, useRef, useState } from "react";
import { Heart, LogOut, Moon, Pencil, Settings, Sun, Trash2, Volume2, VolumeX } from "lucide-react";

export interface ChatSessionListItem {
  id: string;
  title: string;
}

interface SidebarProps {
  isOpen: boolean;
  chatSessions: ChatSessionListItem[];
  currentChatId: string | null;
  isGuest: boolean;
  isMuted: boolean;
  isSpeaking?: boolean;
  isLightMode: boolean;
  newChatLabel: string;
  recentChatsLabel: string;
  noChatsGuestLabel: string;
  noChatsAccountLabel: string;
  muteLabel: string;
  unmuteLabel: string;
  settingsLabel: string;
  logoutLabel: string;
  themeLabel: string;
  lightModeLabel: string;
  darkModeLabel: string;
  userName: string;
  userPhotoUrl?: string;
  userEmail?: string;
  resolveChatTitle: (title: string) => string;
  onCreateChat: () => void | Promise<void>;
  onSelectChat: (chatId: string) => void | Promise<void>;
  onDeleteChat: (chatId: string) => void | Promise<void>;
  onRenameChat: (chatId: string, newTitle: string) => void | Promise<void>;
  onCloseSidebar?: () => void;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onToggleThemeMode: () => void;
  onLogout: () => void | Promise<void>;
}

interface ChatItemProps {
  chat: ChatSessionListItem;
  isActive: boolean;
  title: string;
  editingId: string | null;
  editingTitle: string;
  onSelectChat: (chatId: string) => void | Promise<void>;
  onStartEdit: (chatId: string, title: string) => void;
  onEditingTitleChange: (value: string) => void;
  onCancelEdit: () => void;
  onCommitEdit: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void | Promise<void>;
}

const ChatItem = memo(function ChatItem({
  chat,
  isActive,
  title,
  editingId,
  editingTitle,
  onSelectChat,
  onStartEdit,
  onEditingTitleChange,
  onCancelEdit,
  onCommitEdit,
  onDeleteChat,
}: ChatItemProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = editingId === chat.id;

  useEffect(() => {
    if (!isEditing || !inputRef.current) {
      return;
    }

    inputRef.current.focus();
    inputRef.current.select();
  }, [isEditing]);

  return (
    <div
      className={`group flex items-center justify-between rounded-lg px-3 py-2 transition duration-200 ${
        isActive
          ? "bg-pink-500/10 border border-pink-500/15 text-white"
          : "text-white/70 hover:bg-gradient-to-r hover:from-pink-500/5 hover:to-fuchsia-500/5 hover:text-white"
      }`}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          value={editingTitle}
          onChange={(event) => onEditingTitleChange(event.target.value)}
          onBlur={onCancelEdit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onCommitEdit(chat.id);
            }
            if (event.key === "Escape") {
              event.preventDefault();
              onCancelEdit();
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none"
          autoFocus
        />
      ) : (
        <button
          type="button"
          onClick={() => void onSelectChat(chat.id)}
          onDoubleClick={() => onStartEdit(chat.id, title)}
          className="min-w-0 flex-1 truncate text-left text-sm"
        >
          {title}
        </button>
      )}

      <div className="ml-2 flex items-center gap-1">
        {!isEditing ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onStartEdit(chat.id, title);
            }}
            aria-label="Rename chat"
            className="rounded-md p-1 text-white/45 opacity-0 transition duration-200 hover:bg-white/10 hover:text-white group-hover:opacity-100"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            void onDeleteChat(chat.id);
          }}
          aria-label="Delete chat"
          className="rounded-md p-1 text-red-400 opacity-0 transition duration-200 hover:text-red-500 group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
});

export default function Sidebar({
  isOpen,
  chatSessions,
  currentChatId,
  isGuest,
  isMuted,
  isSpeaking = false,
  isLightMode,
  newChatLabel,
  recentChatsLabel,
  noChatsGuestLabel,
  noChatsAccountLabel,
  muteLabel,
  unmuteLabel,
  settingsLabel,
  logoutLabel,
  themeLabel,
  lightModeLabel,
  darkModeLabel,
  userName,
  userPhotoUrl,
  userEmail,
  resolveChatTitle,
  onCreateChat,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
  onCloseSidebar,
  onToggleMute,
  onOpenSettings,
  onToggleThemeMode,
  onLogout,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const handleStartEdit = (chatId: string, title: string) => {
    setEditingId(chatId);
    setEditingTitle(title);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  const handleCommitEdit = async (chatId: string) => {
    const nextTitle = editingTitle.trim();
    if (!nextTitle) {
      handleCancelEdit();
      return;
    }

    await onRenameChat(chatId, nextTitle);
    handleCancelEdit();
  };

  const profileInitial = (userName.trim() || "User").charAt(0).toUpperCase();
  const sidebarTone = isLightMode
    ? "border-neutral-300/70 bg-[#f5f6f8]/92 text-neutral-900"
    : "border-pink-500/10 bg-[#0a0a0f]/95 text-white";
  const surfaceTone = isLightMode ? "border-neutral-300/80 bg-white/95" : "border-pink-500/10 bg-[#1a0a14]/40";
  const rowTone = isLightMode
    ? "text-neutral-700 hover:bg-neutral-200/80 hover:text-neutral-900"
    : "text-neutral-300 hover:bg-pink-500/5 hover:text-white";
  const subtleTextTone = isLightMode ? "text-neutral-500" : "text-white/45";
  const defaultTextTone = isLightMode ? "text-neutral-900" : "text-white";
  const profileBorderTone = isLightMode ? "border-neutral-300/80" : "border-pink-500/10";
  const dividerTone = isLightMode ? "border-neutral-300/80" : "border-pink-500/10";

  return (
    <>
      <div
        onClick={onCloseSidebar}
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity duration-300 md:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-72 flex-col border-r backdrop-blur-xl transition-transform duration-300 ${sidebarTone} ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-pink-500/10 px-6 pb-4 pt-6">
          <div className="mb-5 flex items-center justify-start gap-2">
            <Heart className="h-4 w-4 shrink-0 text-[#FF69B4]" fill="currentColor" />
            <div
              className={`text-base font-bold tracking-tight ${
                isLightMode
                  ? "text-neutral-900"
                  : "text-white drop-shadow-[0_0_8px_rgba(255,140,255,0.3)]"
              }`}
              style={{ fontFamily: "'Lexend', 'Outfit', system-ui, sans-serif" }}
            >
              Saheli Ai
            </div>
          </div>

          <button
            type="button"
            onClick={() => void onCreateChat()}
            className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
              isLightMode
                ? "border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100"
                : "border-pink-500/15 bg-pink-500/5 text-white hover:bg-pink-500/10"
            }`}
          >
            {newChatLabel}
          </button>
        </div>

        <div className="scrollbar-hide flex-1 overflow-y-auto scroll-smooth px-3 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className={`px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest ${isLightMode ? "text-neutral-500" : "text-neutral-500"}`}>
            {recentChatsLabel}
          </div>
          {chatSessions.length === 0 ? (
            <p className={`px-2 py-3 text-sm ${subtleTextTone}`}>{isGuest ? noChatsGuestLabel : noChatsAccountLabel}</p>
          ) : (
            <div className="space-y-0">
              {chatSessions.map((chat) => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={currentChatId === chat.id}
                  title={resolveChatTitle(chat.title)}
                  editingId={editingId}
                  editingTitle={editingTitle}
                  onSelectChat={onSelectChat}
                  onStartEdit={handleStartEdit}
                  onEditingTitleChange={setEditingTitle}
                  onCancelEdit={handleCancelEdit}
                  onCommitEdit={handleCommitEdit}
                  onDeleteChat={onDeleteChat}
                />
              ))}
            </div>
          )}
        </div>

        <div className={`mt-auto border-t p-3 ${dividerTone}`}>
          <div className={`rounded-2xl border p-3 backdrop-blur-md ${surfaceTone}`}>
            <div className="flex items-center gap-3" title={userEmail || ""}>
              {userPhotoUrl ? (
                <img
                  src={userPhotoUrl}
                  alt="avatar"
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                    isLightMode ? "bg-neutral-200 text-neutral-800" : "bg-white/10 text-white"
                  }`}
                >
                  {profileInitial}
                </div>
              )}
              <div className="min-w-0">
                <p className={`truncate text-sm font-semibold ${defaultTextTone}`}>{userName || "User"}</p>
                <p className={`truncate text-xs ${subtleTextTone}`}>{userEmail || "guest@saheli.ai"}</p>
              </div>
            </div>

            <div className={`mt-3 space-y-1 border-t border-pink-500/8 pt-3 ${profileBorderTone}`}>
              <button
                type="button"
                onClick={onToggleMute}
                aria-label={isMuted ? unmuteLabel : muteLabel}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition ${rowTone}`}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4 shrink-0 text-pink-300/60" />
                ) : (
                  <div className="relative flex h-4 w-4 items-center justify-center">
                    {isSpeaking ? (
                      <span className="absolute inline-flex h-4 w-4 rounded-full bg-pink-400/30 animate-ping" />
                    ) : null}
                    <Volume2 className={`h-4 w-4 shrink-0 ${isSpeaking ? "text-pink-300" : "text-pink-300/60"}`} />
                  </div>
                )}
                <span>{isMuted ? unmuteLabel : muteLabel}</span>
              </button>
              <button
                type="button"
                onClick={onOpenSettings}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition ${rowTone}`}
              >
                <Settings className="h-4 w-4 shrink-0 text-pink-300/60" />
                <span>{settingsLabel}</span>
              </button>
              <button
                type="button"
                onClick={onToggleThemeMode}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition ${rowTone}`}
              >
                {isLightMode ? <Sun className="h-4 w-4 shrink-0 text-neutral-400" /> : <Moon className="h-4 w-4 shrink-0 text-pink-300/60" />}
                <span>{themeLabel}: {isLightMode ? lightModeLabel : darkModeLabel}</span>
              </button>
              <button
                type="button"
                onClick={() => void onLogout()}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition ${rowTone}`}
              >
                <LogOut className="h-4 w-4 shrink-0 text-pink-300/60" />
                <span>{logoutLabel}</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
