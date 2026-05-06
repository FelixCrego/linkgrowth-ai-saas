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
import {
  generateImage as generateImageApi,
  generatePost as generatePostApi,
  publishLinkedin,
  type DeepResearchPack,
  type PostType,
} from "../lib/api";

type GeneratedImage = {
  imageBase64: string;
  mimeType: string;
};

interface PostComposerProps {
  initialPrompt?: string;
}

const POST_TYPE_OPTIONS: Array<{ value: PostType; label: string }> = [
  { value: "thought_leadership", label: "Thought Leadership" },
  { value: "how_to", label: "How-To" },
  { value: "story", label: "Story" },
  { value: "case_study", label: "Case Study" },
  { value: "contrarian", label: "Contrarian" },
  { value: "listicle", label: "Listicle" },
];

const TONE_OPTIONS = ["Professional", "Bold", "Friendly", "Analytical", "Inspirational", "Direct"];
const VOICE_STYLE_OPTIONS = ["Standard", "Founder POV", "Educator", "Storyteller", "Executive", "Trained Voice"];

export const PostComposer = ({ initialPrompt = "" }: PostComposerProps) => {
  const [prompt, setPrompt] = useState("");
  const [postType, setPostType] = useState<PostType>("thought_leadership");
  const [tone, setTone] = useState("Professional");
  const [voiceStyle, setVoiceStyle] = useState("Standard");
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [output, setOutput] = useState("");
  const [research, setResearch] = useState<DeepResearchPack | null>(null);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!initialPrompt) return;
    setPrompt(initialPrompt);
    setOutput("");
    setResearch(null);
    setGeneratedImage(null);
    setError("");
  }, [initialPrompt]);

  const generatePost = async (regenerate = false) => {
    if (!prompt) return;
    if (regenerate && !output) return;
    if (regenerate) {
      setRegenerating(true);
    } else {
      setGenerating(true);
    }
    setError("");
    try {
      const result = await generatePostApi(prompt, {
        postType,
        tone,
        voiceStyle,
        regenerateFrom: regenerate ? output : undefined,
      });
      setOutput(result.content || "Failed to generate post.");
      setResearch(result.research ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error generating content");
    }
    if (regenerate) {
      setRegenerating(false);
    } else {
      setGenerating(false);
    }
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

  const generateImageFromSuggestion = async (imagePrompt: string) => {
    if (!imagePrompt) return;
    setPrompt((prev) => (prev.trim() ? prev : imagePrompt));
    setGeneratingImage(true);
    setError("");
    try {
      const result = await generateImageApi(imagePrompt);
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Post Type</label>
            <select
              value={postType}
              onChange={(e) => setPostType(e.target.value as PostType)}
              className="bg-slate-900 border border-brand-border rounded-lg px-3 py-2 text-xs text-white"
            >
              {POST_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="bg-slate-900 border border-brand-border rounded-lg px-3 py-2 text-xs text-white"
            >
              {TONE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  Tone: {option}
                </option>
              ))}
            </select>
            <select
              value={voiceStyle}
              onChange={(e) => setVoiceStyle(e.target.value)}
              className="bg-slate-900 border border-brand-border rounded-lg px-3 py-2 text-xs text-white"
            >
              {VOICE_STYLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  Voice: {option}
                </option>
              ))}
            </select>
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
            onClick={() => generatePost(false)}
            disabled={generating || regenerating || !prompt}
            className="w-full bg-brand-accent text-white py-4 rounded-xl flex items-center justify-center gap-3 font-bold uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-brand-accent/10 hover:shadow-brand-accent/20 transition-all disabled:opacity-50"
          >
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? "Synthesizing Draft..." : "Generate Post v2.1"}
          </button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {research && (
          <div className="border border-brand-border rounded-xl bg-slate-900/40 p-4 space-y-3">
            <p className="text-[10px] uppercase tracking-widest font-bold text-brand-accent">Deep Research Signals</p>
            <p className="text-xs text-slate-300"><span className="text-slate-500">Focus:</span> {research.focusTopic}</p>
            <p className="text-xs text-slate-300"><span className="text-slate-500">Trending:</span> {(research.trendingTopics || []).slice(0, 3).join(" • ")}</p>
            <p className="text-xs text-slate-300"><span className="text-slate-500">Pain Points:</span> {(research.painPoints || []).slice(0, 3).join(" • ")}</p>
            <p className="text-xs text-slate-300"><span className="text-slate-500">Angle:</span> {research.recommendedAngle}</p>
            {Array.isArray(research.sources) && research.sources.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Sources</p>
                {research.sources.slice(0, 3).map((source) => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-[11px] text-brand-accent hover:underline truncate"
                    title={source.title}
                  >
                    {source.title}
                  </a>
                ))}
              </div>
            )}
            {Array.isArray(research.imageSuggestions) && research.imageSuggestions.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Suggested Images</p>
                {research.imageSuggestions.slice(0, 3).map((suggestion, index) => (
                  <div key={`${suggestion.title}-${index}`} className="border border-brand-border/60 rounded-lg p-3 bg-slate-900/50">
                    <p className="text-xs font-semibold text-white">{suggestion.title}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{suggestion.reason}</p>
                    <button
                      onClick={() => generateImageFromSuggestion(suggestion.prompt)}
                      disabled={generatingImage}
                      className="mt-2 text-[10px] uppercase tracking-widest font-bold text-brand-accent hover:underline disabled:opacity-40"
                    >
                      {generatingImage ? "Generating..." : "Generate This Image"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
              onClick={() => generatePost(true)}
              disabled={!output || generating || regenerating}
              className="w-full bg-slate-800 border border-slate-700/50 text-slate-300 py-3 rounded-xl flex items-center justify-center gap-2 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-all disabled:opacity-30"
            >
              <RefreshCw className={`w-4 h-4 ${regenerating ? "animate-spin" : ""}`} />
              {regenerating ? "Regenerating..." : "Regenerate With AI"}
            </button>
            <button
              onClick={postToLinkedin}
              disabled={!output || posting || generating || regenerating}
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
