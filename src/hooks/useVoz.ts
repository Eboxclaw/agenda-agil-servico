import { useCallback, useEffect, useRef, useState } from "react";

/** Tipos do Web Speech API (não vêm incluídos no TypeScript) */
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type EstadoVoz = "parada" | "aouvir" | "processando" | "erro";

type Opcoes = {
  idioma?: string;
  continua?: boolean;
  aoResultadoParcial?: (texto: string) => void;
};

function obterSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useVoz(opcoes: Opcoes = {}) {
  const { idioma = "pt-PT", continua = false, aoResultadoParcial } = opcoes;

  const [estado, setEstado] = useState<EstadoVoz>("parada");
  const [erro, setErro] = useState<string | null>(null);
  const [transcricao, setTranscricao] = useState("");
  const reconhecimento = useRef<SpeechRecognitionInstance | null>(null);
  const reiniciarRef = useRef(false);

  const SpeechRecognitionClass = obterSpeechRecognition();
  const suportado = SpeechRecognitionClass !== null;

  const parar = useCallback(() => {
    reiniciarRef.current = false;
    if (reconhecimento.current) {
      try {
        reconhecimento.current.stop();
      } catch {
        /* ignora se já parou */
      }
      reconhecimento.current = null;
    }
    setEstado("parada");
  }, []);

  const iniciar = useCallback(() => {
    if (!SpeechRecognitionClass) {
      setErro("Reconhecimento de voz não suportado neste navegador.");
      setEstado("erro");
      return;
    }

    parar();

    const recognition = new SpeechRecognitionClass();
    recognition.lang = idioma;
    recognition.continuous = continua;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result && result.isFinal && result[0]) {
          final += result[0].transcript;
        }
      }
      if (final) {
        setTranscricao((prev) => prev + final);
        aoResultadoParcial?.(final);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (
        event.error === "no-speech" ||
        event.error === "aborted" ||
        event.error === "audio-capture"
      ) {
        return;
      }
      setErro(`Erro: ${event.error}`);
      setEstado("erro");
    };

    recognition.onend = () => {
      if (reiniciarRef.current) {
        try {
          recognition.start();
        } catch {
          /* ignora */
        }
      } else {
        setEstado("parada");
      }
    };

    reconhecimento.current = recognition;
    reiniciarRef.current = continua;
    setEstado("aouvir");
    setErro(null);
    setTranscricao("");
    try {
      recognition.start();
    } catch {
      setEstado("erro");
    }
  }, [idioma, continua, parar, aoResultadoParcial, SpeechRecognitionClass]);

  useEffect(() => {
    return () => {
      reiniciarRef.current = false;
      if (reconhecimento.current) {
        try {
          reconhecimento.current.stop();
        } catch {
          /* ignora */
        }
      }
    };
  }, []);

  return {
    estado,
    erro,
    transcricao,
    suportado,
    iniciar,
    parar,
    alternar: estado === "aouvir" ? parar : iniciar,
  };
}