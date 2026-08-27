import { TicketPriority } from '@pente/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiProviderError } from '../src/ai/ai-provider';
import { GeminiAiProvider } from '../src/ai/gemini.provider';
import { AppEnv } from '../src/config/env';

const env: AppEnv = {
  NODE_ENV: 'test',
  MONGODB_URI: 'mongodb://localhost/test',
  API_PORT: 4000,
  WEB_ORIGIN: 'http://localhost:3000',
  JWT_ACCESS_SECRET: 'test-access-secret-with-thirty-two-characters',
  JWT_REFRESH_SECRET: 'test-refresh-secret-with-thirty-two-characters',
  JWT_ACCESS_EXPIRY: '15m',
  JWT_REFRESH_EXPIRY_DAYS: 7,
  GEMINI_API_KEY: 'test-key',
  GEMINI_MODEL: 'gemini-3.6-flash',
  GEMINI_BASE_URL: 'https://example.com',
  AI_TIMEOUT_MS: 1000,
  AI_PROVIDER: 'gemini',
  LOG_LEVEL: 'silent',
};

const geminiResponse = (text: string, finishReason = 'STOP') =>
  ({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text }] }, finishReason }],
    }),
  }) as Response;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Gemini AI provider', () => {
  it('uses structured low-thinking output and validates triage data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      geminiResponse(
        JSON.stringify({
          suggestedPriority: 'high',
          suggestedCategory: 'Billing',
          reason: 'A subscription payment was deducted without activation.',
          confidence: 0.93,
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const result = await new GeminiAiProvider(env).triageTicket(
      'Subscription not activated',
      'Payment was deducted from the customer.',
    );
    expect(result.suggestedPriority).toBe(TicketPriority.High);
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(body.generationConfig).toMatchObject({
      maxOutputTokens: 1024,
      thinkingConfig: { thinkingLevel: 'MINIMAL' },
      responseMimeType: 'application/json',
    });
    expect(body.generationConfig).not.toHaveProperty('temperature');
  });

  it('returns one complete plain-text summary from structured fields', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        geminiResponse(
          JSON.stringify({
            issue: 'The subscription payment was deducted but activation failed.',
            actionsTaken: 'None yet.',
            currentSituation: 'The customer is waiting for account activation.',
            nextStep: 'Verify the payment and activate the subscription.',
          }),
        ),
      ),
    );
    const summary = await new GeminiAiProvider(env).summarizeConversation([
      { author: 'Customer', message: 'My payment was deducted but activation failed.' },
    ]);
    expect(summary).toContain('Issue\n\nThe subscription payment was deducted');
    expect(summary).toContain('Actions taken\n\nNone yet.');
    expect(summary).not.toContain('**');
  });

  it('rejects truncated Gemini output instead of saving partial content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(geminiResponse('{"issue":"partial', 'MAX_TOKENS')),
    );
    const error = await new GeminiAiProvider(env)
      .summarizeConversation([{ author: 'Customer', message: 'Help with payment.' }])
      .catch((caught) => caught);
    expect(error).toBeInstanceOf(AiProviderError);
    expect(error.reason).toBe('invalid_response');
  });
});
