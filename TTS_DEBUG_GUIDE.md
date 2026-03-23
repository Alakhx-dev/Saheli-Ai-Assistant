# 🎤 Vachana TTS Debugging Guide

## ✅ What Was Fixed

### 1. **Comprehensive Debug Logging Added**
- API key presence check
- Request/response logging
- Content-Type detection (JSON vs binary)
- Blob size validation
- Audio event tracking (play, error, ended)
- Autoplay block detection

### 2. **Dual Response Format Support**
- **JSON response**: Extracts `audio_url` and plays
- **Binary blob**: Creates object URL and plays

### 3. **Enhanced Error Handling**
- Try-catch for autoplay blocks
- Empty blob detection
- API error logging with status codes

---

## 🔍 How to Debug (Step-by-Step)

### Step 1: Start Dev Server
```bash
npm run dev
```

### Step 2: Open Browser DevTools
- Press `F12` or `Ctrl+Shift+I`
- Go to **Console** tab

### Step 3: Send a Chat Message
- Type any message in chat
- Click Send button
- Wait for AI response

### Step 4: Check Console Logs

Look for these logs in order:

```
🎤 [Chat] Triggering TTS for response: ...
🎤 [TTS] Starting playback for text: ...
🔑 [TTS] API Key: Present (or MISSING)
📤 [TTS] Sending request to Vachana API...
📥 [TTS] Response status: 200
📥 [TTS] Response headers: {...}
📋 [TTS] Content-Type: audio/mpeg (or application/json)
```

**If JSON response:**
```
📄 [TTS] JSON Response: {audio_url: "..."}
🔗 [TTS] Using audio_url from JSON
▶️ [TTS] Audio playing
🎵 [TTS] Audio.play() called successfully
✅ [TTS] Audio ended
```

**If Binary blob:**
```
🎵 [TTS] Processing audio blob
📦 [TTS] Blob size: 12345 bytes, type: audio/mpeg
🔗 [TTS] Created object URL: blob:...
▶️ [TTS] Audio playing
🎵 [TTS] Audio.play() called successfully
✅ [TTS] Audio ended
```

---

## 🚨 Common Issues & Solutions

### Issue 1: API Key Missing
**Log**: `🔑 [TTS] API Key: MISSING`

**Solution**:
1. Check `.env` file has: `VITE_VACHANA_API_KEY=your_key_here`
2. Restart dev server: `npm run dev`

---

### Issue 2: API Error (401 Unauthorized)
**Log**: `❌ [TTS] API Error: 401 ...`

**Solution**:
- API key is invalid
- Get new key from Vachana dashboard
- Update `.env` file

---

### Issue 3: Autoplay Blocked
**Log**: `❌ [TTS] Autoplay blocked or play error: NotAllowedError`

**Solution**:
- Browser blocks audio without user interaction
- **This is normal** - audio should play after you click Send button
- If still blocked, check browser settings (allow audio autoplay)

---

### Issue 4: Empty Blob
**Log**: `❌ [TTS] Empty audio blob received`

**Solution**:
- API returned 0 bytes
- Check API quota/limits
- Try shorter text

---

### Issue 5: No Audio Playing
**Logs show success but no sound**

**Check**:
1. System volume is up
2. Browser tab is not muted (check tab icon)
3. Check browser audio settings
4. Try headphones to rule out speaker issues

---

### Issue 6: Network Tab Check

**Open DevTools → Network tab**

1. Filter by "vachana"
2. Send a message
3. Check the API call:
   - **Status 200**: ✅ OK
   - **Status 401**: ❌ Wrong API key
   - **Status 429**: ❌ Rate limit exceeded
   - **No request**: ❌ Function not called

---

## 🧪 Test with Static Audio

If you want to test if audio playback works at all:

**Temporary test** (add to `vachanaTTS.ts`):
```typescript
// Test with sample audio
const audio = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
audio.play();
```

If this works → Problem is API response
If this doesn't work → Browser audio issue

---

## ✅ Expected Console Output (Success)

```
🎤 [Chat] Triggering TTS for response: Hmm... suniye na...
🎤 [TTS] Starting playback for text: Hmm... suniye na...
🔑 [TTS] API Key: Present
📤 [TTS] Sending request to Vachana API...
📥 [TTS] Response status: 200
📥 [TTS] Response headers: {content-type: "audio/mpeg", ...}
📋 [TTS] Content-Type: audio/mpeg
🎵 [TTS] Processing audio blob
📦 [TTS] Blob size: 45678 bytes, type: audio/mpeg
🔗 [TTS] Created object URL: blob:http://localhost:5173/abc123
▶️ [TTS] Audio playing
🎵 [TTS] Audio.play() called successfully
✅ [TTS] Audio ended
✅ [Chat] TTS completed
```

---

## 📝 Next Steps

1. **Run `npm run dev`**
2. **Open browser console**
3. **Send a message**
4. **Copy all console logs** (especially TTS logs)
5. **Share logs** if issue persists

---

## 🎯 Quick Checklist

- [ ] `.env` has `VITE_VACHANA_API_KEY`
- [ ] Dev server restarted after adding key
- [ ] Console shows "API Key: Present"
- [ ] API returns status 200
- [ ] Blob size > 0 bytes
- [ ] Audio.play() called successfully
- [ ] System volume is up
- [ ] Browser tab not muted

---

**Ready to test!** 🚀
