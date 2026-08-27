import { TicketPriority } from '@pente/shared';
import { AiProvider, TriageResult } from './ai-provider';

export class MockAiProvider implements AiProvider {
  async summarizeConversation(messages: Array<{ author: string; message: string }>) {
    const latest = messages.at(-1)?.message ?? 'No customer message is available.';
    return [
      'Issue',
      latest.slice(0, 240),
      'Actions Taken',
      'The conversation was reviewed in local demonstration mode.',
      'Current Situation',
      'The ticket remains available for staff action.',
      'Next Step',
      'A staff member should confirm the appropriate resolution.',
    ].join('\n\n');
  }

  async triageTicket(subject: string): Promise<TriageResult> {
    const financial = /payment|billing|charged|refund|deducted/i.test(subject);
    return {
      suggestedPriority: financial ? TicketPriority.High : TicketPriority.Medium,
      suggestedCategory: financial ? 'Billing' : 'General Support',
      reason: financial
        ? 'The ticket describes a financial issue that should receive prompt human review.'
        : 'The ticket needs standard support review.',
      confidence: financial ? 0.91 : 0.78,
    };
  }
}
