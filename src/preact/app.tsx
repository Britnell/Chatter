import { useState, useRef } from "preact/hooks";
import Markdown from "react-markdown";
import { models, queryClaude, queryHuggingface } from "./model";
import Prompter from "./Prompter";
import { speakText, useReader } from "./reader";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

export function App() {
  const [chat, setChat] = useState<Message[]>([]);
  const [model, setModel] = useState(models[0]);
  const [respLength, setRespLength] = useState(512);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [readResp, setReadResp] = useState(false);

  const reader = useReader();

  const onPrompt = async (prompt: string) => {
    const _chat: Message[] = [
      ...chat,
      {
        role: "user",
        content: prompt,
      },
    ];

    setChat([..._chat, { role: "assistant", content: "" }]);
    if (readResp) reader.restart();

    const onStream = (answ: string) => {
      if (readResp) reader.readStream(answ);
      setChat((c) =>
        c.map((ch, i) => (i === c.length - 1 ? { ...ch, content: answ } : ch))
      );
    };

    if (model.type === "claude") {
      await queryClaude(_chat, model.id, respLength, onStream);
    }

    if (model.type === "huggingface") {
      await queryHuggingface(_chat, model.id, respLength, onStream);
    }

    if (readResp) reader.endOfStream();

    // if (model.type === "ollama") {
    //   const resp = await queryOllama(_chat, model.id, respLength);
    //   const msg = resp.choices?.[0]?.message?.content;
    //   setChat((c) =>
    //     c.map((ch, i) => (i === c.length - 1 ? { ...ch, content: msg } : ch))
    //   );
    // }
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
        <div>.</div>

        <main className="  h-[calc(100vh-40px)] max-w-5xl flex flex-col pt-2">
          <div ref={scrollRef} className=" grow  space-y-4  overflow-auto  ">
            {chat.length === 0 && (
              <div key="empty" className=" bg-stone-300 rounded  text-center">
                <p>start YOur conversetion</p>
              </div>
            )}
            {chat.map((msg, i) => (
              <div
                key={i}
                className={
                  "  max-w-[70ch] " +
                  (msg.role === "assistant" ? " ml-auto " : "")
                }
              >
                <span className="px-3 ">{msg.role}</span>
                <div className=" bg-stone-300 rounded-lg px-3 py-2 ">
                  <Markdown>{msg.content}</Markdown>
                </div>
              </div>
            ))}
          </div>
          <Prompter onPrompt={onPrompt} />
        </main>

        <aside className="p-2  space-y-6 flex flex-col justify-center items-stretch ">
          <div>
            <h2>Model</h2>
            <ul>
              {models.map((mod, m) => (
                <li key={mod.id}>
                  <button
                    onClick={() => newModelChat(m)}
                    className={
                      "text-sm w-full px-2 rounded hover:bg-stone-300 hover:bg-opacity-50 text-left text-stone-700 whitespace-pre flex gap-2 " +
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
                onChange={(ev) => setRespLength(+ev.currentTarget.value)}
              />
            </div>
            <div className="x">
              <input
                type="checkbox"
                id="readResp"
                checked={readResp}
                onChange={(ev) => {
                  setReadResp((ev.target as HTMLInputElement).checked);
                }}
              />
              <label for="readResp">Read answers</label>
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

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
