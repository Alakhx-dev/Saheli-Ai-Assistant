// Voice System Testing Utility
// Open browser console and run: testVoiceSystem()

import { speak, stopSpeaking } from "@/utils/voice";

export async function testVoiceSystem() {
  console.log("🎤 EDGE TTS SYSTEM TEST");
  console.log("===================\n");

  const testText = "नमस्ते, मैं सहेली हूं। आपकी व्यक्तिगत AI सहायक। मुझे आपसे बात करके बहुत अच्छा लग रहा है।";
  console.log(`📝 Test text: "${testText}"`);
  console.log("🔊 Playing... (listen for soft, emotional tone with Edge TTS SwaraNeural)");
  
  stopSpeaking();
  
  try {
    await speak(testText);
    console.log("✅ Speech completed");
    console.log("");
    console.log("🎯 EXPECTED QUALITY:");
    console.log("  ✓ Soft, feminine tone (hi-IN-SwaraNeural)");
    console.log("  ✓ Natural pacing (not robotic)");
    console.log("  ✓ Emotional delivery");
    console.log("");
  } catch (error) {
    console.error("❌ Speech error:", error);
  }
}

// Make functions available globally for console testing
if (typeof window !== "undefined") {
  (window as any).testVoiceSystem = testVoiceSystem;
  
  console.log("🎤 Voice Testing Utilities Loaded");
  console.log("==================================");
  console.log("Run this command in console:");
  console.log("  testVoiceSystem()  - Full voice system test");
  console.log("");
}
