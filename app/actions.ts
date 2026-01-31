'use server';

import { GoogleGenAI } from "@google/genai";
// eg. If ETH price goes above 3500, swap 0.001 ETH to USDC
export async function analyzeIntent(intent: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing");
    return { error: "API Key missing" };
  }

  const prompt = `
    You are a DeFi automation assistant.
    Analyze the following user intent and extract the trigger condition and action.
    The trigger is always based on ETH price.
    The action is a token swap between ETH and BTC.

    User Intent: "${intent}"

    Return ONLY a JSON object with the following structure (no markdown, no code blocks):
    {
      "thought": "Briefly explain your reasoning step by step.",
      "trigger": {
        "token": "ETH",
        "operator": ">" or "<",
        "threshold": number
      },
      "action": {
        "type": "swap",
        "fromToken": "ETH" or "BTC",
        "toToken": "ETH" or "BTC",
        "amountType": "percentage" or "absolute",
        "amount": number
      }
    }
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
