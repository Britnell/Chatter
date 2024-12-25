import type { APIRoute } from "astro";
import Anthropic from "@anthropic-ai/sdk";

export const prerender = false;

console.log(import.meta.env["ANTHROPIC_API_KEY"]);

const client = new Anthropic({
  apiKey: import.meta.env["ANTHROPIC_API_KEY"], // This is the default and can be omitted
});

export const POST: APIRoute = async ({ request }) => {
  const { messages, model, maxTokens } = await request.json();
  console.log({ messages, model, maxTokens });
  const resp = await client.messages.create({
    max_tokens: maxTokens,
    model,
    messages,
  });
  console.log(resp);

  return new Response(JSON.stringify(resp), {
    headers: { "Content-Type": "application/json" },
  });
};
