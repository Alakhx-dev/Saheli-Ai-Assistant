import React, { memo, useEffect, useRef, useState } from "react";
import { DoorOpen, Heart, Pencil, Trash2 } from "lucide-react";

export interface ChatSessionListItem {
  id: string;
  title: string;
}

interface SidebarProps {
  isOpen: boolean;
  chatSessions: ChatSessionListItem[];
  currentChatId: string | null;
  isGuest: boolean;
  newChatLabel: string;
  recentChatsLabel: string;
  noChatsGuestLabel: string;
  noChatsAccountLabel: string;
  userName: string;
  userPhotoUrl?: string;
  userEmail?: string;
  resolveChatTitle: (title: string) => string;
  onCreateChat: () => void | Promise<void>;
  onSelectChat: (chatId: string) => void | Promise<void>;
  onDeleteChat: (chatId: string) => void | Promise<void>;
  onRenameChat: (chatId: string, newTitle: string) => void | Promise<void>;
  onCloseSidebar?: () => void;
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
        isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
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
  newChatLabel,
  recentChatsLabel,
  noChatsGuestLabel,
  noChatsAccountLabel,
  userName,
  userPhotoUrl,
  userEmail,
  resolveChatTitle,
  onCreateChat,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
  onCloseSidebar,
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

  return (
    <>
      <div
        onClick={onCloseSidebar}
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity duration-300 md:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-white/10 bg-[#1e1e1e] transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-2 text-white/80">
          <Heart className="h-5 w-5" />
          <span className="text-sm font-semibold tracking-[0.14em] uppercase">Saheli AI</span>
        </div>
        <button
          type="button"
          onClick={() => void onCreateChat()}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80 transition hover:border-white/20 hover:bg-white/10"
        >
          {newChatLabel}
        </button>
      </div>

      <div className="scrollbar-hide flex-1 overflow-y-auto scroll-smooth p-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">{recentChatsLabel}</div>
        {chatSessions.length === 0 ? (
          <p className="px-2 py-3 text-sm text-white/45">{isGuest ? noChatsGuestLabel : noChatsAccountLabel}</p>
        ) : (
          <div className="space-y-1.5">
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

      <div className="mt-auto border-t border-white/10 p-3">
        <div
          className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 transition hover:bg-white/5"
          title={userEmail || ""}
        >
          <div className="flex min-w-0 items-center gap-2">
            {userPhotoUrl ? (
              <img
                src={userPhotoUrl}
                alt="avatar"
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                {profileInitial}
              </div>
            )}
            <span className="max-w-[120px] truncate text-sm font-medium text-white/85">
              {userName || "User"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void onLogout()}
            className="rounded-md p-1 text-red-400 transition hover:bg-white/5 hover:text-red-500"
            title="Sign out"
            aria-label="Sign out"
          >
            <DoorOpen className="h-4 w-4" />
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}
