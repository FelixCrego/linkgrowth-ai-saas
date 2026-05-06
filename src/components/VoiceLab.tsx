import { useState } from "react";
import { motion } from "motion/react";
import { Mic2, MessageSquare, Zap, Loader2, Sparkles, CheckCircle2, History } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const VoiceLab = () => {
  const [trainingData, setTrainingData] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [voiceProfile, setVoiceProfile] = useState<any>(null);

  const analyzeVoice = async () => {
    if (!trainingData) return;
    setIsAnalyzing(true);
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        systemInstruction: "You are a linguistic expert. Analyze the provided text samples (LinkedIn posts) and create a JSON profile of the writer's voice. Include: tone (string), style (string), lengthPreference (string), emojiUsage (string), and hookStrategy (string).",
      });

      const result = await model.generateContent(`Analyze this writing style: ${trainingData}`);
      const text = result.response.text();
      const match = text.match(/\{.*\}/s);
      if (match) {
        setVoiceProfile(JSON.parse(match[0]));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-bold text-brand-accent uppercase tracking-[0.4em] mb-2">AI Personalization</p>
          <h2 className="text-5xl font-light tracking-tight text-white italic font-serif">Voice Lab</h2>
          <p className="text-slate-400 max-w-xl text-sm leading-relaxed mt-2">
            Train the Content Engine on your specific writing DNA. Paste 3-5 of your best performing 
            posts to extract your unique linguistic fingerprint.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-brand-border rounded-xl">
           <History className="w-3.5 h-3.5 text-slate-500" />
           <span className="text-[10px] text-slate-500 font-bold uppercase">Last Trained: 2 days ago</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-brand-accent/20 blur rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
            <textarea
              className="relative w-full h-80 bg-slate-900 border border-brand-border p-8 outline-none focus:border-brand-accent/50 transition-all text-sm leading-relaxed resize-none text-white rounded-2xl shadow-inner scrollbar-hide"
              placeholder="Paste 3-5 successful LinkedIn posts here..."
              value={trainingData}
              onChange={(e) => setTrainingData(e.target.value)}
            />
          </div>
          <button
            onClick={analyzeVoice}
            disabled={isAnalyzing || !trainingData}
            className="w-full bg-brand-accent text-white py-5 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase text-[11px] tracking-[0.3em] shadow-xl shadow-brand-accent/20 hover:scale-[1.01] transition-all disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic2 className="w-4 h-4" />}
            {isAnalyzing ? "Extracting Linguistic DNA..." : "Synthesize My Voice"}
          </button>
        </div>

        <div className="space-y-6">
          {!voiceProfile ? (
            <div className="h-full glass-panel flex flex-col items-center justify-center p-12 text-center opacity-20 italic">
              <Sparkles className="w-16 h-16 mb-4 text-brand-accent" />
              <p className="max-w-xs">Your AI Persona will appear here after analysis.</p>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel p-8 space-y-8 h-full bg-brand-accent/5 border-brand-accent/30"
            >
              <div className="flex items-center gap-3 border-b border-brand-border pb-6">
                <div className="w-10 h-10 bg-brand-accent text-white rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Voice Identity Active</h3>
                  <p className="text-[10px] text-brand-accent font-bold uppercase tracking-widest">Growth Factor: 0.98 Match</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {[
                  { label: "Core Tone", value: voiceProfile.tone, icon: Zap },
                  { label: "Structure", value: voiceProfile.style, icon: MessageSquare },
                  { label: "Hook Strategy", value: voiceProfile.hookStrategy, icon: Sparkles }
                ].map((attr, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <attr.icon className="w-3.5 h-3.5 text-brand-accent" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{attr.label}</span>
                    </div>
                    <p className="text-sm text-slate-300 font-medium bg-slate-900/50 p-4 rounded-xl border border-brand-border">
                      {attr.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-slate-900/60 rounded-xl border border-brand-border">
                <p className="text-[9px] text-slate-600 font-bold uppercase mb-2">AI Summary</p>
                <p className="text-[11px] text-slate-400 italic font-serif">
                   "Your writing style prioritizes {voiceProfile.lengthPreference} with a heavy emphasis on {voiceProfile.emojiUsage}. 
                   The generator will now automatically apply these parameters to every draft."
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
