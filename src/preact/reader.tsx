import { useRef } from "preact/hooks";

const splitIntoSentences = (text: string): string[] => {
  const sentncs = text.split(/[.!?]/);
  const subs = sentncs[0].split(",");
  return [subs[0], subs.slice(1).join(","), ...sentncs.slice(1)].filter(
    Boolean
  );
};

// const x = splitIntoSentences("Love is a complex and multifaceted emotion that can be difficult to define precisely as it can mean different things to different people" console.log(x);

export const speakText = (text: string) => {
  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-GB";
    utterance.pitch = 1;
    utterance.onend = () => resolve(null);
    window.speechSynthesis.speak(utterance);
  });
};

export const useReader = () => {
  const sentences = useRef<string[]>([]);
  const sntncsIndex = useRef(0);
  const reading = useRef(false);
  const streamComplete = useRef(false);

  const restart = () => {
    sentences.current = [];
    sntncsIndex.current = 0;
    reading.current = false;
    streamComplete.current = false;
  };

  const endOfStream = () => {
    streamComplete.current = true;
  };

  const stopReading = () => {
    reading.current = false;
    window.speechSynthesis.cancel();
  };

  function readStream(text: string) {
    const split = splitIntoSentences(text);

    const withoutLast = split.slice(0, -1);
    if (withoutLast.length > sentences.current.length) {
      sentences.current = withoutLast;
      if (!reading.current) {
        reading.current = true;
        readingLoop();
      }
      //   console.log("s", split[split.length - 1]);
    }
    //
  }

  const readingLoop = async () => {
    const next = sentences.current[sntncsIndex.current];
    await speakText(next);
    sntncsIndex.current++;

    if (
      reading.current &&
      streamComplete.current &&
      sntncsIndex.current >= sentences.current.length
    ) {
      return;
    }

    readingLoop();
  };

  return {
    reading,
    readStream,
    restart,
    endOfStream,
    stopReading,
  };
};
