export const INWORLD_TTS_MODEL_ID = "inworld-tts-1.5-max";
export const INWORLD_TTS_DEFAULT_VOICE_ID = "default-exsg-odgaqb9kgydhmbw-w__design-voice-14078e0a";
export const INWORLD_TTS_ALAKH_VOICE_ID = "default-exsg-odgaqb9kgydhmbw-w__alakh";

export const DEFAULT_SPEAKING_RATE = 0.96;
export const DEFAULT_TEMPERATURE = 1.29;

export const ALAKH_SPEAKING_RATE = 0.91;
export const ALAKH_TEMPERATURE = 1.09;

export type TtsVoicePreset = {
  id: string;
  key: "swara" | "alakh";
  label: string;
};

export const TTS_VOICE_PRESETS: TtsVoicePreset[] = [
  {
    id: INWORLD_TTS_DEFAULT_VOICE_ID,
    key: "swara",
    label: "Swara",
  },
  {
    id: INWORLD_TTS_ALAKH_VOICE_ID,
    key: "alakh",
    label: "Alakh (Male)",
  },
];

export function resolveVoiceProfile(voiceId: string) {
  if (voiceId === INWORLD_TTS_ALAKH_VOICE_ID) {
    return {
      voiceId,
      speakingRate: ALAKH_SPEAKING_RATE,
      temperature: ALAKH_TEMPERATURE,
    };
  }

  return {
    voiceId,
    speakingRate: DEFAULT_SPEAKING_RATE,
    temperature: DEFAULT_TEMPERATURE,
  };
}
