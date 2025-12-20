
import { GoogleGenAI } from "@google/genai";

// We assume process.env.API_KEY is available in the environment via polyfill if needed
const getAIInstance = () => {
  const apiKey = (typeof process !== 'undefined' && process.env?.API_KEY) || "";
  return new GoogleGenAI({ apiKey });
};

// Using gemini-3-flash-preview for basic text tasks according to guidelines
const MODEL_NAME = 'gemini-3-flash-preview';

/**
 * Refines a user's rough work log into a professional, concise entry.
 */
export const refineWorkLog = async (text: string): Promise<string> => {
  if (!text.trim()) return "";
  
  try {
    const ai = getAIInstance();
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `You are a helpful office assistant. Rewrite the following work log to be professional, clear, and concise. 
      If there are multiple points, formatting them as a bulleted list (using simple dashes) is preferred. 
      Do not add preamble or extra text, just the refined log.
      
      Input: "${text}"`,
    });
    return response.text?.trim() || text;
  } catch (error) {
    console.error("Gemini AI Error (Work Log):", error);
    return text;
  }
};

/**
 * Expands a task title and brief description into a detailed task specification.
 */
export const enhanceTaskDescription = async (title: string, currentDesc: string): Promise<string> => {
  try {
    const ai = getAIInstance();
    const prompt = `
      Act as a Senior Project Manager. I have a task titled "${title}" with the following rough notes: "${currentDesc}".
      
      Please expand this into a structured task description including:
      1. A brief professional summary.
      2. A list of likely sub-tasks or steps.
      3. Acceptance Criteria.
      
      Keep the tone professional and the output ready to paste into a task management tool.
    `;

    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
    });
    return response.text?.trim() || currentDesc;
  } catch (error) {
    console.error("Gemini AI Error (Task):", error);
    return currentDesc;
  }
};

/**
 * Generates a daily briefing for the team dashboard based on attendance data.
 */
export const generateTeamBriefing = async (
  attendance: any[], 
  leaves: any[], 
  employees: any[]
): Promise<string> => {
    const totalEmployees = employees.length;
    const presentCount = attendance.filter(a => !a.punchOut).length;
    const completedCount = attendance.filter(a => a.punchOut).length;
    const onLeaveCount = leaves.filter(l => l.status === 'approved').length;
    
    const activeNames = attendance
        .filter(a => !a.punchOut)
        .map(a => {
            const emp = employees.find((e: any) => e.id === a.employeeId);
            return emp ? emp.name : 'Unknown';
        })
        .slice(0, 5);

    const prompt = `
      You are a cheerful Team Coordinator. Write a short Daily Team Briefing (max 3 sentences) based on this live status:
      
      - Date: ${new Date().toLocaleDateString()}
      - Total Team Size: ${totalEmployees}
      - Currently Working: ${presentCount} (Names: ${activeNames.join(', ')}...)
      - Finished Work: ${completedCount}
      - On Leave: ${onLeaveCount}
      
      Highlight if attendance is high or low. Mention if key people are missing (leaves). Use 2-3 emojis to make it friendly.
      Do not use markdown headers, just a paragraph or bullet points.
    `;
    
    try {
        const ai = getAIInstance();
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
        });
        return response.text?.trim() || "Team data loaded successfully.";
    } catch (error) {
        console.error("Gemini AI Error (Briefing):", error);
        return "Unable to generate AI briefing at this time.";
    }
}
