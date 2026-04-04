interface SendSwaraMessageOptions {
  text: string;
}

// Pure TTS mode: Inworld character streaming is intentionally disabled.
export async function sendSwaraInworldMessage(options: SendSwaraMessageOptions): Promise<string> {
  return options.text;
}

export async function setSwaraInworldMuted(_isMuted: boolean): Promise<void> {
  return;
}

export async function stopSwaraInworldPlayback(): Promise<void> {
  return;
}

export async function unlockSwaraInworldAudio(): Promise<void> {
  return;
}
