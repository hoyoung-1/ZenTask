
import { GoogleGenAI, Type } from "@google/genai";
import { AssistantResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getSmartMotivation = async (pendingCount: number): Promise<AssistantResponse> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `사용자가 오늘 완료해야 할 할 일이 ${pendingCount}개 남았습니다. 아주 짧고 멋진 다크 모드 감성의 동기부여 문구(한국어)와 간단한 생산성 팁(한국어)을 하나씩 제공해주세요. 간결하고 심미적인 문장을 사용하세요.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            motivation: { type: Type.STRING },
            tip: { type: Type.STRING }
          },
          required: ["motivation", "tip"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      motivation: "어둠 속에서도 멈추지 말고 전진하세요.",
      tip: "가장 작은 일부터 하나씩 해결해보세요."
    };
  }
};
