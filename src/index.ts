import { encoding_for_model, get_encoding, type Tiktoken, type TiktokenModel } from 'tiktoken';
import { fit } from '@jeremysnr/snug';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export type { ChatCompletionMessageParam };

export interface FitMessagesOptions {
  /** Token budget for the conversation. */
  budget: number;
  /** Tokens to reserve for the model's response. Defaults to 0. */
  reserve?: number;
  /**
   * OpenAI model name, used to select the matching tiktoken encoding
   * (gpt-4o and newer use o200k_base; gpt-4 and gpt-3.5-turbo use
   * cl100k_base). When omitted, cl100k_base is used. Pass the model you
   * will call so the counts match what the API bills.
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

const DEFAULT_ENCODING = 'cl100k_base';

/**
 * Per-message framing overhead in OpenAI's chat format (role and delimiter
 * tokens). Four tokens per message is the figure from OpenAI's cookbook for
 * the gpt-3.5/gpt-4 family and is close enough for budgeting; the exact
 * number varies slightly by model.
 */
const MESSAGE_OVERHEAD = 4;

/**
 * Encoders are WASM objects that are expensive to construct, so they are
 * created once per model or encoding and kept for the life of the module.
 * Call freeEncoders() to release them.
 */
const encoders = new Map<string, Tiktoken>();

function getEncoder(model?: TiktokenModel): Tiktoken {
  const key = model ? `model:${model}` : `encoding:${DEFAULT_ENCODING}`;
  let enc = encoders.get(key);
  if (!enc) {
    enc = model ? encoding_for_model(model) : get_encoding(DEFAULT_ENCODING);
    encoders.set(key, enc);
  }
  return enc;
}

/**
 * Release every cached tiktoken encoder and the WASM memory behind it.
 * The next call to fitMessages() will create encoders again as needed.
 */
export function freeEncoders(): void {
  for (const enc of encoders.values()) enc.free();
  encoders.clear();
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
 * by recency, so newer messages are kept over older ones when the budget is
 * tight. The result is ready to pass directly to client.chat.completions.create.
 */
export function fitMessages(
  messages: ChatCompletionMessageParam[],
  options: FitMessagesOptions,
): FitMessagesResult {
  const enc = getEncoder(options.model);
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
}
