import { AppEnv } from '../config/env';
import { AiProvider, AiProviderError } from './ai-provider';
import { GeminiAiProvider } from './gemini.provider';
import { MockAiProvider } from './mock.provider';

class DisabledAiProvider implements AiProvider {
  async summarizeConversation(): Promise<string> {
    throw new AiProviderError('AI is disabled', 'disabled');
  }

  async triageTicket(): Promise<never> {
    throw new AiProviderError('AI is disabled', 'disabled');
  }
}

export const createAiProvider = (env: AppEnv): AiProvider => {
  if (env.AI_PROVIDER === 'mock') return new MockAiProvider();
  if (env.AI_PROVIDER === 'disabled') return new DisabledAiProvider();
  return new GeminiAiProvider(env);
};
