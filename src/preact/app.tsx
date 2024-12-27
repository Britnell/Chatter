import { useState, useCallback, useRef } from "preact/hooks";
import Markdown from "react-markdown";
import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_API, HUGGINGFACE_TOKEN } from "astro:env/client";
import { models } from "./model";

const client = new Anthropic({
  apiKey: ANTHROPIC_API,
  dangerouslyAllowBrowser: true,
});

type Message = {
  role: "user" | "assistant";
  content: string;
};

const queryClaude = async (
  messages: Message[],
  model: string,
  maxTokens: number,
  onStream: (ans: string) => void
) => {
  const stream = await client.messages.create({
    // max_tokens: 20,
    max_tokens: maxTokens,
    model,
    messages,
    stream: true,
  });
  let answer = "";
  for await (const chunk of stream) {
    if (chunk.type === "content_block_delta") {
      // @ts-ignore
      answer += chunk.delta.text;
      onStream(answer);
    }
  }
};

const queryOllama = (messages: Message[], model: string, maxTokens: number) =>
  fetch("http://localhost:11434/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      messages,
      maxTokens,
    }),
  }).then((res) => (res.ok ? res.json() : res.text()));

const queryHuggingface = async (
  messages: Message[],
  model: string,
  maxTokens: number,
  onStream: (answ: string) => void
) => {
  const resp = await fetch(
    `https://api-inference.huggingface.co/models/${model}/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        model,
        max_tokens: maxTokens,
        stream: true,
      }),
    }
  );
  readStream(resp, onStream);
};

const readStream = async (
  response: Response,
  onStream: (answ: string) => void
) => {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let answer = "";
  let chunks = 0;

  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");

    lines.forEach((line) => {
      if (!line.trim()) return;
      if (!line.startsWith("data: ")) return;
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

export function App() {
  const [chat, setChat] = useState<Message[]>([]);
  const [model, setModel] = useState(models[0]);
  const [respLength, setRespLength] = useState(512);
  const scrollRef = useRef<HTMLDivElement>(null);

  const onPrompt = async (prompt: string) => {
    const _chat = [
      ...chat,
      {
        role: "user",
        content: prompt,
      } as const,
    ];

    setChat(_chat);
    if (model.type === "claude") {
      setChat((c) => [...c, { role: "assistant", content: "" }]);
      queryClaude(_chat, model.id, respLength, (answ: string) => {
        setChat((c) =>
          c.map((ch, i) => (i === c.length - 1 ? { ...ch, content: answ } : ch))
        );
      });
    }
    if (model.type === "ollama") {
      const resp = await queryOllama(_chat, model.id, respLength);
      const msg = resp.choices?.[0]?.message?.content;
      setChat((c) => [...c, { role: "assistant", content: msg }]);
    }
    if (model.type === "huggingface") {
      setChat((c) => [...c, { role: "assistant", content: "" }]);
      queryHuggingface(_chat, model.id, respLength, (steamAns: string) => {
        setChat((c) =>
          c.map((ch, i) =>
            i === c.length - 1 ? { ...ch, content: steamAns } : ch
          )
        );
      });
    }
  };

  const newModelChat = (m: number) => {
    setModel(models[m]);
    setChat([]);
  };

  return (
    <div className=" bg-stone-400">
      <header className=" py-2 flex justify-between">
        <span>Chatter</span>
        <div>
          <ModelIcon type={model.type} />
          <span>{model.name}</span>
        </div>
        <span></span>
      </header>
      <div className="grid grid-cols-[1fr_4fr_1fr] gap-2">
        <div></div>

        <main className=" h-[calc(100vh-40px)] flex flex-col  ">
          <div ref={scrollRef} className=" grow  space-y-4  overflow-auto  ">
            {chat.length === 0 && (
              <div key="empty" className=" bg-stone-300 rounded  text-center">
                <p>start YOur conversetion</p>
              </div>
            )}
            {chat.map((msg, i) => (
              <div key={i} className=" border border-stone-700">
                <span>{msg.role}</span>
                <Markdown>{msg.content}</Markdown>
              </div>
            ))}
          </div>
          <div className=" p-2 row-start-3 ">
            <Prompter onPrompt={onPrompt} />
          </div>
        </main>
        <aside className="p-2  space-y-6 ">
          <div>
            <h2>Model</h2>
            <ul>
              {models.map((mod, m) => (
                <li key={mod.id}>
                  <button
                    onClick={() => newModelChat(m)}
                    className={
                      "text-sm w-full px-2 rounded hover:bg-stone-300 hover:bg-opacity-50 text-left whitespace-pre flex gap-2 " +
                      (model.id === mod.id ? " bg-stone-300 " : " ")
                    }
                  >
                    <ModelIcon type={mod.type} />
                    {mod.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="  space-y-2">
            <h2>settings</h2>
            <div className="text-xs flex gap-2 items-center">
              <label className=" ">{"max tokens"}</label>
              <input
                type="number"
                className="ml-auto bg-stone-300 p-1  w-16"
                value={respLength}
                onInput={(ev) => setRespLength(+ev.currentTarget.value)}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

const ModelIcon = ({ type }: { type: string }) => (
  <span className="">
    {
      {
        claude: "✴",
        ollama: "🦙",
        huggingface: "🤗",
      }[type]
    }
  </span>
);

function Prompter({ onPrompt }: { onPrompt: (p: string) => void }) {
  const [prompt, setPrompt] = useState("");
  const [transcript, setTranscript] = useState("");

  const textValue = prompt + (transcript ? `\n${transcript}` : "");

  const onTranscript = (tx: string, final: boolean) => {
    setTranscript(tx);
    if (final) {
      setPrompt((p) => `${p}\n${tx}`);
      setTranscript("");
    }
  };

  const submitPrompt = () => {
    setPrompt("");
    // DISABLE
    const resp = onPrompt(prompt);
    // ENABLE
  };

  const onSubmit = (ev: SubmitEvent) => {
    ev.preventDefault();
    submitPrompt();
  };

  const keyEvent = (ev: KeyboardEvent) => {
    const ctrlKey = ev.ctrlKey || ev.metaKey;
    if (ev.key === "Enter" && ctrlKey) {
      ev.preventDefault();
      submitPrompt();
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <div className=" max-w-[800px] mx-auto">
        <div className=" w-full flex">
          <textarea
            name="prompt"
            className="grow p-2 w-3/4 max-w-[800px] border border-stone-700 bg-transparent"
            rows={4}
            onKeyDown={keyEvent}
            value={textValue}
            onInput={(e) => setPrompt((e.target as HTMLTextAreaElement).value)}
          />
          <div className=" flex flex-col gap-1 p-1">
            <SpeechTranscription updateTranscript={onTranscript} />
            <button class=" px-2 border border-stone-700" type="submit">
              Send
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const SpeechTranscription = ({
  updateTranscript,
}: {
  updateTranscript: (tx: string, final: boolean) => void;
}) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      alert("Speech recognition is not supported in this browser");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcription = event.results[current][0].transcript;
      const final = event.results[current].isFinal;
      if (final) setIsListening(false);
      updateTranscript(transcription, final);
    };

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onerror = (ev: any) => {
      setIsListening(false);
    };

    recognition.start();

    return () => {
      recognition.stop();
    };
  }, []);

  return (
    <button
      type="button"
      class=" px-2 border border-slate-700"
      onClick={() => {
        if (!isListening) startListening();
        else {
          recognitionRef.current?.stop();
          setIsListening(false);
        }
      }}
    >
      {isListening ? "Stop" : "Record"}
    </button>
  );
};

export default SpeechTranscription;
