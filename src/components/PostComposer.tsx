import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { 
  Send, 
  Sparkles, 
  Image as ImageIcon, 
  Calendar, 
  MessageSquare,
  RefreshCw,
  Copy,
  Check
} from "lucide-react";
import { generateImage as generateImageApi, generatePost as generatePostApi, publishLinkedin } from "../lib/api";

type GeneratedImage = {
  imageBase64: string;
  mimeType: string;
};

interface PostComposerProps {
  initialPrompt?: string;
}

export const PostComposer = ({ initialPrompt = "" }: PostComposerProps) => {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [output, setOutput] = useState("");
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!initialPrompt) return;
    setPrompt(initialPrompt);
    setOutput("");
    setGeneratedImage(null);
    setError("");
  }, [initialPrompt]);

  const generatePost = async () => {
    if (!prompt) return;
    setGenerating(true);
    setError("");
    try {
      const result = await generatePostApi(prompt);
      setOutput(result.content || "Failed to generate post.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error generating content");
    }
    setGenerating(false);
  };

  const generateImage = async () => {
    if (!prompt) return;
    setGeneratingImage(true);
    setError("");
    try {
      const result = await generateImageApi(prompt);
      setGeneratedImage({ imageBase64: result.imageBase64, mimeType: result.mimeType });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error generating image");
    }
    setGeneratingImage(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const postToLinkedin = async () => {
    if (!output) return;
    setPosting(true);
    setError("");
    try {
      await publishLinkedin({
        text: output,
        imageBase64: generatedImage?.imageBase64,
        imageMimeType: generatedImage?.mimeType,
      });
      setPosting(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "LinkedIn publish failed");
      setPosting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
      <div className="space-y-8">
        <div>
          <p className="text-[10px] font-bold text-brand-accent uppercase tracking-[0.3em] mb-2">Editor</p>
          <h2 className="text-4xl font-light tracking-tight text-white mb-2">Content Engine</h2>
          <p className="text-slate-500 text-sm italic font-serif">Transform research insights into high-velocity viral content.</p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Seed Concept / AI Instructions</label>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-accent/10 border border-brand-accent/20">
              <Sparkles className="w-2.5 h-2.5 text-brand-accent" />
              <span className="text-[9px] font-bold text-brand-accent uppercase tracking-[0.1em]">Voice DNA Sync Active</span>
            </div>
          </div>
          <div className="relative group/area">
            <div className="absolute -inset-0.5 bg-brand-accent/10 blur rounded-2xl opacity-0 group-focus-within/area:opacity-100 transition-opacity"></div>
            <textarea
              className="relative w-full h-48 bg-slate-900 border border-brand-border p-6 outline-none focus:border-brand-accent/50 transition-all text-sm leading-relaxed resize-none text-white rounded-2xl shadow-inner shadow-black/40"
              placeholder="What do you want to talk about? (e.g. A new product launch, a lesson learned in scaling...)"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button
                onClick={generateImage}
                disabled={generatingImage || !prompt}
                title="Generate image from prompt"
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700/50 rounded-lg disabled:opacity-50"
              >
                {generatingImage ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
              </button>
              <button className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700/50 rounded-lg">
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <button
            onClick={generatePost}
            disabled={generating || !prompt}
            className="w-full bg-brand-accent text-white py-4 rounded-xl flex items-center justify-center gap-3 font-bold uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-brand-accent/10 hover:shadow-brand-accent/20 transition-all disabled:opacity-50"
          >
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? "Synthesizing Draft..." : "Generate Post v2.1"}
          </button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="grid grid-cols-3 gap-4">
          {[{l: "Tone", v: "Authority"}, {l: "Persona", v: "Growth Ops"}, {l: "Strategy", v: "Social Proof"}].map((t, idx) => (
            <div key={idx} className="p-4 border border-brand-border rounded-xl bg-slate-900/40 text-center">
              <p className="text-[9px] text-slate-600 font-bold uppercase mb-1">{t.l}</p>
              <p className="text-[11px] font-bold text-slate-300">{t.v}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="absolute -inset-2 bg-brand-accent/5 rounded-[2.5rem] border border-dashed border-brand-accent/10"></div>
        <div className="relative h-full flex flex-col bg-slate-900 border border-brand-border rounded-[2rem] overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-brand-border flex justify-between items-center bg-slate-800/20 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 leading-none">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
            </div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500">Live Draft Preview</span>
          </div>
          
          <div className="flex-1 p-8 overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-300">
            {generatedImage && (
              <motion.img
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                src={`data:${generatedImage.mimeType};base64,${generatedImage.imageBase64}`}
                alt="Generated post image"
                className="mb-6 w-full rounded-2xl border border-brand-border object-cover"
              />
            )}
            {output || (
              <div className="h-full flex flex-col items-center justify-center opacity-10">
                <Sparkles className="w-16 h-16 mb-4" />
                <p className="text-lg">Constructing...</p>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-brand-border bg-slate-800/10 flex flex-col gap-4">
            <div className="flex gap-4">
              <button
                onClick={copyToClipboard}
                disabled={!output}
                className="flex-1 bg-slate-800 border border-slate-700/50 text-slate-400 py-3 rounded-xl flex items-center justify-center gap-2 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-all disabled:opacity-20"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copied ? "Analyzed" : "Copy Draft"}
              </button>
              <button className="p-3 bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-white rounded-xl transition-all">
                <Calendar className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={postToLinkedin}
              disabled={!output || posting}
              className="w-full bg-brand-accent text-white py-4 rounded-xl flex items-center justify-center gap-3 font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-brand-accent/20 hover:bg-brand-accent/90 transition-all disabled:opacity-20"
            >
              <Send className="w-4 h-4" />
              {posting ? "Posting..." : "Approve & Post to LinkedIn"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
