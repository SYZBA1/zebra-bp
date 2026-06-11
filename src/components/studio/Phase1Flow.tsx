import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, MicOff, Languages, ArrowLeft, Volume2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PHASE1_QUESTIONS } from "@/prompts/phase1Questions";
import { PHASE1_SYSTEM_PROMPT } from "@/prompts/phase1SystemPrompt";

const TrafficLight = ({ status }: { status: "green" | "yellow" | "red" }) => {
  return (
    <div className="relative w-24 h-64 bg-slate-900 rounded-full shadow-2xl p-3 flex flex-col justify-center items-center gap-3"
      style={{
        perspective: "1000px",
      }}>
      {["red", "yellow", "green"].map((light) => (
        <div
          key={light}
          className={`w-16 h-16 rounded-full transition-all duration-500 shadow-lg ${
            light === "red" ? "bg-red-500" : light === "yellow" ? "bg-yellow-400" : "bg-green-500"
          } ${
            status === "red" && light === "red" ? "opacity-100 shadow-red-500/50" :
            status === "yellow" && light === "yellow" ? "opacity-100 shadow-yellow-400/50" :
            status === "green" && light === "green" ? "opacity-100 shadow-green-500/50" :
            "opacity-20"
          }`}
          style={{
            boxShadow: status === light ? `0 0 30px currentColor, inset 0 0 20px rgba(255,255,255,0.3)` : "none"
          }}
        />
      ))}
    </div>
  );
};

const Phase1Flow = () => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<"en" | "am">("en");
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [recommendationStatus, setRecommendationStatus] = useState<"green" | "yellow" | "red">("green");
  const [languageFlip, setLanguageFlip] = useState(false);
  const navigate = useNavigate();

  const t = (en: string, am: string) => (language === "en" ? en : am);
  const currentQuestion = PHASE1_QUESTIONS[step];

  const startVoiceRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice recording not supported in your browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === "en" ? "en-US" : "am-ET";
    recognition.continuous = true;
    recognition.interimResults = true;

    let transcript = "";

    recognition.onstart = () => {
      setIsRecording(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: transcript }));
    };

    recognition.onerror = (event: any) => {
      setError(`Recording error: ${event.error}`);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    setTimeout(() => recognition.stop(), 30000);
  };

  const handleAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleNext = () => {
    const answer = answers[currentQuestion.id]?.trim();

    if (!answer) {
      setError("Please answer this question to continue.");
      return;
    }

    setError(null);

    if (step + 1 < PHASE1_QUESTIONS.length) {
      setStep(step + 1);
      return;
    }

    generateRecommendation();
  };

  const generateRecommendation = async () => {
    setIsSaving(true);
    setError(null);

    const values = PHASE1_QUESTIONS.map((question) => ({
      question: question.question,
      answer: answers[question.id] ?? "",
    }));

    try {
      const response = await supabase.functions.invoke("chat-assistant", {
        body: {
          conversationId: "phase1-questionnaire",
          message: JSON.stringify({
            systemPrompt: PHASE1_SYSTEM_PROMPT,
            questions: values,
          }),
          language: "en",
        },
      });

      const content = (response.data as any)?.content || "";
      setSummary(content);

      const statusMatch = content.match(/🟢|🟡|🔴/);
      if (statusMatch) {
        if (statusMatch[0] === "🟢") setRecommendationStatus("green");
        else if (statusMatch[0] === "🟡") setRecommendationStatus("yellow");
        else setRecommendationStatus("red");
      }
    } catch (invokeError) {
      console.error(invokeError);
      setError("Unable to generate your recommendation. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestart = () => {
    setStep(0);
    setAnswers({});
    setSummary(null);
    setError(null);
  };

  const playVoiceRecommendation = () => {
    if (!summary) return;
    setIsPlayingVoice(true);
    const utterance = new SpeechSynthesisUtterance(summary);
    utterance.lang = language === "en" ? "en-US" : "am-ET";
    utterance.onend = () => setIsPlayingVoice(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleLanguageToggle = () => {
    setLanguageFlip(true);
    setTimeout(() => {
      setLanguage(language === "en" ? "am" : "en");
      setLanguageFlip(false);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col overflow-hidden">
      <header className="relative z-20 h-16 flex items-center px-4 sm:px-6 justify-between shrink-0 border-b border-slate-700/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-white"
            onClick={() => navigate("/studio")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-display text-base sm:text-lg font-bold tracking-tighter text-white">
            {t("ZI Assessment", "ዝብላ ግምገማ")}
          </span>
        </div>
        <button
          onClick={handleLanguageToggle}
          className={`flex items-center gap-1 text-xs font-mono px-3 py-1.5 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all duration-300 ${languageFlip ? "scale-95 opacity-50" : "scale-100"}`}
        >
          <Languages className="h-3.5 w-3.5" />
          {language === "en" ? "EN" : "አማ"}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Zebra Stripes Progress */}
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-3">
                {PHASE1_QUESTIONS.map((q, idx) => (
                  <div key={q.id} className="relative h-16 group">
                    <div
                      className={`absolute inset-0 rounded-xl transition-all duration-500 ${
                        idx < step ? "bg-green-500/20 border-green-500/50" :
                        idx === step ? "bg-orange-500/30 border-orange-400 shadow-lg shadow-orange-500/50" :
                        "bg-slate-800/50 border-slate-700"
                      } border backdrop-blur-sm`}
                      style={{
                        transform: idx === step ? "translateZ(20px)" : "translateZ(0)",
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-between px-4">
                        <span className="text-sm font-semibold text-white">
                          Q{idx + 1}
                        </span>
                        <span className="text-xs text-slate-400 truncate flex-1 mx-4">
                          {q.question.substring(0, 40)}...
                        </span>
                        {idx < step && (
                          <span className="text-green-400 font-bold">✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ZI thinking loader */}
              {isSaving && !summary && (
                <div className="rounded-2xl border border-orange-500/20 bg-slate-900/50 p-6 backdrop-blur-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shrink-0 animate-pulse shadow-lg shadow-orange-500/30">
                    <span className="text-white font-black text-sm">ZI</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-orange-400">{t("ZI is analyzing your answers…", "ZI መልሶችዎን እየተነተነ ነው…")}</p>
                    <div className="flex gap-1 mt-2">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {!summary ? (
                <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-8 backdrop-blur-sm space-y-6">
                  <div className="space-y-3">
                    <p className="text-sm uppercase tracking-widest text-orange-400 font-semibold">Q{step + 1}/{PHASE1_QUESTIONS.length}</p>
                    <h2 className="text-3xl font-bold text-white">{currentQuestion.question}</h2>
                  </div>

                  <div className="space-y-4">
                    {!currentQuestion.options?.length && (
                      <button
                        type="button"
                        onClick={startVoiceRecording}
                        className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                          isRecording
                            ? "bg-red-500/80 text-white scale-105"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        {isRecording ? t("Stop Recording", "녹음 ማቆም") : t("Record Voice", "ድምጽ 녹音")}
                      </button>
                    )}
                    {currentQuestion.options?.length ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {currentQuestion.options.map((option) => (
                          <button
                            key={option}
                            type="button"
                            className={`rounded-xl px-4 py-3 text-left text-sm font-medium transition-all ${
                              answers[currentQuestion.id] === option
                                ? "bg-orange-500 text-white border border-orange-400 shadow-lg shadow-orange-500/30"
                                : "bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600 hover:bg-slate-750"
                            }`}
                            onClick={() => handleAnswer(option)}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <textarea
                        rows={5}
                        value={answers[currentQuestion.id] ?? ""}
                        onChange={(event) => handleAnswer(event.target.value)}
                        placeholder="Your answer..."
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-4 text-sm text-slate-100 outline-none focus:border-orange-500 focus:shadow-lg focus:shadow-orange-500/20 backdrop-blur-sm"
                      />
                    )}
                  </div>

                  {error && <p className="text-sm text-red-400">{error}</p>}

                  <div className="flex gap-3 justify-between pt-4">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
                      onClick={handleNext}
                      disabled={isSaving}
                    >
                      {step + 1 === PHASE1_QUESTIONS.length ? "Generate Recommendation" : "Next"}
                    </button>
                    <span className="text-sm text-slate-400">{step + 1}/{PHASE1_QUESTIONS.length}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* ZI chat bubble */}
                  <div className="flex items-start gap-3">
                    {/* ZI avatar */}
                    <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-lg shadow-orange-500/30">
                      <span className="text-white font-black text-sm tracking-tight">ZI</span>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-orange-400">ZI</span>
                        <span className="text-xs text-slate-500 font-mono">Zebra Intelligence</span>
                      </div>
                      <div className="rounded-2xl rounded-tl-sm border border-orange-500/20 bg-slate-900/80 p-5 backdrop-blur-sm max-h-[420px] overflow-y-auto">
                        <ReactMarkdown className="prose prose-sm prose-invert max-w-none [&_*]:text-slate-100 [&_p]:text-slate-200 [&_h1]:text-white [&_h2]:text-orange-400 [&_h3]:text-slate-100 [&_strong]:text-orange-300 [&_li]:text-slate-200 [&_a]:text-orange-400 hover:[&_a]:text-orange-300">
                          {summary}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-3 sm:flex-row pl-13">
                    <button
                      onClick={playVoiceRecommendation}
                      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                        isPlayingVoice
                          ? "bg-red-600 text-white"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      <Volume2 className="h-4 w-4" />
                      {isPlayingVoice ? t("Playing...", "እየተጫወተ...") : t("Listen to ZI", "ZI ን ያዳምጡ")}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700"
                      onClick={() =>
                        navigate("/studio/business-proposition", {
                          state: {
                            phase1Answers: answers,
                          },
                        })
                      }
                    >
                      {t("Build Proposition →", "ሐሳብ ይገንቡ →")}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
                      onClick={handleRestart}
                    >
                      {t("Restart", "እንደገና ጀምር")}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Traffic Light & Voice Output */}
            <div className="lg:col-span-1 flex flex-col gap-8 justify-start">
              {summary && (
                <div className="flex flex-col items-center gap-6 rounded-2xl border border-slate-700/50 bg-slate-900/30 p-8 backdrop-blur-sm">
                  <h3 className="text-sm uppercase tracking-widest text-slate-400 font-semibold">Status</h3>
                  <TrafficLight status={recommendationStatus} />
                  <div className="text-center">
                    <p className="text-xs text-slate-400">
                      {recommendationStatus === "green" ? "Proceed" :
                       recommendationStatus === "yellow" ? "Proceed with Caution" :
                       "Reconsider"}
                    </p>
                  </div>
                </div>
              )}

              {/* Voice Output Info */}
              <div className="rounded-2xl border border-slate-700/50 bg-slate-900/30 p-8 backdrop-blur-sm space-y-4">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-orange-400" />
                  <h3 className="text-sm uppercase tracking-widest text-slate-400 font-semibold">Voice Available</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t(
                    "Listen to your recommendation in English or switch to Amharic. All content is available in both languages.",
                    "በአማርኛ ወይም በእንግሊዝኛ መከታተል ይችላሉ። ሁሉም ይዘት በሁለቱም ቋንቋዎች ውስጥ ይገኛል።"
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Phase1Flow;
