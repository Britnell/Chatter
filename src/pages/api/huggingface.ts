import type { APIRoute } from "astro";

export const prerender = false;

const huggingface_token = import.meta.env.VITE_HUGGINGFACE_TOKEN;

export const POST: APIRoute = async ({ request }) => {
  const { messages, model, maxTokens } = await request.json();

  const resp = await fetch(
    `https://api-inference.huggingface.co/models/${model}/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${huggingface_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        model,
        max_tokens: maxTokens,
        stream: false,
      }),
    }
  ).then((res) => (res.ok ? res.json() : res.text()));

  return new Response(JSON.stringify(resp), {
    headers: { "Content-Type": "application/json" },
  });
};
