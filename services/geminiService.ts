import { GoogleGenAI, Modality, Chat, GenerateContentResponse, LiveSession, LiveServerMessage } from '@google/genai';
import { GroundingSource } from '../types';
import { decodeAudioData } from '../utils/audioUtils';
import { fileToBase64 } from '../utils/fileUtils';

const getGenAI = () => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// --- Creative Studio Services ---

export const generateImage = async (prompt: string, aspectRatio: string): Promise<string> => {
  const ai = getGenAI();
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio,
    },
  });
  return response.generatedImages[0].image.imageBytes;
};

export const editImage = async (base64ImageData: string, mimeType: string, prompt: string): Promise<string> => {
  const ai = getGenAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: base64ImageData, mimeType } },
        { text: prompt },
      ],
    },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return part.inlineData.data;
    }
  }
  throw new Error("No edited image found in response");
};

export const generateVideo = async (prompt: string, imageBytes?: string, mimeType?: string, aspectRatio: string = '16:9'): Promise<string> => {
  const ai = getGenAI();
  const requestPayload: any = {
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: aspectRatio,
    }
  };

  if (imageBytes && mimeType) {
    requestPayload.image = { imageBytes, mimeType };
  }

  let operation = await ai.models.generateVideos(requestPayload);

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) {
    throw new Error("Video generation completed but no download link was found.");
  }
  
  const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

// --- AI Assistant Services ---

export const startChat = (systemInstruction: string): Chat => {
  const ai = getGenAI();
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: { systemInstruction },
  });
};

export const streamChat = async (chat: Chat, message: string): Promise<AsyncGenerator<GenerateContentResponse>> => {
  return await chat.sendMessageStream({ message });
};

let outputAudioContext: AudioContext | null = null;
let nextStartTime = 0;
const sources = new Set<AudioBufferSourceNode>();

const getOutputAudioContext = () => {
    if (!outputAudioContext || outputAudioContext.state === 'closed') {
        // Fix: Cast window to `any` to support `webkitAudioContext` for older browsers without TypeScript errors.
        outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        nextStartTime = 0;
        sources.clear();
    }
    return outputAudioContext;
}

const playAudio = async (base64EncodedAudioString: string) => {
    const audioContext = getOutputAudioContext();
    const outputNode = audioContext.createGain();
    outputNode.connect(audioContext.destination);

    nextStartTime = Math.max(nextStartTime, audioContext.currentTime);

    const audioBuffer = await decodeAudioData(
        base64EncodedAudioString,
        audioContext
    );

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outputNode);
    source.addEventListener('ended', () => {
        sources.delete(source);
    });
    source.start(nextStartTime);
    nextStartTime += audioBuffer.duration;
    sources.add(source);
}

const stopAudio = () => {
    for (const source of sources.values()) {
        source.stop();
        sources.delete(source);
    }
    nextStartTime = 0;
}

export const startVoiceConversation = async (
    callbacks: { onMessage: (message: LiveServerMessage) => void, onError: (e: ErrorEvent) => void, onClose: () => void }
): Promise<LiveSession> => {
    const ai = getGenAI();
    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
            onopen: () => console.log('Voice session opened.'),
            onmessage: async (message: LiveServerMessage) => {
                const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                if (base64Audio) {
                    await playAudio(base64Audio);
                }
                if (message.serverContent?.interrupted) {
                    stopAudio();
                }
                callbacks.onMessage(message);
            },
            onerror: callbacks.onError,
            onclose: () => {
                if (outputAudioContext) {
                    outputAudioContext.close();
                    outputAudioContext = null;
                }
                callbacks.onClose();
            },
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
        },
    });
};

// --- Market Research Services ---

export const searchWeb = async (query: string): Promise<{ text: string, sources: GroundingSource[] }> => {
  const ai = getGenAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: query,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
    uri: chunk.web.uri,
    title: chunk.web.title
  })) || [];
  return { text: response.text, sources };
};

export const searchLocal = async (query: string, location: { latitude: number, longitude: number } | null): Promise<{ text: string, sources: GroundingSource[] }> => {
  const ai = getGenAI();
  const config: any = {
      tools: [{ googleMaps: {} }]
  };
  if(location) {
      config.toolConfig = {
          retrievalConfig: { latLng: location }
      }
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: query,
    config,
  });

  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
    uri: chunk.maps.uri,
    title: chunk.maps.title
  })) || [];
  return { text: response.text, sources };
};

// --- Tools Services ---

export const complexAnalysis = async (prompt: string): Promise<string> => {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
            thinkingConfig: { thinkingBudget: 32768 }
        }
    });
    return response.text;
};

export const transcribeAudio = async (audioFile: File): Promise<string> => {
    const ai = getGenAI();
    const base64Audio = await fileToBase64(audioFile);
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
            parts: [
                { inlineData: { data: base64Audio, mimeType: audioFile.type } },
                { text: "Transcreva este áudio." }
            ]
        }
    });
    return response.text;
};
