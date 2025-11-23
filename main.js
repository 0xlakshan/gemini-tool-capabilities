import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GOOGLE_GENERATIVE_AI_API_KEY });

const TOOLS_TO_CHECK = [
  {
    id: 'google.google_search',
    config: { tools: [{ googleSearch: {} }] },
    testPrompt: 'What is the weather in London?'
  },
  {
    id: 'google.code_execution',
    config: { tools: [{ codeExecution: {} }] },
    testPrompt: 'Calculate print("hello")'
  },
  // 'google.file_search' usually maps to the retrieval tool or googleSearchRetrieval
  {
    id: 'google.file_search',
    config: { tools: [{ googleSearchRetrieval: { dynamicRetrievalConfig: { mode: 'MODE_DYNAMIC', dynamicThreshold: 0.7 } } }] },
    testPrompt: 'Search for files'
  }
  // Note: 'google.url_context' is often a subset of grounding/search capabilities 
  // and not always a distinct standalone tool config, but we can check general grounding.
];

async function checkToolSupport(modelName, toolDef) {
  try {
    // We use a minimal timeout to fail fast if the model hangs, 
    // though usually rejection is immediate for unsupported tools.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    await ai.models.generateContent({
      model: modelName,
      contents: { role: 'user', parts: [{ text: toolDef.testPrompt }] },
      config: toolDef.config,
    });

    clearTimeout(timeout);
    return true; // If no error is thrown, the tool is likely supported (or at least accepted)
  } catch (error) {
    // Check for specific error indicating the tool is not supported
    // Often 400 InvalidArgument or "Check your tool configuration"
    if (error.message && (
      error.message.includes('not supported') ||
      error.message.includes('InvalidArgument') ||
      error.status === 400
    )) {
      return false;
    }

    // If it's a different error (e.g. billing, rate limit), strictly speaking we assume 
    // the tool config was accepted, but the request failed for other reasons.
    // However, to be safe, we'll mark ambiguous errors as '?'
    return '?';
  }
}

async function main() {
  try {
    console.log('Fetching model list...');
    const modelsResponse = await ai.models.list();
    // The list() method returns an async iterable or pager, strictly we iterate it:
    const modelsArray = [];

    // Depending on exact SDK version, list() might return { models: [] } or be iterable
    // The standard iterator usage:
    for await (const model of modelsResponse) {
      // Filter for only gemini models to save time, ignore embedding/imagen models
      if (model.name.includes('gemini')) {
        modelsArray.push(model);
      }
    }

    console.log(`Found ${modelsArray.length} Gemini models. Checking tool support...\n`);

    // Print Header
    console.log(
      'Model Name'.padEnd(40) +
      'Search'.padEnd(15) +
      'Code Exec'.padEnd(15) +
      'File Search'
    );
    console.log('-'.repeat(85));

    for (const model of modelsArray) {
      // Strip 'models/' prefix for cleaner display if present
      const displayName = model.name.replace('models/', '');

      const searchSupport = await checkToolSupport(model.name, TOOLS_TO_CHECK[0]);
      const codeSupport = await checkToolSupport(model.name, TOOLS_TO_CHECK[1]);
      const fileSupport = await checkToolSupport(model.name, TOOLS_TO_CHECK[2]);

      const formatBool = (val) => val === true ? '✅' : (val === false ? '❌' : '⚠️');

      console.log(
        displayName.padEnd(40) +
        formatBool(searchSupport).padEnd(15) +
        formatBool(codeSupport).padEnd(15) +
        formatBool(fileSupport)
      );

      // Small delay to be nice to the API rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

  } catch (error) {
    console.error('Fatal Error:', error);
  }
}

main();
