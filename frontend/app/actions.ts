'use server';

import { GoogleGenAI } from "@google/genai";
// eg. If ETH price goes below 5500, swap 0.001 ETH to UNI, then transfer it to 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (自己搞个备用钱包测)
export async function analyzeIntent(intent: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing");
    return { error: "API Key missing" };
  }

  const prompt = `
    You are a DeFi automation assistant.
    Analyze the following user intent and extract the trigger condition, swap action, and an optional transfer action.
    The trigger is always based on ETH price.
    The action is a token swap.
    The transfer, if present, specifies a recipient address.

    User Intent: "${intent}"

    Return ONLY a JSON object with the following structure (no markdown, no code blocks):
    {
      "thought": "Briefly explain your reasoning step by step. First, identify the trigger. Second, identify the swap details. Third, check if a transfer is mentioned and extract the recipient address.",
      "trigger": {
        "token": "ETH",
        "operator": ">" or "<",
        "threshold": number
      },
      "action": {
        "type": "swap",
        "fromToken": "ETH" or "UNI",
        "toToken": "ETH" or "UNI",
        "amountType": "percentage" or "absolute",
        "amount": number
      },
      "transfer": {
        "recipient": "0x... address"
      }
    }

    If no transfer is mentioned, the "transfer" field can be omitted.
  `;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const text = response.text;

    if (!text) throw new Error('No response from Gemini');

    // Clean up markdown if present
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error('Gemini API Error:', error);
    return { error: "Failed to analyze intent" };
  }
}
