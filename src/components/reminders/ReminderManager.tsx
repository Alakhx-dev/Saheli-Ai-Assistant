import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Calendar, Clock, Edit2, X } from "lucide-react";
import { useReminderStore, type AssistantReminder } from "@/store/reminder-store";
import { useAppStore } from "@/store/app-store";
import { generateReminderMessage } from "@/lib/ai-service";
import { addReminderWithSync, updateReminderWithSync, deleteReminderWithSync } from "@/lib/memory";
import { format } from "date-fns";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";

const THEME_HEX_MAP: Record<string, string> = {
  pink: "#ff0078",
  yellow: "#FFD700",
  blue: "#00E5FF",
  orchid: "#D500F9",
  peach: "#FF9E7D",
  beige: "#D4B895",
  maroon: "#D01C3F",
  gemini: "#4A89FF",
};

export function getThemeStyles(color: string, customColor: string) {
  const hex = color === "custom" ? customColor : (THEME_HEX_MAP[color] || "#ff0078");
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;

  // Compute HSL lightened value
  const rNormal = r / 255;
  const gNormal = g / 255;
  const bNormal = b / 255;
  const max = Math.max(rNormal, gNormal, bNormal);
  const min = Math.min(rNormal, gNormal, bNormal);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNormal: h = (gNormal - bNormal) / d + (gNormal < bNormal ? 6 : 0); break;
      case gNormal: h = (bNormal - rNormal) / d + 2; break;
      case bNormal: h = (rNormal - gNormal) / d + 4; break;
    }
    h /= 6;
  }
  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const themeLight = `hsl(${hDeg}, ${sPct}%, 88%)`;

  return {
    "--theme-primary": `#${cleanHex}`,
    "--theme-primary-rgb": `${r}, ${g}, ${b}`,
    "--theme-glow": `rgba(${r}, ${g}, ${b}, 0.25)`,
    "--theme-border": `rgba(${r}, ${g}, ${b}, 0.22)`,
    "--theme-soft": `rgba(${r}, ${g}, ${b}, 0.08)`,
    "--theme-soft-hover": `rgba(${r}, ${g}, ${b}, 0.15)`,
    "--theme-light": themeLight,
  } as React.CSSProperties;
}

export default function ReminderManager() {
  const { reminders } = useReminderStore();
  const language = useAppStore((state) => state.settings.language);
  const user = useAppStore((state) => state.user);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  const [selectedColor, setSelectedColor] = useState(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("saheli_theme_color") || "maroon";
    }
    return "maroon";
  });
  const [customColor, setCustomColor] = useState(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("saheli_custom_theme_color") || "#ff0078";
    }
    return "#ff0078";
  });

  useEffect(() => {
    const handleThemeChange = () => {
      setSelectedColor(window.localStorage.getItem("saheli_theme_color") || "maroon");
      setCustomColor(window.localStorage.getItem("saheli_custom_theme_color") || "#ff0078");
    };
    window.addEventListener("saheli_theme_color_changed", handleThemeChange);
    return () => {
      window.removeEventListener("saheli_theme_color_changed", handleThemeChange);
    };
  }, []);

  const themeStyles = useMemo(() => getThemeStyles(selectedColor, customColor), [selectedColor, customColor]);

  const [hour24Str, minuteStr] = (newTime || "12:00").split(':');
  const hour24 = parseInt(hour24Str, 10) || 0;
  const minute = parseInt(minuteStr, 10) || 0;
  const isPM = hour24 >= 12;
  const hour12 = hour24 % 12 || 12;

  const handleTimeChange = (h: number, m: number, pm: boolean) => {
    let h24 = h;
    if (pm && h !== 12) h24 += 12;
    else if (!pm && h === 12) h24 = 0;
    
    const formattedH = String(h24).padStart(2, '0');
    const formattedM = String(m).padStart(2, '0');
    setNewTime(`${formattedH}:${formattedM}`);
  };

  const resetForm = () => {
    setNewTitle("");
    setNewDate("");
    setNewTime("");
    setEditingId(null);
    setIsAdding(false);
  };

  const handleDateChange = (date: Date | undefined) => {
    if (!date) return;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    setNewDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleAddNewClick = () => {
    if (!isAdding || editingId) {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 10);
      
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      setNewDate(`${yyyy}-${mm}-${dd}`);
      
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setNewTime(`${hours}:${minutes}`);
      
      setNewTitle("");
      setEditingId(null);
      setIsAdding(true);
    } else {
      resetForm();
    }
  };

  const handleEdit = (reminder: AssistantReminder) => {
    const d = new Date(reminder.dueTime);
    
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    setNewTitle(reminder.title);
    setNewDate(`${yyyy}-${mm}-${dd}`);
    setNewTime(`${hours}:${minutes}`);
    
    setEditingId(reminder.id);
    setIsAdding(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDate || !newTime) return;

    const dateStr = `${newDate}T${newTime}`;
    const timestamp = new Date(dateStr).getTime();
    
    if (isNaN(timestamp)) {
      alert("Invalid date/time");
      return;
    }

    setIsSaving(true);
    let messageToSave = await generateReminderMessage(newTitle, newTime, "swara", language);
    setIsSaving(false);

    if (editingId) {
      updateReminderWithSync(user, editingId, {
        title: newTitle,
        dueTime: timestamp,
        message: messageToSave,
      });
    } else {
      addReminderWithSync(user, {
        title: newTitle,
        dueTime: timestamp,
        message: messageToSave,
      });
    }

    resetForm();
  };

  const pendingReminders = reminders.filter((r) => !r.isCompleted).sort((a, b) => a.dueTime - b.dueTime);

  return (
    <div className="space-y-4 w-full relative z-10 text-white" style={themeStyles}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold tracking-wide text-white/90 drop-shadow-md">Active Reminders</h3>
        <button
          onClick={handleAddNewClick}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-white/5 border hover:bg-white/10 shadow-[0_4px_15px_rgba(0,0,0,0.2)] transition-all duration-300 cursor-pointer backdrop-blur-[12px]"
          style={{ color: "var(--theme-light)", borderColor: "rgba(255, 255, 255, 0.1)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--theme-primary)";
            e.currentTarget.style.boxShadow = "0 0 10px var(--theme-glow)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {isAdding && !editingId ? (
            <><X className="w-3.5 h-3.5" /> Cancel</>
          ) : (
            <><Plus className="w-3.5 h-3.5" /> Add New</>
          )}
        </button>
      </div>

      {isAdding && (
        <form 
          onSubmit={handleAdd} 
          className="relative p-5 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-[24px] shadow-[0_12px_40px_rgba(0,0,0,0.4)] space-y-4 transition-all duration-300 animate-in fade-in slide-in-from-top-4"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--theme-soft)] to-transparent pointer-events-none rounded-2xl" />
          
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest drop-shadow-sm" style={{ color: "var(--theme-light)" }}>
                {editingId ? "Edit Reminder Title" : "New Reminder Title"}
              </label>
              {editingId && (
                <button type="button" onClick={resetForm} className="text-xs text-white/55 hover:text-white/80 transition-colors cursor-pointer">
                  Cancel Edit
                </button>
              )}
            </div>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Call mom, Take medicine"
                className="w-full bg-white/5 border rounded-full px-4 h-10 text-sm text-white placeholder-white/30 focus:outline-none transition-all duration-300 shadow-sm"
                style={{ border: "1px solid var(--theme-primary)" }}
                onFocus={(e) => {
                  e.target.style.boxShadow = "0 0 12px var(--theme-glow)";
                  e.target.style.backgroundColor = "rgba(255,255,255,0.08)";
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = "none";
                  e.target.style.backgroundColor = "rgba(255,255,255,0.05)";
                }}
                required
                autoFocus
              />
          </div>
          
          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest drop-shadow-sm mb-2" style={{ color: "var(--theme-light)" }}>Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full bg-white/5 border rounded-full px-3 h-10 text-[13px] tracking-tight text-white focus:outline-none transition-all duration-300 flex items-center justify-between cursor-pointer shadow-sm overflow-hidden"
                    style={{ border: "1px solid var(--theme-primary)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "0 0 12px var(--theme-glow)";
                      e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)";
                    }}
                  >
                    <span className={newDate ? "text-white font-semibold whitespace-nowrap" : "text-white/30 whitespace-nowrap"}>
                      {newDate ? format(new Date(`${newDate}T00:00:00`), "dd-MM-yyyy") : "Select date"}
                    </span>
                    <Calendar className="w-3.5 h-3.5 opacity-50 flex-shrink-0 ml-1" style={{ color: "var(--theme-primary)" }} />
                  </button>
                </PopoverTrigger>
                <PopoverContent 
                  side="top" 
                  sideOffset={8} 
                  avoidCollisions={true}
                  className="w-auto p-3 bg-black/40 border border-white/10 rounded-2xl backdrop-blur-xl z-[9999] overflow-hidden" 
                  align="center" 
                  style={{ 
                    ...themeStyles, 
                    borderColor: "var(--theme-primary)",
                    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5), inset 0 0 0 1px var(--theme-glow), 0 0 20px var(--theme-glow)"
                  }}
                >
                  <CalendarUI
                    mode="single"
                    selected={newDate ? new Date(`${newDate}T00:00:00`) : undefined}
                    onSelect={handleDateChange}
                    className="text-white p-0"
                    classNames={{
                      months: "space-y-2",
                      month: "space-y-2",
                      caption: "flex justify-between pt-1 relative items-center mb-1 px-1",
                      caption_label: "text-xs font-bold text-white tracking-wide",
                      nav: "space-x-1 flex items-center relative z-20",
                      nav_button: "h-5 w-5 rounded-md border border-white/10 bg-white/5 text-white/70 hover:bg-white/15 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer",
                      nav_button_previous: "relative left-0",
                      nav_button_next: "relative right-0",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex mb-1",
                      head_cell: "text-[var(--theme-light)] font-bold text-[8px] uppercase tracking-wider w-7 h-7 flex items-center justify-center opacity-60",
                      row: "flex w-full mt-1",
                      cell: "h-7 w-7 text-center text-[10px] p-0 relative flex items-center justify-center",
                      day: "h-7 w-7 p-0 font-medium text-[10px] text-white/80 hover:bg-[var(--theme-soft-hover)] hover:text-white rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer",
                      day_selected: "bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-primary)] focus:bg-[var(--theme-primary)] rounded-lg shadow-[0_0_10px_var(--theme-glow)] border border-white/20 h-7 w-7 text-[10px] font-bold",
                      day_today: "border border-[var(--theme-primary)] text-white bg-white/5 rounded-lg h-7 w-7 text-[10px]",
                      day_outside: "text-white/20 opacity-35 hover:bg-transparent cursor-default",
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest drop-shadow-sm mb-2" style={{ color: "var(--theme-light)" }}>Time</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full bg-white/5 border rounded-full px-3 h-10 text-[13px] tracking-tight text-white focus:outline-none transition-all duration-300 flex items-center justify-between cursor-pointer shadow-sm overflow-hidden"
                    style={{ border: "1px solid var(--theme-primary)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "0 0 12px var(--theme-glow)";
                      e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)";
                    }}
                  >
                    <span className={newTime ? "text-white font-semibold whitespace-nowrap" : "text-white/30 whitespace-nowrap"}>
                      {newTime ? format(new Date(`2000-01-01T${newTime}:00`), "h:mm a") : "Select time"}
                    </span>
                    <Clock className="w-3.5 h-3.5 opacity-50 flex-shrink-0 ml-1" style={{ color: "var(--theme-primary)" }} />
                  </button>
                </PopoverTrigger>
                <PopoverContent 
                  side="top" 
                  sideOffset={8} 
                  avoidCollisions={true}
                  className="w-auto p-4 bg-[#0a0515]/80 border border-white/10 rounded-3xl backdrop-blur-2xl z-[9999] overflow-hidden" 
                  align="center" 
                  style={{ 
                    ...themeStyles, 
                    borderColor: "var(--theme-primary)",
                    boxShadow: "0 15px 50px rgba(0, 0, 0, 0.6), inset 0 0 0 1px var(--theme-glow), 0 0 25px var(--theme-glow)"
                  }}
                >
                  <div className="flex items-stretch justify-center gap-2.5 h-[190px] text-white">
                    {/* Hours Column */}
                    <div 
                      className="flex flex-col w-[52px] overflow-y-auto snap-y snap-mandatory bg-black/50 rounded-[20px] border border-white/5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shadow-[inset_0_4px_25px_rgba(0,0,0,0.9)]"
                      style={{ WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)' }}
                    >
                      <div className="flex-none h-[75px]" />
                      {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(h => (
                        <button
                          key={`h-${h}`}
                          type="button"
                          onClick={() => handleTimeChange(h, minute, isPM)}
                          className={`flex-none h-10 w-full flex items-center justify-center text-[13px] snap-center transition-all duration-300 ${
                            hour12 === h 
                              ? 'bg-[var(--theme-primary)] font-extrabold text-white shadow-[0_0_15px_var(--theme-glow)] rounded-xl scale-110 z-10 border border-white/20' 
                              : 'text-white/35 font-semibold scale-90 hover:text-white/70 hover:scale-100 hover:bg-white/10 rounded-xl'
                          }`}
                          ref={(el) => {
                            if (el && hour12 === h && !el.dataset.scrolled) {
                              el.scrollIntoView({ block: 'center' });
                              el.dataset.scrolled = 'true';
                            }
                          }}
                        >
                          {String(h).padStart(2, '0')}
                        </button>
                      ))}
                      <div className="flex-none h-[75px]" />
                    </div>

                    <div className="flex items-center justify-center font-bold text-[var(--theme-primary)] opacity-70 pb-1 text-xl drop-shadow-[0_0_5px_var(--theme-glow)]">:</div>

                    {/* Minutes Column */}
                    <div 
                      className="flex flex-col w-[52px] overflow-y-auto snap-y snap-mandatory bg-black/50 rounded-[20px] border border-white/5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shadow-[inset_0_4px_25px_rgba(0,0,0,0.9)]"
                      style={{ WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)' }}
                    >
                      <div className="flex-none h-[75px]" />
                      {Array.from({ length: 60 }, (_, i) => i).map(m => (
                        <button
                          key={`m-${m}`}
                          type="button"
                          onClick={() => handleTimeChange(hour12, m, isPM)}
                          className={`flex-none h-10 w-full flex items-center justify-center text-[13px] snap-center transition-all duration-300 ${
                            minute === m 
                              ? 'bg-[var(--theme-primary)] font-extrabold text-white shadow-[0_0_15px_var(--theme-glow)] rounded-xl scale-110 z-10 border border-white/20' 
                              : 'text-white/35 font-semibold scale-90 hover:text-white/70 hover:scale-100 hover:bg-white/10 rounded-xl'
                          }`}
                          ref={(el) => {
                            if (el && minute === m && !el.dataset.scrolled) {
                              el.scrollIntoView({ block: 'center' });
                              el.dataset.scrolled = 'true';
                            }
                          }}
                        >
                          {String(m).padStart(2, '0')}
                        </button>
                      ))}
                      <div className="flex-none h-[75px]" />
                    </div>

                    <div className="w-1" />

                    {/* AM/PM Column */}
                    <div className="flex flex-col w-[52px] gap-2.5 justify-center">
                      {['AM', 'PM'].map(ampm => (
                        <button
                          key={ampm}
                          type="button"
                          onClick={() => handleTimeChange(hour12, minute, ampm === 'PM')}
                          className={`flex-1 max-h-[85px] flex items-center justify-center rounded-[18px] text-[11px] font-extrabold tracking-wide transition-all duration-300 border ${
                            (isPM && ampm === 'PM') || (!isPM && ampm === 'AM')
                              ? 'bg-[var(--theme-primary)] text-white shadow-[0_0_15px_var(--theme-glow)] border-[var(--theme-primary)] scale-105 z-10'
                              : 'bg-black/50 text-white/35 border-white/5 hover:bg-white/10 hover:text-white/80 scale-95 shadow-[inset_0_2px_10px_rgba(0,0,0,0.6)]'
                          }`}
                        >
                          {ampm}
                        </button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-2.5 mt-2 text-white font-bold tracking-wide rounded-full text-sm transition-all duration-300 cursor-pointer active:scale-[0.98] border border-white/10 relative z-10 backdrop-blur-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, var(--theme-primary) 0%, rgba(var(--theme-primary-rgb), 0.7) 100%)",
              boxShadow: "0 4px 15px var(--theme-glow)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(var(--theme-primary-rgb), 0.45)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 4px 15px var(--theme-glow)";
              e.currentTarget.style.transform = "none";
            }}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Thinking...
              </>
            ) : editingId ? "Update Reminder" : "Save Reminder"}
          </button>
        </form>
      )}

      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 saheli-scrollbar pt-2">
        {pendingReminders.length === 0 ? (
          <div className="text-center py-8 text-white/30 text-sm font-medium italic border border-dashed border-white/10 rounded-2xl bg-black/10 backdrop-blur-md">
            No active reminders
          </div>
        ) : (
          pendingReminders.map((reminder) => (
            <div 
              key={reminder.id} 
              className="relative flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-[16px] shadow-[0_4px_15px_rgba(0,0,0,0.2)] transition-all duration-300 group overflow-hidden"
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(var(--theme-primary-rgb), 0.35)";
                e.currentTarget.style.boxShadow = "0 8px 25px var(--theme-glow)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.05)";
                e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";
              }}
            >
              <div 
                className="absolute inset-0 bg-gradient-to-r transition-opacity duration-500 opacity-0 group-hover:opacity-100 pointer-events-none" 
                style={{
                  backgroundImage: "linear-gradient(90deg, var(--theme-soft) 0%, transparent 100%)"
                }}
              />
              
              <div 
                className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-300"
                style={{ backgroundColor: "var(--theme-primary)" }}
              />
              
              <div className="relative flex flex-col gap-1.5 z-10 pl-1">
                <span className="text-[14px] font-bold text-white tracking-wide drop-shadow-sm">{reminder.title}</span>
                <div className="flex items-center gap-3.5 text-[11px] font-medium text-white/50">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 opacity-70" style={{ color: "var(--theme-primary)" }} /> 
                    {new Date(reminder.dueTime).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 opacity-70" style={{ color: "var(--theme-primary)" }} /> 
                    {new Date(reminder.dueTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              
              <div className="relative z-10 flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                <button
                  onClick={() => handleEdit(reminder)}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/15 hover:text-white hover:border-white/20 transition-all duration-200 cursor-pointer backdrop-blur-sm shadow-sm flex items-center"
                  title="Edit Reminder"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteReminderWithSync(user, reminder.id)}
                  className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-200 hover:border-red-500/35 transition-all duration-200 cursor-pointer backdrop-blur-sm shadow-sm flex items-center"
                  title="Delete Reminder"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
