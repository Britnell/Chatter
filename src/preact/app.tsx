import { useState, useRef, useCallback, useEffect } from 'preact/hooks';
import Markdown from 'react-markdown';
import { models, queryClaude, queryHuggingface, queryGoogle } from './model';
import Prompter from './Prompter';
import { useReader } from './reader';
import { useVoiceReader } from './voiceread';
import { useVoiceRecognition } from './voice';
import { useTextToSpeech } from './tts';

export type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export function App() {
  const [chat, setChat] = useState<Message[]>([]);
  const chatRef = useRef<Message[]>([]);
  const [model, setModel] = useState(models[4]);
  const [respLength, setRespLength] = useState(2048);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [readResp, setReadResp] = useState(false);
  const [voiceMode, setVoiceMode] = useState(true);
  const [voiceModeStatus, setVoiceModeStatus] = useState<'idle' | 'record' | 'reply'>('idle');

  // Keep chatRef in sync with chat state
  useEffect(() => {
    chatRef.current = chat;
  }, [chat]);

  const reader = useReader();

  const onVoiceComplete = () => {
    if (voiceMode) {
      setVoiceModeStatus('idle');
      setTimeout(() => startListening(), 500);
    }
  };

  const { readStream, restart, endOfStream } = useVoiceReader(onVoiceComplete);

  const onVoice = useCallback(
    async (tx: string, final: boolean) => {
      console.log({ tx, final });

      const _chat = [...chatRef.current];
      const lastChat = _chat.length - 1;

      if (_chat.length === 0 || _chat[lastChat].role === 'assistant') {
        _chat.push({ role: 'user', content: tx });
      } else {
        _chat[lastChat] = { role: 'user', content: tx };
      }

      setChat(_chat);

      if (final) {
        restart();
        setVoiceModeStatus('reply');

        setChat([..._chat, { role: 'assistant', content: '' }]);

        await makeQuery(_chat, model.id, respLength, (answ: string) => {
          setChat((c) => c.map((ch, i) => (i === c.length - 1 ? { ...ch, content: answ } : ch)));
          readStream(answ);
        });

        endOfStream();
        // Note: voiceModeStatus will be set back to 'idle' in onVoiceComplete when TTS finishes
      }
    },
    [model.id, respLength, restart, readStream, endOfStream],
  );

  const { isListening, isSupported, startListening, stopListening } = useVoiceRecognition(voiceMode, onVoice);

  // Update voiceModeStatus when listening state changes
  useEffect(() => {
    if (voiceMode && isListening) {
      setVoiceModeStatus('record');
    }
  }, [isListening, voiceMode]);

  async function makeQuery(chat: Message[], modelid: string, maxTokens: number, onStream: (answ: string) => void) {
    if (model.type === 'claude') {
      await queryClaude(chat, modelid, maxTokens, onStream);
    }

    if (model.type === 'huggingface') {
      await queryHuggingface(chat, modelid, maxTokens, onStream);
    }

    if (model.type === 'google') {
      await queryGoogle(chat, modelid, maxTokens, onStream);
    }
  }

  const onPrompt = async (prompt: string) => {
    const _chat: Message[] = [
      ...chat,
      {
        role: 'user',
        content: prompt,
      },
    ];

    setChat([..._chat, { role: 'assistant', content: '' }]);
    if (readResp) reader.restart();

    const onStream = (answ: string) => {
      if (readResp) reader.readStream(answ);
      setChat((c) => c.map((ch, i) => (i === c.length - 1 ? { ...ch, content: answ } : ch)));
    };

    await makeQuery(_chat, model.id, respLength, onStream);
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
        {/* <button onClick={() => speak('hello, how are you? lorem ipsum dim sum hong kong dollar.')}>xxx</button> */}
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
              <div key={i} className={'  max-w-[70ch] ' + (msg.role === 'assistant' ? ' ml-auto ' : '')}>
                <span className="px-3 ">{msg.role}</span>
                <div className=" bg-stone-300 rounded-lg px-3 py-2 ">
                  <Markdown>{msg.content}</Markdown>
                </div>
              </div>
            ))}
          </div>
          {voiceMode ? (
            <div className="flex justify-center items-center py-8">
              {!isSupported ? (
                <div className="text-center text-stone-600">
                  <p>Voice recognition not supported</p>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  {voiceModeStatus === 'record' ? (
                    // Big white circle when listening
                    <div className="w-24 h-24 bg-white rounded-full shadow-lg animate-pulse flex items-center justify-center">
                      <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                  ) : voiceModeStatus === 'reply' ? (
                    // Large "..." when AI is replying
                    <div className="text-6xl text-stone-700 font-bold animate-pulse">...</div>
                  ) : (
                    // Start voice button when idle
                    <button
                      onClick={startListening}
                      className="w-20 h-20 bg-stone-600 hover:bg-stone-700 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-105 flex items-center justify-center"
                    >
                      <svg
                        className="w-8 h-8"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  )}

                  {/* Status text */}
                  <div className="text-center text-stone-600">
                    {voiceModeStatus === 'record' ? (
                      <p className="text-lg font-medium">Listening...</p>
                    ) : voiceModeStatus === 'reply' ? (
                      <p className="text-lg font-medium">AI is responding...</p>
                    ) : (
                      <p className="text-sm">Tap to start voice chat</p>
                    )}
                  </div>

                  {/* Stop button when listening */}
                  {voiceModeStatus === 'record' && (
                    <button
                      onClick={stopListening}
                      className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm transition-colors duration-200"
                    >
                      Stop Listening
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Prompter onPrompt={onPrompt} />
          )}
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
                      'text-sm w-full px-2 rounded hover:bg-stone-300 hover:bg-opacity-50 text-left text-stone-700 whitespace-pre flex gap-2 ' +
                      (model.id === mod.id ? ' bg-stone-300 ' : ' ')
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
              <label className=" ">{'max tokens'}</label>
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
            <div className="x">
              <input
                type="checkbox"
                id="voiceMode"
                checked={voiceMode}
                onChange={(ev) => {
                  setVoiceMode((ev.target as HTMLInputElement).checked);
                }}
              />
              <label for="voiceMode">Voice mode</label>
            </div>
            <div className="x">
              <button onClick={reader.stopReading}>stop reading</button>
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
        claude: '✴',
        ollama: '🦙',
        huggingface: '🤗',
        google: 'G',
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
