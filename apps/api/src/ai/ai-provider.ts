import { TicketPriority } from '@pente/shared';

export interface TriageResult {
  suggestedPriority: TicketPriority;
  suggestedCategory: string;
  reason: string;
  confidence: number;
}

export interface AiProvider {
  summarizeConversation(messages: Array<{ author: string; message: string }>): Promise<string>;
  triageTicket(subject: string, description: string): Promise<TriageResult>;
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    public reason: 'disabled' | 'timeout' | 'rate_limited' | 'provider_error' | 'invalid_response',
  ) {
    super(message);
  }
}
