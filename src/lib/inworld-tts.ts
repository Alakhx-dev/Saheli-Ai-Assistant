let currentAudioContext: AudioContext | null = null;
let currentReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
let scheduledSources: AudioBufferSourceNode[] = [];
let pendingTexts: string[] = [];
let isProcessingQueue = false;
let playbackToken = 0;
let nextStartTime = 0;
let speakingHandler: ((speaking: boolean) => void) | null = null;

function emitSpeaking(speaking: boolean) {
  speakingHandler?.(speaking);
}

export function setInworldTtsSpeakingHandler(handler: ((speaking: boolean) => void) | null) {
  speakingHandler = handler;
}

function getAudioContextConstructor() {
  return window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

async function getAudioContext() {
  if (!currentAudioContext) {
    const AudioContextConstructor = getAudioContextConstructor();
    if (!AudioContextConstructor) {
      throw new Error("Web Audio API is not supported");
    }

    currentAudioContext = new AudioContextConstructor();
    nextStartTime = currentAudioContext.currentTime + 0.05;
  }

  if (currentAudioContext.state === "suspended") {
    await currentAudioContext.resume();
  }

  return currentAudioContext;
}

export async function primeInworldTtsPlayback() {
  await getAudioContext();
}

function prepareInworldSpeech(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/www\.[^\s]+/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/^[\s-]*[-+]\s+/gm, " ")
    .replace(/[*_~#>`]+/g, " ")
    .replace(/[|\\/_]+/g, " ")
    .replace(/\b(?:[A-Za-z]\s+){2,}[A-Za-z]\b/g, (match) => match.replace(/\s+/g, ""))
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .replace(/\s+([,.!?\u0964])/g, "$1")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

function base64ToArrayBuffer(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

async function decodeAudioChunk(audioContext: AudioContext, audioContent: string) {
  const chunkBuffer = base64ToArrayBuffer(audioContent);
  return audioContext.decodeAudioData(chunkBuffer.slice(0));
}

function readAudioContent(line: string) {
  const trimmedLine = line.trim();
  if (!trimmedLine) {
    return "";
  }

  try {
    const payload = JSON.parse(trimmedLine) as { result?: { audioContent?: string } };
    return payload.result?.audioContent ?? "";
  } catch {
    return "";
  }
}

function maybeMarkIdle() {
  if (!isProcessingQueue && pendingTexts.length === 0 && scheduledSources.length === 0) {
    emitSpeaking(false);
  }
}

function scheduleBuffer(audioContext: AudioContext, audioBuffer: AudioBuffer, token: number) {
  if (token !== playbackToken || currentAudioContext !== audioContext) {
    return;
  }

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  scheduledSources.push(source);

  const startAt = Math.max(nextStartTime, audioContext.currentTime + 0.02);
  source.start(startAt);
  nextStartTime = startAt + audioBuffer.duration;

  source.onended = () => {
    scheduledSources = scheduledSources.filter((item) => item !== source);
    if (scheduledSources.length === 0) {
      nextStartTime = audioContext.currentTime + 0.04;
    }
    maybeMarkIdle();
  };
}

async function streamTextToAudio(text: string, token: number) {
  const audioContext = await getAudioContext();
  if (token !== playbackToken) {
    return;
  }

  const response = await fetch("/api/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Desktop Inworld TTS failed: ${response.status} ${errText}`);
  }

  if (!response.body) {
    throw new Error("Desktop Inworld TTS stream body is missing");
  }

  const reader = response.body.getReader();
  currentReader = reader;
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (token === playbackToken) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const audioContent = readAudioContent(line);
        if (!audioContent || token !== playbackToken) {
          continue;
        }

        const decodedChunk = await decodeAudioChunk(audioContext, audioContent);
        scheduleBuffer(audioContext, decodedChunk, token);
      }
    }

    const trailingAudioContent = readAudioContent(buffer);
    if (trailingAudioContent && token === playbackToken) {
      const decodedChunk = await decodeAudioChunk(audioContext, trailingAudioContent);
      scheduleBuffer(audioContext, decodedChunk, token);
    }
  } finally {
    if (currentReader === reader) {
      currentReader = null;
    }
  }
}

async function processTextQueue(token: number) {
  if (isProcessingQueue) {
    return;
  }

  isProcessingQueue = true;
  emitSpeaking(true);

  try {
    while (token === playbackToken && pendingTexts.length > 0) {
      const nextText = pendingTexts.shift();
      if (!nextText) {
        continue;
      }

      await streamTextToAudio(nextText, token);
    }
  } catch (error) {
    if (token === playbackToken) {
      console.error("Inworld TTS failed", error);
    }
  } finally {
    if (token === playbackToken) {
      isProcessingQueue = false;
      if (pendingTexts.length > 0) {
        void processTextQueue(token);
      } else {
        maybeMarkIdle();
      }
    }
  }
}

export function stopInworldTtsPlayback() {
  playbackToken += 1;
  pendingTexts = [];
  isProcessingQueue = false;

  if (currentReader) {
    void currentReader.cancel();
    currentReader = null;
  }

  for (const source of scheduledSources) {
    try {
      source.stop();
    } catch {
      // Source may already have ended.
    }
  }
  scheduledSources = [];

  if (currentAudioContext) {
    nextStartTime = currentAudioContext.currentTime + 0.04;
  } else {
    nextStartTime = 0;
  }

  emitSpeaking(false);
}

export async function speakWithInworldTts(text: string): Promise<void> {
  const preparedText = prepareInworldSpeech(text);
  if (!preparedText) {
    return;
  }

  pendingTexts.push(preparedText);
  emitSpeaking(true);
  await primeInworldTtsPlayback();
  void processTextQueue(playbackToken);
}
