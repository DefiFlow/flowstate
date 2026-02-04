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

  const prompt = `
You are a DeFi automation assistant.
The user wants to execute a workflow involving a Swap, multiple ENS resolutions, and a final Payroll distribution.

Context:
- Current ETH Price: ${currentPrice} USDC
- User Intent: "${intent}"

Task:
1.  Parse the intent to identify a list of recipients (ENS names or addresses), their individual USDC amounts, and a memo/description.
2.  Calculate the total USDC required.
3.  Calculate the required ETH input for the swap using the formula: \`(Total USDC / Current ETH Price) * 1.05\`. The 1.05 is a slippage buffer.
4.  Generate a JSON object for a React Flow state with the following structure:
    - A single "Uniswap" swap node at the top.
    - Below the swap node, create a separate "ENS Resolver" -> "Arc Payroll" node pair for EACH recipient.
    - The "Uniswap" node should connect to every "ENS Resolver" node.
    - Each "ENS Resolver" node should connect to its corresponding "Arc Payroll" node.

JSON Structure Details:

- **One Swap Node:**
  - \`id\`: "1", \`type\`: "action", \`position\`: \`{ "x": 250, "y": 0 }\`
  - \`data\`: \`{ "label": "Uniswap", "type": "action", "input": "...", "output": "..." }\`

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
The final JSON should contain 5 nodes (1 swap, 2 ens, 2 payroll) and 4 edges.

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

    // After parsing, resolve ENS names
    if (flowData.nodes) {
      const provider = new ethers.JsonRpcProvider("http://localhost:3000/api/rpc");
      for (const node of flowData.nodes) {
        if (node.data.type === 'ens' && node.data.recipients) {
          for (const recipient of node.data.recipients) {
            if (recipient.input && recipient.input.endsWith('.eth')) {
              try {
                const resolvedAddress = await provider.resolveName(recipient.input);
                if (resolvedAddress) {
                  recipient.address = resolvedAddress;
                }
              } catch (e) {
                console.error(`Failed to resolve ENS name: ${recipient.input}`, e);
                // Keep address empty if resolution fails
              }
            }
          }
        }
      }
    }

    return flowData;

  } catch (error) {
    console.error('Gemini API Error:', error);
    return { error: "Failed to analyze intent" };
  }
}
