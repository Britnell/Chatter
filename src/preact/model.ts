import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API, HUGGINGFACE_TOKEN, ELEVEN_KEY, GOOGLE_API } from 'astro:env/client';
import type { Message } from './app';

// HF inference warm models :
// https://huggingface.co/models?inference=warm&sort=trending
//    "Qwen/QwQ-32B-Preview",

export const models = [
  // {
  //   type: "huggingface",
  //   name: "xx",
  //   id: "deepseek-ai/DeepSeek-R1-Distill-Llama-70B",
  // },
  {
    type: 'huggingface',
    name: 'Deepseek R1 32B',
    id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
  },
  {
    type: 'huggingface',
    name: 'Qwen Coder 32B',
    id: 'Qwen/Qwen2.5-Coder-32B-Instruct',
  },
  {
    type: 'huggingface',
    name: 'Gemma 3 27b',
    id: 'google/gemma-3-27b-it',
  },
  // {
  //   type: "huggingface",
  //   name: "OLMo 2 32B",
  //   id: "allenai/OLMo-2-0325-32B-Instruct",
  // },
  {
    type: 'huggingface',
    name: 'Qwen 2.5 72B',
    id: 'Qwen/Qwen2.5-72B-Instruct',
  },
  {
    type: 'claude',
    name: 'haiku 3.5',
    id: 'claude-3-5-haiku-latest',
  },
  {
    type: 'claude',
    name: 'Sonnet 3.7',
    id: 'claude-3-7-sonnet-latest',
    // anthropic.claude-3-7-sonnet-20250219-v1:0	claude-3-7-sonnet@20250219
  },
  {
    type: 'claude',
    name: 'Sonnet 4.0',
    id: 'claude-sonnet-4-0',
  },
  {
    type: 'google',
    name: 'Gemini 2.5 Pro',
    id: 'gemini-2.5-pro',
  },
  {
    type: 'google',
    name: 'Gemini 2.5 flash',
    id: 'gemini-2.5-flash',
  },
  {
    type: 'google',
    name: 'Gemini 2.5 flash lite',
    id: 'gemini-2.5-flash-lite-preview-06-17',
  },

  // {
  //   type: 'google',
  //   name: 'Gemini 2.0 flash',
  //   id: 'gemini-2.0-flash',
  // },
];

export const queryHuggingface = async (
  messages: Message[],
  model: string,
  maxTokens: number,
  onStream: (answ: string) => void,
) => {
  const resp = await fetch(`https://api-inference.huggingface.co/models/${model}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HUGGINGFACE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      model,
      max_tokens: maxTokens,
      stream: true,
    }),
  });
  return readStream(resp, onStream);
};

const readStream = async (response: Response, onStream: (answ: string) => void) => {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let answer = '';
  let chunks = 0;

  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    lines.forEach((line) => {
      if (!line.trim()) return;
      if (!line.startsWith('data: ')) return;
      const jsonStr = line.slice(5);
      try {
        const data = JSON.parse(jsonStr);
        const content = data.choices[0]?.delta?.content;
        if (content) {
          answer += content;
          chunks++;
          if (chunks % 2 === 0) {
            onStream(answer);
          }
        }
      } catch {}
    });
  }
  return answer;
};

const client = new Anthropic({
  apiKey: ANTHROPIC_API,
  dangerouslyAllowBrowser: true,
});

export const queryClaude = async (
  messages: Message[],
  model: string,
  maxTokens: number,
  onStream: (ans: string) => void,
) => {
  const stream = await client.messages.create({
    // max_tokens: 20,
    max_tokens: maxTokens,
    model,
    messages,
    stream: true,
  });
  let answer = '';
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta') {
      // @ts-ignore
      answer += chunk.delta.text;
      onStream(answer);
    }
  }
  return answer;
};

export const queryOllama = (messages: Message[], model: string, maxTokens: number) =>
  fetch('http://localhost:11434/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages,
      maxTokens,
    }),
  }).then((res) => (res.ok ? res.json() : res.text()));

const voiceid = 'VuJ05kimyrfnJmOxLh2k';

export const queryEleven = (text: string) =>
  fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceid}` + '?output_format=mp3_22050_32', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'xi-api-key': ELEVEN_KEY ?? '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_monolingual_v1',
    }),
  })
    .then((resp) => resp.blob())
    .then((blob) => window.URL.createObjectURL(blob));

export const queryElevenStream = async (text: string) => {
  const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceid}/stream`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'xi-api-key': ELEVEN_KEY ?? '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_monolingual_v1',
    }),
  });

  if (!resp.ok || !resp.body) {
    throw new Error(`HTTP error! status: ${resp.status}`);
  }

  const reader = resp.body.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    chunks.push(value);
  }

  // Combine all chunks into a single Uint8Array
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const combinedChunks = new Uint8Array(totalLength);
  let position = 0;

  for (const chunk of chunks) {
    combinedChunks.set(chunk, position);
    position += chunk.length;
  }

  // Convert to blob and create URL
  const blob = new Blob([combinedChunks], { type: 'audio/mpeg' });
  return window.URL.createObjectURL(blob);
};

export const queryGoogle = async (
  messages: Message[],
  model: string,
  maxTokens: number,
  onStream: (answ: string) => void,
) => {
  // Convert messages to OpenAI format for Gemini compatibility
  const openAIMessages = messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GOOGLE_API}`,
    },
    body: JSON.stringify({
      model,
      messages: openAIMessages,
      max_tokens: maxTokens,
      stream: true,
    }),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Google API error: ${resp.status} ${errorText}`);
  }

  return readStream(resp, onStream);
};
