import { useState, useCallback, useRef } from "preact/hooks";
import Markdown from "react-markdown";

type Message = {
  role: string;
  content: string;
};

const models = [
  {
    type: "huggingface",
    name: "Qwen Coder 32B",
    id: "Qwen/Qwen2.5-Coder-32B-Instruct",
  },
  {
    type: "huggingface",
    name: "QwQ 32B",
    id: "Qwen/QwQ-32B-Preview",
  },
  {
    type: "claude",
    name: "haiku fastest",
    id: "claude-3-haiku-20240307",
  },
  {
    type: "claude",
    name: "haiku best",
    id: "claude-3-5-haiku-20241022",
  },
  {
    type: "ollama",
    name: "deepseek coder",
    id: "deepseek-coder-v2",
  },
  {
    type: "ollama",
    name: "Qwen Coder",
    id: "qwen2.5-coder:14b",
  },
];

const queryClaude = (messages: Message[], model: string, maxTokens: number) =>
  fetch("/api/claude", {
    method: "POST",
    body: JSON.stringify({ messages, model, maxTokens }),
  }).then((res) => (res.ok ? res.json() : res.text()));

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

const queryHuggingface = (
  messages: Message[],
  model: string,
  maxTokens: number
) =>
  fetch("/api/huggingface", {
    method: "POST",
    body: JSON.stringify({ messages, model, maxTokens }),
  }).then((res) => (res.ok ? res.json() : res.text()));

export function App() {
  const [chat, setChat] = useState<Message[]>([]);
  const [model, setModel] = useState(models[2]);
  const [respLength, setRespLength] = useState(1024);
  const [currToken, setCurrentTokens] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const onPrompt = async (prompt: string) => {
    const _chat = [
      ...chat,
      {
        role: "user",
        content: prompt,
      },
    ];

    setChat(_chat);
    if (model.type === "claude") {
      const resp = await queryClaude(_chat, model.id, respLength);
      const msg = resp?.content?.[0]?.text;
      const tokens = resp?.usage?.input_tokens + resp?.usage?.output_tokens;
      setCurrentTokens((t) => t + tokens);
      setChat((c) => [...c, { role: "assistant", content: msg }]);
    }
    if (model.type === "ollama") {
      const resp = await queryOllama(_chat, model.id, respLength);
      const msg = resp.choices?.[0]?.message?.content;
      setChat((c) => [...c, { role: "assistant", content: msg }]);
    }
    if (model.type === "huggingface") {
      const resp = await queryHuggingface(_chat, model.id, respLength);
      const msg = resp?.choices?.[0]?.message.content;
      const tokens = resp?.usage?.total_tokens;
      setCurrentTokens((t) => t + tokens);
      setChat((c) => [...c, { role: "assistant", content: msg }]);
    }
  };

  const newModelChat = (m: number) => {
    setModel(models[m]);
    setChat([]);
  };

  return (
    <>
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
              <div key="empty" className=" bg-slate-200 rounded  text-center">
                <p>start YOur conversetion</p>
              </div>
            )}
            {chat.map((msg, i) => (
              <div key={i} className=" border border-slate-300">
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
                      "text-sm w-full px-2 rounded hover:bg-slate-100 text-left whitespace-pre flex gap-2 " +
                      (model.id === mod.id ? " bg-slate-200 " : " ")
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
                className="ml-auto bg-slate-100 p-1  w-16"
                value={respLength}
                onInput={(ev) => setRespLength(+ev.currentTarget.value)}
              />
            </div>
            <p className=" text-xs flex">
              tokens used
              <span className="ml-auto px-2">{currToken}</span>
            </p>
          </div>
        </aside>
      </div>
    </>
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
            className="grow p-2 w-3/4 max-w-[800px] border border-slate-500"
            rows={4}
            onKeyDown={keyEvent}
            value={textValue}
            onInput={(e) => setPrompt((e.target as HTMLTextAreaElement).value)}
          />
          <div className=" flex flex-col gap-1 p-1">
            <SpeechTranscription updateTranscript={onTranscript} />
            <button class=" px-2 border border-slate-700" type="submit">
              Send
            </button>
          </div>
        </div>
      </div>
    </form>
  );
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
      // setTranscript(transcription);
    };

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onerror = (ev: any) => {
      console.error("Speech recognition error:", ev.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      // console.log("onend ", { transcript });
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
