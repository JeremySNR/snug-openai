# @jeremysnr/snug-openai

[![npm](https://img.shields.io/npm/v/@jeremysnr/snug-openai)](https://www.npmjs.com/package/@jeremysnr/snug-openai)
[![license](https://img.shields.io/npm/l/@jeremysnr/snug-openai)](./LICENSE)

Fit OpenAI chat messages into a token budget. Pass the result directly to `client.chat.completions.create`.

```ts
import { fitMessages } from '@jeremysnr/snug-openai';

const { messages } = fitMessages(conversationHistory, {
  model: 'gpt-4o',
  budget: 8192,
  reserve: 1024,
});

const response = await client.chat.completions.create({ model: 'gpt-4o', messages });
```

System messages are always kept. Other messages are prioritised by recency — older messages are dropped first when the budget is tight.

## Install

```
npm install @jeremysnr/snug-openai
```

`openai` must be installed as a peer dependency.

## API

### `fitMessages(messages, options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `budget` | `number` | — | Token limit |
| `reserve` | `number` | `0` | Tokens to hold back for the model's reply |
| `model` | `TiktokenModel` | `'gpt-4o'` | Used to select the tiktoken encoding |

**Returns**

```ts
{
  messages: ChatCompletionMessageParam[];  // ready to send
  dropped: ChatCompletionMessageParam[];   // what didn't fit
  tokensUsed: number;
  tokensRemaining: number;
}
```

## Part of the snug ecosystem

- [`@jeremysnr/snug`](https://github.com/JeremySNR/snug) — zero-dependency core primitive
- [`@jeremysnr/snug-tiktoken`](https://github.com/JeremySNR/snug-tiktoken) — snug with tiktoken, model-agnostic
- [`@jeremysnr/snug-anthropic`](https://github.com/JeremySNR/snug-anthropic) — snug for the Anthropic SDK

## Licence

MIT
