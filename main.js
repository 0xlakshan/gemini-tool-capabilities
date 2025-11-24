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
  {
    id: 'google.file_search',
    config: { tools: [{ googleSearchRetrieval: { dynamicRetrievalConfig: { mode: 'MODE_DYNAMIC', dynamicThreshold: 0.7 } } }] },
    testPrompt: 'Search for files'
  },
  {
    id: 'google.url_context',
    config: { tools: [{ urlContext: {} }] },
    testPrompt: 'Summarize the content of https://example.com'
  }
];

let errorLogs = [];

async function checkToolSupport(modelName, toolDef) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    await ai.models.generateContent({
      model: modelName,
      contents: { role: 'user', parts: [{ text: toolDef.testPrompt }] },
      config: toolDef.config,
    });

    clearTimeout(timeout);
    return true;
  } catch (error) {
    console.log(error);
    errorLogs.push({
      model: modelName,
      errorLog: error
    });
    return false;
  }
}

async function main() {
  try {
    console.log('Fetching model list...');
    const modelsResponse = await ai.models.list();
    const modelsArray = [];
    const excludedModels = [];

    function validateModels(model) {
      const keywords = [
        {
          keyword: 'gemini',
          shouldKeep: true
        },
        {
          keyword: 'pro',
          shouldKeep: false
        },
        {
          keyword: '3',
          shouldKeep: false
        },
        {
          keyword: 'robotics',
          shouldKeep: false
        },
        {
          keyword: 'computer',
          shouldKeep: false
        },
        {
          keyword: 'embedding',
          shouldKeep: false
        },
        {
          keyword: 'image',
          shouldKeep: false
        },
        {
          keyword: 'audio',
          shouldKeep: false
        }
      ];

      let returnResult = true;

      keywords.forEach(eachKeyWord => {
        if (eachKeyWord.shouldKeep) {
          if (!model.name.includes(eachKeyWord.keyword)) {
            returnResult = false;
          }
        }
      });

      if (!returnResult) {
        return false;
      }

      keywords.forEach(eachKeyWord => {
        if (!eachKeyWord.shouldKeep) {
          if (model.name.includes(eachKeyWord.keyword)) {
            returnResult = false;
          }
        }
      });

      if (!returnResult) {
        return false;
      }

      return true;
    }

    for await (const model of modelsResponse) {
      if (validateModels(model)) {
        modelsArray.push(model);
      } else {
        excludedModels.push(model);
      }
    }

    console.log('Accepted Models -->', modelsArray);
    console.log('Declined Models -->', excludedModels);
    console.log('Accepted Models Count -->', modelsArray.length);
    console.log('Declined Models Count -->', excludedModels.length);
    console.log(`Checking tool support...\n`);

    console.log(
      'Model Name'.padEnd(40) +
      'Search'.padEnd(15) +
      'Code Exec'.padEnd(15) +
      'URL Context'
    );
    console.log('-'.repeat(85));

    for (const model of modelsArray) {
      const displayName = model.name.replace('models/', '');
      const fileSupport = await checkToolSupport(model.name, TOOLS_TO_CHECK[2]);
      const codeSupport = await checkToolSupport(model.name, TOOLS_TO_CHECK[1]);
      const searchSupport = await checkToolSupport(model.name, TOOLS_TO_CHECK[0]);


      const formatBool = (val) => val ? '✅' : '❌';

      console.log(
        displayName.padEnd(40) +
        formatBool(searchSupport).padEnd(15) +
        formatBool(codeSupport).padEnd(15) +
        formatBool(fileSupport)
      );

      // Avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  } catch (error) {
    console.error('Fatal Error:', error);
  }
}

main();
