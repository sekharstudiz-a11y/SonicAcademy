import { GoogleGenAI, Type } from "@google/genai";
import { Song, SongNote, LevelType, InstrumentType } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function transcribeSongFromLink(url: string, level: LevelType, currentInstrument: InstrumentType): Promise<Song | null> {
  const prompt = `
    I want to learn how to play a song from this link: ${url}.
    Please analyze this song and provide a simplified melodic transcription suitable for a ${level} level.
    The transcription MUST be compatible with a ${currentInstrument}.
    Return the transcription as a valid JSON object matching the Song interface.
    
    The notes should be within the C4 to B5 range.
    Duration should be in Tone.js notation (e.g., '4n', '8n', '2n').
    Time should be in seconds from the start.
    
    If you cannot find the specific link, search for the song title and provide its main chorus or melody.
    Ensure at least ${currentInstrument} is in the instruments array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            level: { type: Type.STRING, enum: ["beginner", "intermediate", "advanced"] },
            instruments: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING, enum: ["piano", "synth", "pad", "lead"] } 
            },
            notes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  note: { type: Type.STRING, description: "Pitch (e.g. C4, D#4)" },
                  time: { type: Type.NUMBER, description: "Start time in seconds" },
                  duration: { type: Type.STRING, description: "Tone.js duration (4n, 8n)" }
                },
                required: ["note", "time", "duration"]
              }
            },
            key: { type: Type.STRING },
            suggestedBpm: { type: Type.NUMBER }
          },
          required: ["id", "name", "level", "instruments", "notes", "key", "suggestedBpm"]
        },
        tools: [{ googleSearch: {} }],
        toolConfig: { includeServerSideToolInvocations: true }
      }
    });

    const song = JSON.parse(response.text) as Song;
    return song;
  } catch (error) {
    console.error("[SonicAcademy] Gemini Transcription Error:", error);
    return null;
  }
}
