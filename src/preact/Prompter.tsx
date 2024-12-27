import { useCallback, useRef, useState } from "preact/hooks";

export default function Prompter({
  onPrompt,
}: {
  onPrompt: (p: string) => void;
}) {
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
    onPrompt(prompt);
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
