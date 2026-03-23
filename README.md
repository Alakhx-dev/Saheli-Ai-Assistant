# Saheli AI - Your Premium Personal Assistant 🌟

A premium AI-powered personal assistant with emotional voice interaction, built with React, TypeScript, and modern web technologies.

## ✨ Features

### 🔐 Authentication
- Secure localStorage-based authentication
- Session persistence
- Profile management with picture upload
- Password management

### 💬 Chat Assistant
- Clean, modern chat interface
- Multiple conversation support
- Voice input integration
- Real-time typing indicators
- Message history

### 🎤 Voice Assistant (Live Talk)
- High-quality Indian voices (Hindi/English)
- Emotional, soft tone (not robotic)
- Natural pacing with pauses
- Instant response (zero delay)
- Gender-based voice selection

### ⚙️ Settings
- Profile customization (name, picture, password)
- Theme toggle (Dark/Light)
- Language selection (English/Hindi)
- Voice type selection (Male/Female)
- Easy access from header

### 🎨 Premium UI/UX
- Soft glassmorphism design
- Smooth micro-animations
- Clean typography
- Responsive layout
- Professional, unique design (not template-like)

## 🚀 Quick Start

### Installation
```bash
npm install
# or
bun install
```

### Development
```bash
npm run dev
# or
bun dev
```

### Demo Account
**Email:** demo@saheli.com  
**Password:** demo123

## 🎯 Tech Stack

- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS + Custom CSS
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Voice:** Web Speech API
- **Storage:** LocalStorage
- **Routing:** React Router v6

## 📱 Browser Support

**Best Experience:**
- Chrome 90+
- Edge 90+
- Safari 14+
- Firefox 88+

**Voice Features Work Best In:**
- Chrome (Recommended)
- Edge (Recommended)

## 🎤 Voice System

### Features
- **ALWAYS Hindi voice** (hi-IN) for authentic Indian tone
- **Emotional tone** (rate: 0.85, pitch: 1.1)
- **Natural pacing** (200ms pauses after punctuation)
- **Instant response** (zero delay)
- **Auto voice selection** (Hindi → Indian English → Female)
- **Gender-based selection** (Male/Female)
- **No robotic feel** (soft, human-like delivery)

### Voice Quality
```javascript
rate: 0.85   // Slower, natural (not robotic)
pitch: 1.1   // Soft, feminine tone
volume: 1.0  // Full volume
lang: "hi-IN" // Always Hindi for Indian accent
```

### Supported Voices
**Priority 1: Hindi (hi-IN)**
- Google हिन्दी (Hindi)
- Microsoft Swara (Hindi Female)
- Lekha (Hindi Female)
- Kalpana (Hindi Female)
- Hemant (Hindi Male)

**Priority 2: Indian English (en-IN)**
- Rishi (Indian English)
- Veena (Indian English)
- Neel (Indian English)
- Priya (Indian English)

**Priority 3: Fallback**
- Any female voice
- Default voice

### Testing Voice System
Open browser console (F12) and run:
```javascript
testVoiceSystem()  // Full voice test
listAllVoices()    // List all voices
quickHindiTest()   // Quick Hindi test
```

### Installing Hindi Voices
**Windows 10/11:**
1. Settings → Time & Language → Language
2. Add Hindi (हिन्दी)
3. Install voice pack
4. Restart browser

**macOS:**
1. System Preferences → Accessibility → Speech
2. Manage Voices → Download Lekha/Kalpana
3. Restart browser

**Chrome/Edge:**
- Built-in Google हिन्दी voice (no installation needed)

See [VOICE_SYSTEM.md](./VOICE_SYSTEM.md) for complete guide.

## 🎨 Design Philosophy

- Soft glassmorphism (not heavy blur)
- Subtle gradients (not loud colors)
- Clean spacing and typography
- Micro animations on interactions
- Smooth transitions (250-300ms)
- Neutral dark base with purple/pink accents
- Minimal, professional design

## 📝 Documentation

- [Quick Start Guide](./QUICK_START.md) - Get started quickly
- [Upgrade Complete](./UPGRADE_COMPLETE.md) - Full list of improvements

## 🔒 Security

- All authentication is localStorage-based
- Passwords stored in plain text (for demo purposes)
- Profile pictures stored as base64
- No backend required

## 🎯 Key Improvements

### Authentication
✅ Proper validation (empty fields, password length)  
✅ Session persistence  
✅ Profile management  
✅ Password change  
✅ Profile picture upload  

### UI/UX
✅ Premium glassmorphism design  
✅ Smooth animations everywhere  
✅ Clean, modern interface  
✅ Not template-like  
✅ Responsive on all devices  

### Voice System
✅ Indian voices (Hindi/English)  
✅ Emotional, soft tone  
✅ Natural pacing  
✅ Instant response  
✅ No robotic feel  

### Settings
✅ Easy access (top right header)  
✅ All settings in one place  
✅ Instant updates  
✅ Profile picture support  

## 🎉 Experience

**Before:** Basic template with robotic American voice  
**After:** Premium AI assistant with emotional Indian voice

## 📄 License

MIT License - Feel free to use for personal or commercial projects.

## 🙏 Credits

Built with ❤️ using modern web technologies.

---

**Enjoy your premium Saheli AI experience! 🌟**
