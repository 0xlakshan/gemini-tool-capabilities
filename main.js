//
// import { GoogleGenAI } from '@google/genai';
// import * as fs from "fs/promises";
// import dotenv from 'dotenv';
// dotenv.config();
// const GEMINI_API_KEY = 'AIzaSyBXgA7T0yUybLakqBAJNZbtClbzzulsIG4';
// const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
//
// async function main() {
//   try {
//     const modelsAsyncIterator = await ai.models.list();
//     const modelsArray = [];
//     for await (const model of modelsAsyncIterator) {
//       modelsArray.push(model);
//     }
//     const jsonString = JSON.stringify(modelsArray, null, 2);
//     await fs.writeFile('available_models.json', jsonString, 'utf8');
//
//     console.log('file created');
//   } catch (error) {
//     console.error('error', error);
//   }
// }
//
// main();
//
// import { GoogleGenAI } from '@google/genai';


// const GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
// const ai = new GoogleGenAI({ apiKey: GOOGLE_GENERATIVE_AI_API_KEY });
//
// const TOOL_TESTS = {
//   "google_search": {
//     tool: { googleSearch: {} },
//     prompt: "What is the current weather in New York?",
//     description: "Google Search"
//   },
//   "code_execution": {
//     tool: { codeExecution: {} },
//     prompt: "Calculate the factorial of 5 using code",
//     description: "Code Execution"
//   },
//   "url_context": {
//     tool: {
//       urlContext: {
//         urls: ["https://www.example.com"]
//       }
//     },
//     prompt: "What is on this webpage?",
//     description: "URL Context"
//   },
//   "file_search": {
//     tool: { fileSearch: {} },
//     prompt: "Search for information about artificial intelligence",
//     description: "File Search"
//   }
// };
//
// async function testToolWithModel(modelName, toolName, toolConfig) {
//   try {
//     const model = ai.getGenerativeModel({
//       model: modelName.replace('models/', ''),
//       tools: [toolConfig.tool]
//     });
//
//     const result = await model.generateContent({
//       contents: [{ role: 'user', parts: [{ text: toolConfig.prompt }] }]
//     });
//
//     return {
//       supported: true,
//       error: null,
//       hasResponse: !!result.response
//     };
//   } catch (error) {
//     const errorMessage = error.message || '';
//     const isToolError =
//       errorMessage.includes('tool') ||
//       errorMessage.includes('not supported') ||
//       errorMessage.includes('invalid') ||
//       errorMessage.includes('INVALID_ARGUMENT');
//
//     return {
//       supported: false,
//       error: errorMessage.substring(0, 100),
//       isToolError
//     };
//   }
// }
//
// async function checkAllModelsAndTools() {
//   try {
//     console.log('Fetching available models...\n');
//
//     const modelsAsyncIterator = await ai.models.list();
//     const modelsArray = [];
//
//     for await (const model of modelsAsyncIterator) {
//       modelsArray.push(model);
//     }
//
//     console.log(`✓ Found ${modelsArray.length} models\n`);
//     console.log(' Starting tool compatibility tests...\n');
//     console.log('='.repeat(100));
//
//     const results = [];
//     const toolNames = Object.keys(TOOL_TESTS);
//
//     for (let i = 0; i < modelsArray.length; i++) {
//       const model = modelsArray[i];
//       const modelName = model.name;
//
//       console.log(`\n[${i + 1}/${modelsArray.length}] Testing: ${modelName}`);
//       console.log('-'.repeat(100));
//
//       const modelResult = {
//         modelName,
//         displayName: model.displayName || modelName,
//         toolSupport: {}
//       };
//
//       for (const toolName of toolNames) {
//         const toolConfig = TOOL_TESTS[toolName];
//         process.stdout.write(`  Testing ${toolConfig.description}... `);
//
//         const testResult = await testToolWithModel(modelName, toolName, toolConfig);
//         modelResult.toolSupport[toolName] = testResult;
//
//         if (testResult.supported) {
//           console.log('✓ SUPPORTED');
//         } else {
//           console.log('✗ NOT SUPPORTED');
//           if (testResult.error && process.env.VERBOSE === 'true') {
//             console.log(`    Error: ${testResult.error}`);
//           }
//         }
//
//         await new Promise(resolve => setTimeout(resolve, 1000));
//       }
//
//       results.push(modelResult);
//
//       await new Promise(resolve => setTimeout(resolve, 1000));
//     }
//
//     console.log('\n' + '='.repeat(100));
//     console.log('\n SUMMARY REPORT');
//     console.log('='.repeat(100));
//
//     generateSummary(results);
//
//     // Save detailed results
//     await fs.writeFile(
//       'model_tool_support_detailed.json',
//       JSON.stringify(results, null, 2)
//     );
//
//     // Save summary report
//     const summaryReport = generateTextReport(results);
//     await fs.writeFile('model_tool_support_report.txt', summaryReport);
//
//     console.log('\n✓ Detailed results saved to: model_tool_support_detailed.json');
//     console.log('✓ Summary report saved to: model_tool_support_report.txt');
//
//   } catch (error) {
//     console.error('❌ Fatal Error:', error.message);
//     if (error.stack) {
//       console.error(error.stack);
//     }
//   }
// }
//
// function generateSummary(results) {
//   const toolNames = Object.keys(TOOL_TESTS);
//
//   console.log('\n Tool Support by Model:');
//   console.log('-'.repeat(100));
//
//   const header = 'Model'.padEnd(50) + toolNames.map(t =>
//     TOOL_TESTS[t].description.substring(0, 12).padEnd(14)
//   ).join('');
//   console.log(header);
//   console.log('-'.repeat(100));
//
//   results.forEach(result => {
//     const modelShortName = (result.displayName || result.modelName).substring(0, 48);
//     const toolMarks = toolNames.map(tool =>
//       (result.toolSupport[tool].supported ? '✓' : '✗').padEnd(14)
//     ).join('');
//     console.log(modelShortName.padEnd(50) + toolMarks);
//   });
//
//   console.log('\n\n Models Supporting Each Tool:');
//   console.log('-'.repeat(100));
//
//   toolNames.forEach(toolName => {
//     const toolConfig = TOOL_TESTS[toolName];
//     const supportingModels = results.filter(r => r.toolSupport[toolName].supported);
//
//     console.log(`\n${toolConfig.description}:`);
//     console.log(`  ${supportingModels.length} model(s) support this tool`);
//
//     if (supportingModels.length > 0) {
//       supportingModels.forEach(model => {
//         console.log(`    ✓ ${model.displayName || model.modelName}`);
//       });
//     } else {
//       console.log('    ✗ No models found with support');
//     }
//   });
//
//   console.log('\n\n Statistics:');
//   console.log('-'.repeat(100));
//   console.log(`Total Models Tested: ${results.length}`);
//
//   toolNames.forEach(toolName => {
//     const supportCount = results.filter(r => r.toolSupport[toolName].supported).length;
//     const percentage = ((supportCount / results.length) * 100).toFixed(1);
//     console.log(`${TOOL_TESTS[toolName].description}: ${supportCount}/${results.length} (${percentage}%)`);
//   });
// }
//
// function generateTextReport(results) {
//   const toolNames = Object.keys(TOOL_TESTS);
//   let report = 'GEMINI MODEL TOOL SUPPORT REPORT\n';
//   report += '='.repeat(100) + '\n';
//   report += `Generated: ${new Date().toISOString()}\n`;
//   report += `Total Models: ${results.length}\n`;
//   report += '='.repeat(100) + '\n\n';
//
//   results.forEach((result, index) => {
//     report += `[${index + 1}] ${result.displayName || result.modelName}\n`;
//     report += '-'.repeat(100) + '\n';
//
//     toolNames.forEach(toolName => {
//       const toolConfig = TOOL_TESTS[toolName];
//       const support = result.toolSupport[toolName];
//       const status = support.supported ? '✓ SUPPORTED' : '✗ NOT SUPPORTED';
//       report += `  ${toolConfig.description}: ${status}\n`;
//     });
//
//     report += '\n';
//   });
//
//   return report;
// }
//
// console.log('Starting Gemini Model Tool Compatibility Checker\n');
// checkAllModelsAndTools();


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
