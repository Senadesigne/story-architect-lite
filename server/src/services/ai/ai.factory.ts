import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

// Helper to create provider based on config
const createProvider = (role: 'manager' | 'worker', temperature: number = 0.7): BaseChatModel => {
    const providerType = role === 'manager'
        ? process.env.MANAGER_AI_PROVIDER || 'anthropic'
        : process.env.WORKER_AI_PROVIDER || 'anthropic';

    // Manager defaults to Haiku (fast/cheap), Worker defaults to Sonnet (smart)
    const defaultModel = role === 'manager'
        ? "claude-3-haiku-20240307"
        : "claude-3-sonnet-20240229";

    if (providerType === 'anthropic') {
        return new ChatAnthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
            model: defaultModel,
            temperature,
        });
    } else if (providerType === 'openai') {
        return new ChatOpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            model: role === 'manager' ? "gpt-3.5-turbo" : "gpt-4-turbo",
            temperature,
        });
    } else if (providerType === 'ollama') {
        return new ChatOllama({
            baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
            model: process.env.OLLAMA_MODEL || "llama3",
            temperature,
        });
    }

    throw new Error(`Unknown AI provider: ${providerType}`);
};

export const createManagerProvider = (temperature: number = 0) => createProvider('manager', temperature);
export const createWorkerProvider = (temperature: number = 0.7) => createProvider('worker', temperature);
