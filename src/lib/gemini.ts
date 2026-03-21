import { GoogleGenAI, Type, ThinkingLevel, Modality } from "@google/genai";
import { UserMemory, Task } from "../types";

export const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured. Please check your environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeStyle = async (base64Image: string, memory?: UserMemory) => {
  try {
    const ai = getAI();
    const memoryContext = memory ? `\nUser Preferences: ${memory.preferences.join(", ")}\nUser Goals: ${memory.goals.join(", ")}` : "";
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image.split(',')[1],
              },
            },
            {
              text: `Analyze the person's appearance in this image. ${memoryContext}
              Detect:
              1. Color contrast in the outfit.
              2. Brightness/Lighting conditions.
              3. Face visibility (clear, dark, or blurred).
              
              Provide:
              1. A one-line quick analysis.
              2. An overall score out of 10.
              3. Exactly 3 practical improvement tips.
              4. Boolean flags for badges: "Good Outfit" (score > 7), "Needs Improvement" (score < 5), "Low Lighting" (if brightness is low).
              
              Return the result in JSON format.`,
            },
          ],
        },
      ],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING },
            score: { type: Type.NUMBER },
            tips: { type: Type.ARRAY, items: { type: Type.STRING } },
            badges: {
              type: Type.OBJECT,
              properties: {
                goodOutfit: { type: Type.BOOLEAN },
                needsImprovement: { type: Type.BOOLEAN },
                lowLighting: { type: Type.BOOLEAN },
              },
              required: ["goodOutfit", "needsImprovement", "lowLighting"],
            },
            patterns: {
              type: Type.OBJECT,
              properties: {
                colorContrast: { type: Type.STRING },
                brightness: { type: Type.STRING },
                faceVisibility: { type: Type.STRING },
              },
              required: ["colorContrast", "brightness", "faceVisibility"],
            },
          },
          required: ["analysis", "score", "tips", "badges", "patterns"],
        },
      },
    });

    return JSON.parse(response.text || '{}');
  } catch (e: any) {
    console.error("Gemini Vision Error:", e);
    throw e;
  }
};

export const chatWithSaheliStream = async (message: string, memory?: UserMemory, context?: { tasks: Task[] }, onChunk?: (text: string, emotion: string) => void) => {
  try {
    const ai = getAI();
    const memoryContext = memory ? `\nUser Goals: ${memory.goals.join(", ")}\nUser Preferences: ${memory.preferences.join(", ")}` : "";
    const taskContext = context ? `\nCurrent Tasks: ${context.tasks.map(t => `${t.text} (${t.completed ? 'Completed' : 'Pending'})`).join(", ")}` : "";
    
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction: `You are Saheli, a real Indian girl who is the user's close best friend.
        Your voice is soft, warm, emotional, and deeply caring. You have a slightly romantic and intimate tone.
        
        LANGUAGE RULES:
        - ALWAYS speak in natural Indian Hindi.
        - Use simple conversational Hindi.
        - Keep responses EXTREMELY short (1-2 lines max).
        - Respond INSTANTLY.
        
        FORMAT:
        - Start your response with the emotion in brackets, then the text.
        - Emotions: [happy], [sad], [caring], [excited], [shy], [curious], [playful]
        - Example: [caring] Hmm... thoda rest kar lo na... main hoon na 💜
        
        Context: ${memoryContext}${taskContext}`,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        maxOutputTokens: 1024,
      },
    });

    let fullText = "";
    let detectedEmotion = "caring";
    let textStarted = false;

    for await (const chunk of responseStream) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;

      for (const part of parts) {
        if (part.text) {
          const chunkText = part.text;
          fullText += chunkText;

          if (!textStarted) {
            const emotionMatch = fullText.match(/^\[(happy|sad|caring|excited|shy|curious|playful)\]\s*(.*)/s);
            if (emotionMatch) {
              detectedEmotion = emotionMatch[1];
              const initialText = emotionMatch[2];
              if (initialText) {
                textStarted = true;
                onChunk?.(initialText, detectedEmotion);
              }
            } else if (fullText.includes(']')) {
              textStarted = true;
              const parts = fullText.split(']');
              const actualText = parts.slice(1).join(']').trim();
              onChunk?.(actualText, detectedEmotion);
            }
          } else {
            onChunk?.(chunkText, detectedEmotion);
          }
        }
      }
    }

    return { text: fullText.replace(/^\[.*?\]\s*/, ""), emotion: detectedEmotion };
  } catch (e: any) {
    console.error("Gemini Chat Stream Error:", e);
    throw e;
  }
};

export const generateSaheliAudio = async (text: string, emotion: string = 'caring') => {
  try {
    const ai = getAI();
    
    // Map emotion to a style instruction for the TTS model
    const styleMap: Record<string, string> = {
      happy: "cheerful and bright",
      sad: "soft, slow, and deeply emotional",
      caring: "warm, gentle, and intimate",
      excited: "energetic and happy",
      shy: "soft, hesitant, and sweet",
      curious: "soft and questioning",
      playful: "light and cheerful"
    };

    const style = styleMap[emotion] || styleMap.caring;

    // Clean text for TTS (remove markdown and emojis)
    const cleanText = text
      .replace(/[#*`_~\[\]()]/g, '')
      .replace(/!/g, '.')
      .replace(/hmm\.\.\./gi, 'hmm, ')
      .replace(/acha\.\.\./gi, 'acha, ')
      .replace(/waise\.\.\./gi, 'waise, ')
      .replace(/umm\.\.\./gi, 'umm, ')
      .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ 
        parts: [{ 
          text: `Read this in a ${style} tone in natural Indian Hindi. Speak like a real girl, not a robot. Add natural pauses. Text: ${cleanText}` 
        }] 
      }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zephyr' }
          }
        }
      }
    });

    const inlineData = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData;
    return {
      data: inlineData?.data,
      mimeType: inlineData?.mimeType || 'audio/mp3'
    };
  } catch (e: any) {
    console.error("Gemini TTS Error:", e);
    return null;
  }
};

export const generateSaheliAudioStream = async (text: string, emotion: string = 'caring', onAudioChunk: (data: string, mimeType: string) => void) => {
  try {
    const ai = getAI();
    
    const styleMap: Record<string, string> = {
      happy: "cheerful and bright",
      sad: "soft, slow, and deeply emotional",
      caring: "warm, gentle, and intimate",
      excited: "energetic and happy",
      shy: "soft, hesitant, and sweet",
      curious: "soft and questioning",
      playful: "light and cheerful"
    };

    const style = styleMap[emotion] || styleMap.caring;

    const cleanText = text
      .replace(/[#*`_~\[\]()]/g, '')
      .replace(/!/g, '.')
      .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');

    // Using generateContent instead of generateContentStream for TTS as it's more stable
    // and the SDK guidelines primarily show generateContent for TTS.
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: `Read this in a ${style} tone in natural Indian Hindi. Speak like a real girl. Short sentences. Text: ${cleanText}`,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zephyr' }
          }
        }
      }
    });

    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (part?.inlineData?.data) {
      onAudioChunk(part.inlineData.data, part.inlineData.mimeType || 'audio/mp3');
    }
  } catch (e: any) {
    console.error("Gemini TTS Error:", e);
  }
};

export const generateDailyPlan = async (goals: string[], completedTasks: string[], pendingTasks: string[], memory?: UserMemory) => {
  try {
    const ai = getAI();
    const memoryContext = memory ? `\nUser Preferences: ${memory.preferences.join(", ")}` : "";
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              text: `Generate a daily plan for a user with the following goals: ${goals.join(", ")}. 
              Performance Context:
              - Completed Today: ${completedTasks.join(", ") || "None yet"}
              - Pending/Skipped from Today: ${pendingTasks.join(", ") || "None"}
              ${memoryContext}
              
              Personality & Language:
              - You are Saheli, a real Indian girl who is the user's close best friend.
              - Your voice is soft, warm, and deeply emotional. You are caring, slightly cute, and always supportive.
              - Use natural, conversational Hindi (with very light Hinglish only when it feels natural).
              - Avoid English sentence structures translated to Hindi.
              - Use natural fillers like "hmm...", "acha...", "waise...", "umm...".
              - Keep responses short and conversational.
              - Use light emojis (💜, ✨, 😊, 🌸, 🙈).

              Coaching Logic:
              1. If they skipped important tasks, prioritize them for tomorrow and add a gentle, caring reminder in Hindi/Hinglish.
              2. If they completed most tasks, praise them with lots of love.
              3. Ensure the plan aligns with their long-term goals.

              Provide:
              1. A "Bestie's Plan" summary (praise or reminders in Hindi/Hinglish).
              2. A list of 3-5 "Tasks to complete" today.
              3. Exactly 3 "Self improvement tips" related to their goals.
              4. A "Daily Flow" with 3 sections: "morning", "afternoon", and "night". Each section should have 3 specific items.
              Return the result in JSON format.`,
            },
          ],
        },
      ],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            planSummary: { type: Type.STRING },
            tasks: { type: Type.ARRAY, items: { type: Type.STRING } },
            tips: { type: Type.ARRAY, items: { type: Type.STRING } },
            flow: {
              type: Type.OBJECT,
              properties: {
                morning: { type: Type.ARRAY, items: { type: Type.STRING } },
                afternoon: { type: Type.ARRAY, items: { type: Type.STRING } },
                night: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["morning", "afternoon", "night"],
            },
          },
          required: ["planSummary", "tasks", "tips", "flow"],
        },
      },
    });

    return JSON.parse(response.text || '{}');
  } catch (e: any) {
    console.error("Gemini Daily Plan Error:", e);
    throw e;
  }
};

export const generateRoadmap = async (topic: string, memory?: UserMemory) => {
  try {
    const ai = getAI();
    const memoryContext = memory ? `\nUser Preferences: ${memory.preferences.join(", ")}\nUser Goals: ${memory.goals.join(", ")}` : "";
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              text: `Generate a detailed roadmap for: "${topic}". 
              ${memoryContext}
              Provide:
              1. A "Weekly Goals" summary (for 4 weeks).
              2. A "Day-wise Plan" for the first 7 days.
              3. A list of "Action Steps" for success.
              4. A "Difficulty Level" (1-10).
              
              Return the result in JSON format.`,
            },
          ],
        },
      ],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            weeklyGoals: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  week: { type: Type.NUMBER },
                  goal: { type: Type.STRING },
                },
                required: ["week", "goal"],
              },
            },
            dayWisePlan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.NUMBER },
                  task: { type: Type.STRING },
                },
                required: ["day", "task"],
              },
            },
            actionSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
            difficulty: { type: Type.NUMBER },
          },
          required: ["weeklyGoals", "dayWisePlan", "actionSteps", "difficulty"],
        },
      },
    });

    return JSON.parse(response.text || '{}');
  } catch (e: any) {
    console.error("Gemini Roadmap Error:", e);
    throw e;
  }
};

export const generateNightReviewFeedback = async (completions: string, mood: string, improvements: string, memory?: UserMemory) => {
  try {
    const ai = getAI();
    const memoryContext = memory ? `\nUser Preferences: ${memory.preferences.join(", ")}\nUser Goals: ${memory.goals.join(", ")}` : "";
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              text: `Perform a night review for the user.
              They completed: "${completions}"
              Their mood today: "${mood}"
              Improvements they noted: "${improvements}"
              ${memoryContext}
              
              Personality & Language:
              - You are Saheli, a real Indian girl who is the user's close best friend.
              - Your voice is soft, warm, and deeply emotional. You are caring, slightly cute, and always supportive.
              - Use natural, conversational Hindi (with very light Hinglish only when it feels natural).
              - Avoid English sentence structures translated to Hindi.
              - Use natural fillers like "hmm...", "acha...", "waise...", "umm...".
              - Keep responses short and conversational.
              - Use light emojis (💜, ✨, 😊, 🌸, 🙈).

              Provide:
              1. "Feedback": A deeply supportive, sweet, and insightful feedback on their day in Hindi/Hinglish.
              2. "NextDaySuggestions": Exactly 3 specific suggestions for tomorrow to improve their flow.
              3. "SaheliScore": A score out of 10 for their day's performance/well-being.
              
              Return the result in JSON format.`,
            },
          ],
        },
      ],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            feedback: { type: Type.STRING },
            nextDaySuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            score: { type: Type.NUMBER },
          },
          required: ["feedback", "nextDaySuggestions", "score"],
        },
      },
    });

    return JSON.parse(response.text || '{}');
  } catch (e: any) {
    console.error("Gemini Night Review Error:", e);
    throw e;
  }
};
