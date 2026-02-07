'use server';

import { GoogleGenAI } from "@google/genai";
import { ethers } from "ethers";

// eg. Pay 1000 USDC February Salary to employee2.niro.eth and employ1.niro.eth on Arc using my Sepolia ETH.
export async function analyzeIntent(intent: string, currentPrice: number) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing");
    return { error: "API Key missing" };
  }

  const prompt = `You are a DeFi automation assistant. Your goal is to understand a user's intent and translate it into a structured JSON workflow for a React Flow diagram.

Context:
- User Intent: "${intent}"
- Current ETH Price: ${currentPrice} USD per ETH. Use this for any calculations involving ETH to USDC swaps.

Task:
1.  **Think Step-by-Step**: First, formulate a brief "thought" process explaining the steps you will take. For example: "I will initiate a swap for the specified assets, then resolve the ENS names, and finally set up the payroll distribution."
2.  **Parse Intent**: Analyze the user's intent to extract key parameters like recipients, amounts, and a memo.
3.  **Calculate Totals**: Calculate the total USDC amount required.
4.  **Generate JSON**: Construct a single JSON object that includes your "thought" process and the necessary nodes and edges for the React Flow diagram.

JSON Structure Specification:

- **Top-level Keys**: The root of the JSON object must have three keys: \`thought\`, \`nodes\`, and \`edges\`.
  - \`thought\`: A string containing your step-by-step plan from Task 1.
  - \`nodes\`: An array of node objects.
  - \`edges\`: An array of edge objects.

JSON Structure Details:

- **One Swap Node:**
  - \`id\`: "1", \`type\`: "action", \`position\`: \`{ "x": 250, "y": 0 }\`
  - \`data\`: \`{ "label": "Uniswap", "type": "action", "input": "...", "output": "..." }\` 
    - The 'input' should be the total USDC amount calculated. The 'output' should be an empty string.

- **For EACH recipient \`i\`:**
  - **ENS Node:**
    - \`id\`: \`"2-${'${i+1}'}"\`, \`type\`: "ens", \`position\`: \`{ "x": (i * 300), "y": 250 }\`
    - \`data\`: \`{ "label": "ENS Resolver", "type": "ens", "recipients": [{ "input": "...", "amount": ..., "address": "" }] }\` (recipients array has only ONE element)
  - **Payroll Node:**
    - \`id\`: \`"3-${'${i+1}'}"\`, \`type\`: "transfer", \`position\`: \`{ "x": (i * 300), "y": 550 }\`
    - \`data\`: \`{ "label": "Arc Payroll", "type": "transfer", "token": "USDC", "memo": "..." }\`

- **Edges:**
  - One edge from \`"1"\` to each \`"2-${'${i+1}'}"\`.
  - One edge from each \`"2-${'${i+1}'}"\` to its corresponding \`"3-${'${i+1}'}"\`.

Example for an intent with 2 recipients:
The final JSON should contain a 'thought' string, 5 nodes (1 swap, 2 ens, 2 payroll), and 4 edges.

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
    const flowData = JSON.parse(jsonStr);

    return flowData;

  } catch (error) {
    console.error('Gemini API Error:', error);
    return { error: "Failed to analyze intent" };
  }
}
