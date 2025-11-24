import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GOOGLE_GENERATIVE_AI_API_KEY });

const TOOLS_TO_CHECK = [
  {
    id: 'google.google_search',
    name: 'Google Search',
    config: { tools: [{ googleSearch: {} }] },
    testPrompt: 'What is the weather in London today?'
  },
  {
    id: 'google.code_execution',
    name: 'Code Execution',
    config: { tools: [{ codeExecution: {} }] },
    testPrompt: 'Calculate the sum of 123 + 456'
  },
  {
    id: 'google.file_search',
    name: 'File Search',
    config: {
      tools: [{
        googleSearchRetrieval: {
          dynamicRetrievalConfig: {
            mode: 'MODE_DYNAMIC',
            dynamicThreshold: 0.7
          }
        }
      }]
    },
    testPrompt: 'Search for information about machine learning'
  },
  {
    id: 'google.url_context',
    name: 'URL Context',
    config: {
      tools: [{
        retrieval: {
          vertexAiSearch: {
            datastore: 'projects/*/locations/*/collections/*/dataStores/*'
          }
        }
      }]
    },
    // Alternative config attempt for URL grounding
    alternativeConfig: {
      systemInstruction: {
        parts: [{ text: 'You can access web content from URLs provided.' }]
      }
    },
    testPrompt: 'Analyze the content from https://example.com'
  }
];

async function checkToolSupport(modelName, toolDef) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    await ai.models.generateContent({
      model: modelName,
      contents: { role: 'user', parts: [{ text: toolDef.testPrompt }] },
      config: toolDef.config,
      signal: controller.signal
    });

    clearTimeout(timeout);
    return true;
  } catch (error) {
    clearTimeout(timeout);

    // Abort error
    if (error.name === 'AbortError') {
      return '⏱️';
    }

    // Check for unsupported tool errors
    if (error.message && (
      error.message.toLowerCase().includes('not supported') ||
      error.message.toLowerCase().includes('invalid argument') ||
      error.message.toLowerCase().includes('tool') ||
      error.status === 400
    )) {
      return false;
    }

    // Network or auth errors suggest tool might be supported
    if (error.status === 401 || error.status === 403 || error.status === 429) {
      return '🔒';
    }

    return '⚠️';
  }
}

async function main() {
  try {
    console.log('🔍 Fetching Gemini model list...\n');
    const modelsResponse = await ai.models.list();

    const modelsArray = [];
    for await (const model of modelsResponse) {
      if (model.name.toLowerCase().includes('gemini')) {
        modelsArray.push(model);
      }
    }

    console.log(`✅ Found ${modelsArray.length} Gemini models\n`);
    console.log('Testing tool support (this may take a few minutes)...\n');

    // Print header
    const colWidth = 35;
    console.log(
      'Model Name'.padEnd(colWidth) +
      'Search'.padEnd(12) +
      'Code'.padEnd(12) +
      'File'.padEnd(12) +
      'URL'
    );
    console.log('='.repeat(colWidth + 48));

    const results = [];

    for (const model of modelsArray) {
      const displayName = model.name.replace('models/', '');

      const toolResults = [];
      for (const tool of TOOLS_TO_CHECK) {
        const support = await checkToolSupport(model.name, tool);
        toolResults.push(support);

        // Respectful rate limiting
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      const formatResult = (val) => {
        if (val === true) return '✅ Yes';
        if (val === false) return '❌ No';
        if (val === '⏱️') return '⏱️ Timeout';
        if (val === '🔒') return '🔒 Auth';
        return '⚠️ Unknown';
      };

      console.log(
        displayName.padEnd(colWidth) +
        formatResult(toolResults[0]).padEnd(12) +
        formatResult(toolResults[1]).padEnd(12) +
        formatResult(toolResults[2]).padEnd(12) +
        formatResult(toolResults[3])
      );

      results.push({
        model: displayName,
        tools: toolResults
      });
    }

    console.log('\n' + '='.repeat(colWidth + 48));
    console.log('\nLegend:');
    console.log('✅ Yes      - Tool supported');
    console.log('❌ No       - Tool not supported');
    console.log('⚠️ Unknown  - Ambiguous error');
    console.log('🔒 Auth     - Auth/billing issue');
    console.log('⏱️ Timeout  - Request timed out');

    // Summary statistics
    const supportedCount = results.map(r => r.tools.filter(t => t === true).length);
    const avgSupport = supportedCount.reduce((a, b) => a + b, 0) / results.length;
    console.log(`\n📊 Average tools supported per model: ${avgSupport.toFixed(1)}/${TOOLS_TO_CHECK.length}`);

  } catch (error) {
    console.error('❌ Fatal Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

main();
