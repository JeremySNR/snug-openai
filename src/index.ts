import { encoding_for_model, get_encoding, type TiktokenModel } from 'tiktoken';
import { fit } from '@jeremysnr/snug';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export type { ChatCompletionMessageParam };

export interface FitMessagesOptions {
  /** Token budget for the conversation. */
  budget: number;
  /** Tokens to reserve for the model's response. Defaults to 0. */
  reserve?: number;
  /**
   * OpenAI model name — used to select the correct tiktoken encoding.
   * Defaults to gpt-4o.
   */
  model?: TiktokenModel;
}

export interface FitMessagesResult {
  /** Messages that fit, in original order. Pass directly to the OpenAI SDK. */
  messages: ChatCompletionMessageParam[];
  tokensUsed: number;
  tokensRemaining: number;
  /** Messages that were dropped. */
  dropped: ChatCompletionMessageParam[];
}

function messageToText(msg: ChatCompletionMessageParam): string {
  if (typeof msg.content === 'string') return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content
      .map(part => ('text' in part ? part.text : ''))
      .join('');
  }
  return '';
}

/**
 * Fit an array of OpenAI chat messages into a token budget.
 *
 * System messages are always highest priority. Other messages are prioritised
 * by recency — newer messages are kept over older ones when the budget is tight.
 * The result is ready to pass directly to client.chat.completions.create.
 */
export function fitMessages(
  messages: ChatCompletionMessageParam[],
  options: FitMessagesOptions,
): FitMessagesResult {
  const enc = options.model
    ? encoding_for_model(options.model)
    : get_encoding('cl100k_base');

  // ~4 tokens per message for OpenAI's role/delimiter framing overhead.
  const MESSAGE_OVERHEAD = 4;

  try {
    const tokenizer = (text: string) => enc.encode(text).length;

    const items = messages.map((msg, i) => ({
      id: String(i),
      content: msg,
      tokens: tokenizer(messageToText(msg)) + MESSAGE_OVERHEAD,
      // system = highest priority; others prioritised by recency
      priority: msg.role === 'system' ? 10000 : i,
    }));

    const result = fit(items, {
      budget: options.budget,
      reserve: options.reserve,
      suppressApproximationWarning: true,
    });

    return {
      messages: result.included.map(i => i.content as ChatCompletionMessageParam),
      tokensUsed: result.tokensUsed,
      tokensRemaining: result.tokensRemaining,
      dropped: result.excluded.map(i => i.content as ChatCompletionMessageParam),
    };
  } finally {
    enc.free();
  }
}
