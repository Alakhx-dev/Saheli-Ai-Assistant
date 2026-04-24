let currentAudioContext: AudioContext | null = null;
let currentReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
let playbackToken = 0;

function prepareInworldSpeech(text: string) {
  return text
    .replace(/[,:;]+/g, " ")
    .replace(/[()\[\]{}<>]/g, " ")
    .replace(/[|\\/_]/g, " ")
    .replace(/\.{2,}/g, ".")
    .replace(/!{2,}/g, "!")
    .replace(/\?{2,}/g, "?")
    .replace(/\s+/g, " ")
    .trim();
}

function base64ToBlob(base64: string, mimeType: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

async function decodeAudioChunk(audioContext: AudioContext, audioContent: string) {
  const audioBlob = base64ToBlob(audioContent, "audio/mpeg");
  const chunkBuffer = await audioBlob.arrayBuffer();
  return audioContext.decodeAudioData(chunkBuffer.slice(0));
}

export function stopInworldTtsPlayback() {
  playbackToken += 1;

  if (currentReader) {
    void currentReader.cancel();
    currentReader = null;
  }

  if (!currentAudioContext) {
    return;
  }

  try {
    void currentAudioContext.close();
  } catch {
    // ignore context shutdown errors during cancellation
  }

  currentAudioContext = null;
}

export async function speakWithInworldTts(text: string): Promise<void> {
  const trimmed = prepareInworldSpeech(text);
  if (!trimmed) {
    return;
  }

  stopInworldTtsPlayback();
  const activeToken = playbackToken;

  const response = await fetch("/api/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: trimmed }),
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
  const audioChunks: string[] = [];

  try {
    while (true) {
      if (activeToken !== playbackToken) {
        break;
      }

      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) {
          continue;
        }

        try {
          const payload = JSON.parse(trimmedLine) as { result?: { audioContent?: string } };
          const audioContent = payload.result?.audioContent;
          if (audioContent) {
            audioChunks.push(audioContent);
          }
        } catch {
          // ignore malformed NDJSON chunks from upstream
        }
      }
    }

    const trailingLine = buffer.trim();
    if (trailingLine) {
      try {
        const payload = JSON.parse(trailingLine) as { result?: { audioContent?: string } };
        const audioContent = payload.result?.audioContent;
        if (audioContent) {
          audioChunks.push(audioContent);
        }
      } catch {
        // ignore malformed NDJSON tail
      }
    }

    if (activeToken !== playbackToken || audioChunks.length === 0) {
      return;
    }

    const AudioContextConstructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) {
      throw new Error("Web Audio API is not supported");
    }

    const audioContext = currentAudioContext ?? new AudioContextConstructor();
    currentAudioContext = audioContext;
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const decodedBuffers = await Promise.all(
      audioChunks.map((audioContent) => decodeAudioChunk(audioContext, audioContent)),
    );

    if (activeToken !== playbackToken || decodedBuffers.length === 0) {
      return;
    }

    let playhead = audioContext.currentTime + 0.05;
    let finalSource: AudioBufferSourceNode | null = null;

    await new Promise<void>((resolve, reject) => {
      for (const bufferChunk of decodedBuffers) {
        const source = audioContext.createBufferSource();
        source.buffer = bufferChunk;
        source.connect(audioContext.destination);
        source.start(playhead);
        playhead += bufferChunk.duration;
        finalSource = source;
      }

      if (!finalSource) {
        reject(new Error("Audio playback failed"));
        return;
      }

      finalSource.onended = () => {
        if (currentAudioContext === audioContext) {
          currentAudioContext = null;
        }
        resolve();
      };

      if (activeToken !== playbackToken) {
        try {
          finalSource.stop();
        } catch {
          // ignore race during cancellation
        }
        reject(new Error("Audio playback cancelled"));
      }
    });
  } finally {
    if (currentReader === reader) {
      currentReader = null;
    }
  }
}
