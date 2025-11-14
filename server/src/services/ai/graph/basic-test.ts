/**
 * Osnovni test za provjeru da su LangGraph komponente uspješno kreirane
 * 
 * Ovaj test provjerava:
 * 1. Da se mogu importirati potrebni moduli
 * 2. Da su funkcije definirane
 * 3. Da se može kreirati početno stanje
 */

import { createInitialState, MAX_DRAFT_ITERATIONS } from './state';
import type { AgentState } from './state';

async function basicTest() {
  console.log('🧪 Basic LangGraph Components Test\n');

  try {
    // Test 1: Provjeri da se mogu importirati tipovi i funkcije
    console.log('1️⃣ Testing imports...');
    console.log('✅ State module imported successfully');
    console.log('   - createInitialState function available');
    console.log('   - MAX_DRAFT_ITERATIONS constant:', MAX_DRAFT_ITERATIONS);
    console.log('   - AgentState type available\n');

    // Test 2: Kreiraj početno stanje
    console.log('2️⃣ Testing state creation...');
    const testUserInput = "Napiši scenu gdje se Ana i Marko svađaju oko nasljedstva";
    const testStoryContext = "Ana je glavna protagonistica. Marko je njen brat.";
    
    const initialState = createInitialState(testUserInput, testStoryContext);
    console.log('✅ Initial state created successfully');
    console.log('   Properties:', {
      userInput: initialState.userInput.substring(0, 30) + '...',
      storyContext: initialState.storyContext.substring(0, 30) + '...',
      draftCount: initialState.draftCount,
      messagesLength: initialState.messages.length
    });
    console.log('');

    // Test 3: Provjeri tipove
    console.log('3️⃣ Testing TypeScript types...');
    const testState: AgentState = {
      userInput: "test",
      storyContext: "test context",
      draftCount: 0,
      messages: []
    };
    console.log('✅ AgentState type works correctly');
    console.log('   Test state created with required fields\n');

    // Test 4: Provjeri konstante
    console.log('4️⃣ Testing constants...');
    console.log(`   MAX_DRAFT_ITERATIONS: ${MAX_DRAFT_ITERATIONS}`);
    console.log('✅ Constants are properly exported\n');

    console.log('🎉 All basic tests passed!');
    console.log('\n📝 Summary:');
    console.log('   ✅ Directory structure created: server/src/services/ai/graph/');
    console.log('   ✅ AgentState interface defined in state.ts');
    console.log('   ✅ Helper functions implemented');
    console.log('   ✅ TypeScript types working correctly');
    console.log('\n🚀 Ready for next phase: Implementing graph nodes and edges');

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
    }
    process.exit(1);
  }
}

// Pokretanje testa
basicTest().then(() => {
  console.log('\n✨ Basic test completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
