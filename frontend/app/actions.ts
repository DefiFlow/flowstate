'use server';

import { GoogleGenAI } from "@google/genai";
// eg. Pay 10 USDC February Salary to vitalik.eth and hayden.eth on Arc using my Sepolia ETH.
export async function analyzeIntent(intent: string, currentPrice: number) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing");
    return { error: "API Key missing" };
  }

  const prompt = `
    You are a DeFi automation assistant.
    The user wants to execute a workflow involving a Swap, a Bridge, and a Payroll distribution.
    
    Context:
    - Current ETH Price: ${currentPrice} USDC
    - User Intent: "${intent}"

    Task:
    1. Parse the intent to identify:
       - Recipients and their amounts (e.g., "10 USDC to vitalik.eth").
       - Total USDC required (Sum of all recipient amounts).
       - Memo/Description (e.g., "February Salary").
    2. Calculate the required ETH input for the swap:
       - Formula: (Total USDC / Current ETH Price) * 1.05
       - The 1.05 multiplier is a buffer for slippage and fees.
       - Result should be a string representing the ETH amount (e.g., "0.012").
    3. Generate a JSON object for a React Flow state with 3 connected nodes:
       
       Node 1: Uniswap Swap
       - Type: "action"
       - Label: "Uniswap"
       - Input: The calculated ETH amount (e.g., "0.012")
       - Output: The total USDC amount (e.g., "~20 USDC")

       Node 2: Li.Fi Bridge
       - Type: "lifi"
       - Label: "Li.Fi Bridge"
       - From Chain: "Sepolia" (inferred from "my Sepolia ETH")
       - To Chain: "Arc" (inferred from "on Arc")
       - Token: "USDC"
       - Bridge: "Circle CCTP"

       Node 3: Arc Payroll
       - Type: "transfer"
       - Label: "Arc Payroll"
       - Token: "USDC"
       - Recipients: Array of objects { "address": "...", "amount": ... }
       - Memo: The extracted memo

    Output JSON Structure:
    {
      "nodes": [
        {
          "id": "1",
          "type": "action",
          "position": { "x": 250, "y": 0 },
          "data": { "label": "Uniswap", "type": "action", "input": "...", "output": "..." }
        },
        {
          "id": "2",
          "type": "lifi",
          "position": { "x": 250, "y": 300 },
          "data": { "label": "Li.Fi Bridge", "type": "lifi", "fromChain": "...", "toChain": "...", "token": "...", "bridge": "..." }
        },
        {
          "id": "3",
          "type": "transfer",
          "position": { "x": 250, "y": 600 },
          "data": { "label": "Arc Payroll", "type": "transfer", "token": "...", "recipients": [{ "address": "...", "amount": 0 }], "memo": "..." }
        }
      ],
      "edges": [
        { "id": "e1-2", "source": "1", "target": "2" },
        { "id": "e2-3", "source": "2", "target": "3" }
      ]
    }
    
    Return ONLY the JSON object. No markdown formatting.
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
