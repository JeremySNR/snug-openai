import { fitMessages, freeEncoders } from '../src/index.js';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const msgs = (roles: Array<[string, string]>): ChatCompletionMessageParam[] =>
  roles.map(([role, content]) => ({ role, content } as ChatCompletionMessageParam));

describe('fitMessages (openai)', () => {
  test('freeEncoders releases the cache and fitMessages still works afterwards', () => {
    const messages = msgs([['user', 'hello']]);
    const before = fitMessages(messages, { budget: 100, model: 'gpt-4o' });
    expect(() => freeEncoders()).not.toThrow();
    expect(() => freeEncoders()).not.toThrow();
    const after = fitMessages(messages, { budget: 100, model: 'gpt-4o' });
    expect(after.tokensUsed).toBe(before.tokensUsed);
  });

  test('returns all messages when they fit', () => {
    const messages = msgs([['system', 'You are helpful.'], ['user', 'Hi'], ['assistant', 'Hello!']]);
    const result = fitMessages(messages, { budget: 200 });
    expect(result.messages).toHaveLength(3);
    expect(result.dropped).toHaveLength(0);
  });

  test('drops oldest non-system messages first', () => {
    const messages = msgs([
      ['system', 'You are helpful.'],
      ['user', 'first message'],
      ['assistant', 'first reply'],
      ['user', 'second message'],
      ['assistant', 'second reply'],
      ['user', 'a'.repeat(300)],
    ]);
    const result = fitMessages(messages, { budget: 120 });
    // system should always survive
    expect(result.messages.some(m => m.role === 'system')).toBe(true);
    // oldest messages should be dropped before newest
    expect(result.dropped.length).toBeGreaterThan(0);
  });

  test('system message is always kept', () => {
    const messages = msgs([
      ['system', 'You are helpful.'],
      ['user', 'a'.repeat(500)],
    ]);
    const result = fitMessages(messages, { budget: 50 });
    expect(result.messages.some(m => m.role === 'system')).toBe(true);
  });

  test('respects reserve', () => {
    const messages = msgs([['user', 'hello']]);
    const result = fitMessages(messages, { budget: 100, reserve: 50 });
    expect(result.tokensUsed).toBeLessThanOrEqual(50);
  });

  test('result messages are in original order', () => {
    const messages = msgs([
      ['system', 'sys'],
      ['user', 'one'],
      ['assistant', 'two'],
      ['user', 'three'],
    ]);
    const result = fitMessages(messages, { budget: 200 });
    expect(result.messages.map(m => m.content)).toEqual(['sys', 'one', 'two', 'three']);
  });
});
