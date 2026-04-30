import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SplitText from "../components/SplitText";
import StarField from "../components/StarField";
import {
  ArrowLeft,
  Sparkles,
  MessageCircle,
  X,
  Send,
  Camera,
} from "lucide-react";
import { getResults, getWalletCardUrl, sendChatMessage, checkLinkImage, checkLinkManual } from "../lib/api";
import {
  getSeasonMakeupSwatches,
  getJewelrySwatches,
} from "../data/seasonColors";
import { formatSeasonName } from "../utils/formatSeason";
import { sanitizeToSecondPerson } from "../utils/sanitizeDescription";
import { MetalCircle, ALL_METALS, METAL_FILE_MAP } from "../components/MetalCircle";
import { MakeupSwatch } from "../components/MakeupSwatch";
import { filterValidSwatches } from "../utils/filterValidSwatches";
import { getMakeupSwatchImage } from "../utils/makeupSwatchImage";
import { getNailMeta } from "../utils/nailMetadata";
import { HairCard } from "../components/HairCard";
import { getHairShadesForSeason, getHairSubtitle } from "../data/hairShadeLibrary";
import { GemstoneCard } from "../components/GemstoneCard";
import { LinkCheckResult } from "../components/LinkCheckResult";

type Tab = "overview" | "beauty" | "style" | "shop";

interface ColorSwatch {
  name: string;
  hex: string;
  note?: string;
  reason?: string;
}



function shortenFeature(key: string, value: string): string {
  if (!value || !value.trim()) return "";
  // Strip "Your skin is...", "Your hair is...", "Your eyes are..." prefixes
  const cleaned = value
    .replace(/^your\s+(skin|hair|eyes?)\s+(is|are)\s+/i, '')
    .replace(/^you\s+have\s+/i, '')
    .trim();
  const k = key.toLowerCase();
  if (k.includes('skin')) return cleaned.split(',')[0].replace(/undertones?/i, '').trim();
  if (k.includes('eye')) return cleaned.split(',')[0].split('with')[0].trim();
  if (k.includes('hair')) return cleaned.split(',')[0].split('with')[0].trim() || cleaned.split(' ').slice(0, 4).join(' ');
  if (k.includes('vein')) return cleaned.includes('green') ? 'Green veins (warm)' : cleaned.includes('blue') ? 'Blue veins (cool)' : cleaned.split(' ').slice(0, 3).join(' ');
  if (k.includes('contrast')) return cleaned.split(' ').slice(0, 2).join(' ');
  return cleaned.split('.')[0].substring(0, 40);
}

export default function Results() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [celebPhotos, setCelebPhotos] = useState<Record<string, string>>({});

  const [stripCopied, setStripCopied] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) return;
    getResults(sessionId)
      .then((r) => { setData(r); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [sessionId]);

  useEffect(() => {
    if (!data) return;
    const celebrities = data.celebrities as { name: string; why: string }[];
    if (!celebrities) return;

    celebrities.forEach(async (celeb) => {
      try {
        const res = await fetch(`/api/celebrity-image/${encodeURIComponent(celeb.name)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.url) {
            setCelebPhotos((prev) => ({ ...prev, [celeb.name]: json.url }));
          }
        }
      } catch {
        // Fallback to initials
      }
    });
  }, [data]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const cleanChat = (text: string): string => {
    return text
      // Keep **bold** intact — rendered separately in JSX
      .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/gs, '$1') // strip italic *text*
      .replace(/_{2}(.+?)_{2}/gs, '$1')
      .replace(/_(.+?)_/gs, '$1')
      .replace(/#{1,6}\s+(.+)/g, '$1')
      .replace(/^[\-\*\+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const renderChatContent = (text: string) => {
    // Split on **bold** markers and render bold segments as <strong>
    const parts = text.split(/\*\*(.+?)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
    );
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !sessionId || chatLoading) return;
    const msg = text.trim();
    setChatInput("");
    const newMessages = [...chatMessages, { role: "user" as const, content: msg }];
    setChatMessages(newMessages);
    setChatLoading(true);
    setChatSearchPhase(false);

    const searchTimer = setTimeout(() => setChatSearchPhase(true), 1500);

    try {
      const response = await sendChatMessage(sessionId, newMessages);
      setChatMessages([...newMessages, { role: "assistant", content: cleanChat(response) }]);
    } catch {
      setChatMessages([
        ...newMessages,
        { role: "assistant", content: "Sorry, I had trouble responding. Please try again." },
      ]);
    }
    clearTimeout(searchTimer);
    setChatLoading(false);
    setChatSearchPhase(false);
  }, [sessionId, chatLoading, chatMessages]);

  const handleSendChat = () => sendMessage(chatInput);

  // Link checker state
  const [linkResult, setLinkResult] = useState<Record<string, any> | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualColor, setManualColor] = useState("");
  const [manualCategory, setManualCategory] = useState("clothing");
  const [manualBrand, setManualBrand] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (file: File) => {
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setLinkLoading(true);
    setLinkError(null);
    setLinkResult(null);
    try {
      const res = await checkLinkImage(file, sessionId!);
      setLinkResult(res);
    } catch (err: any) {
      setLinkError(err.message || 'Image check failed');
    } finally {
      setLinkLoading(false);
    }
  };

  const handleManualCheck = async () => {
    if (!manualColor.trim()) return;
    setLinkLoading(true);
    setLinkError(null);
    try {
      const res = await checkLinkManual(manualColor.trim(), manualCategory, manualBrand.trim(), sessionId!);
      setLinkResult(res);
    } catch (err: any) {
      setLinkError(err.message || 'Manual check failed');
    } finally {
      setLinkLoading(false);
    }
  };

  const [chatSearchPhase, setChatSearchPhase] = useState(false);

  const quickQuestions = [
    "What Moonglaze blush suits me?",
    "Does Charlotte Tilbury Pillow Talk work on me?",
    "Best OPI nail polish for me?",
    "Is MAC Ruby Woo good for me?",
    "Gold or silver jewelry for me?",
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 animate-spin-slow" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--accent-gold)' }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p style={{ color: 'var(--text-muted)' }}>Results not found.</p>
        <button onClick={() => navigate("/analyze")} className="hover:underline cursor-pointer" style={{ color: 'var(--accent-gold)' }}>
          Start a new analysis
        </button>
      </div>
    );
  }

  const palette = data.palette as { best: ColorSwatch[]; avoid: ColorSwatch[]; neutrals: string[]; neutralsWithHex?: { name: string; hex: string }[]; metals: { best: string[]; avoid: string[] } };
  const makeup = data.makeup as Record<string, unknown>;
  // Normalize nails — handle both string arrays and object arrays
  const normalizeNailColors = (colors: unknown): string[] => {
    if (!Array.isArray(colors)) return [];
    return colors.map((c: unknown) => {
      if (typeof c === "string") return c;
      if (c && typeof c === "object") {
        const o = c as Record<string, unknown>;
        return (o.shadeName || o.name || "") as string;
      }
      return String(c);
    }).filter(Boolean);
  };
  const nailsRaw = makeup?.nails as Record<string, unknown> | undefined;
  const bestNails = normalizeNailColors(nailsRaw?.bestColors);
  const avoidNails = normalizeNailColors(nailsRaw?.avoidColors);
  const wardrobe = data.wardrobe as Record<string, string>;
  const jewelry = data.jewelry as Record<string, string>;
  const hairColor = data.hairColor as Record<string, string>;
  const celebrities = data.celebrities as { name: string; why: string }[];
  const keyFeatures = data.keyFeatures as Record<string, string>;
  const seasonName = formatSeasonName(data.season as string);
  const makeupSwatches = getSeasonMakeupSwatches(seasonName);
  const jewelrySwatches = getJewelrySwatches(seasonName);
  const hairShades = getHairShadesForSeason(seasonName);
  const hairSubtitle = getHairSubtitle(seasonName);
  // Use AI-returned personal DNA values; fall back to 50 (neutral) if missing
  const aiDNA = data.colorDNA as { warmth?: number; depth?: number; clarity?: number; contrast?: number } | undefined;
  const colorDNA = {
    temperature: aiDNA?.warmth ?? 50,
    depth: aiDNA?.depth ?? 50,
    clarity: aiDNA?.clarity ?? 50,
    contrast: aiDNA?.contrast ?? 50,
  };
  const seasonWords = seasonName.split(" ");

  // Helper: parse hex to RGB
  const hexToRgb = (hex: string) => {
    const h = hex.replace("#", "");
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  };
  // Helper: perceived luminance (0=dark, 1=light)
  const luminance = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  };
  // Helper: saturation from HSL
  const saturation = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    const max = Math.max(r, g, b) / 255, min = Math.min(r, g, b) / 255;
    const l = (max + min) / 2;
    if (max === min) return 0;
    return l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
  };

  // Deduplicated palette colors
  const uniquePalette = palette?.best?.filter((c: ColorSwatch, i: number, arr: ColorSwatch[]) => arr.findIndex(x => x.name === c.name) === i) || [];

  // Card 1: darkest/most neutral colors (low luminance + low saturation)
  const wardrobeColors = [...uniquePalette]
    .sort((a, b) => (luminance(a.hex) + saturation(a.hex) * 0.5) - (luminance(b.hex) + saturation(b.hex) * 0.5))
    .slice(0, 3);

  // Card 2: lip & blush shades from actual makeup swatch data
  const makeupChips = [
    ...makeupSwatches.lips.everyday.slice(0, 1),
    ...makeupSwatches.lips.bold.slice(0, 1),
    ...makeupSwatches.blush.slice(0, 1),
  ].map(s => ({ name: s.name, hex: s.hex }));

  // Card 3: most saturated/vivid colors
  const accentColors = [...uniquePalette]
    .sort((a, b) => saturation(b.hex) - saturation(a.hex))
    .slice(0, 3);

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "beauty", label: "Beauty" },
    { key: "style", label: "Style" },
    { key: "shop", label: "Shop" },
  ];

  return (
    <div className="min-h-screen pb-24">
      <StarField maxOpacity={0.45} minDuration={4} durationRange={5} />

      {/* Nav */}
      <nav className="fixed top-0 w-full z-50" style={{ background: 'rgba(15,10,5,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 transition cursor-pointer" style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Home</span>
          </button>
        </div>
        <div className="nav-scroll-container max-w-5xl mx-auto px-6 pb-2 relative">
          <div className="overflow-x-auto nav-scroll">
            <div className="flex gap-1">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="whitespace-nowrap transition cursor-pointer"
                  style={{
                    fontSize: "12px",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: tab === t.key ? "var(--accent-gold)" : "var(--text-muted)",
                    background: "none",
                    border: "none",
                    borderBottom: tab === t.key ? "1px solid var(--accent-gold)" : "1px solid transparent",
                    padding: "6px 12px",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Season context banner for non-overview tabs */}
      {tab !== "overview" && (
        <div className="fixed w-full z-40" style={{ top: "88px", background: "var(--bg-primary)", borderBottom: "0.5px solid var(--border-color)", padding: "8px 24px" }}>
          <div style={{ maxWidth: 760, margin: "0 auto" }} className="flex items-center gap-2">
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: palette?.best?.[0]?.hex || "var(--accent-gold)", flexShrink: 0 }} />
            <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--text-muted)" }}>
              Showing results for {seasonName}
            </span>
          </div>
        </div>
      )}

      <main style={{ maxWidth: tab === "overview" ? 900 : 760, margin: "0 auto", padding: "28px 20px", paddingTop: tab === "overview" ? "112px" : "140px", transition: "max-width 0.3s ease" }}>
                        {/* ==================== OVERVIEW ==================== */}
        {tab === "overview" && (
          <div className="animate-slide-up" style={{ margin: "0 auto", padding: "28px 0" }}>

            {/* ── Hero: Season Name ── */}
            <section style={{ position: "relative", marginBottom: 80 }}>
              <div style={{
                position: "absolute",
                top: -80,
                left: -80,
                width: 500,
                height: 500,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(212,175,122,0.06) 0%, transparent 70%)",
                pointerEvents: "none",
              }} />
              <p style={{
                fontFamily: "Cormorant Garamond, serif",
                fontStyle: "italic",
                fontSize: 20,
                color: "#D4AF7A",
                letterSpacing: "0.05em",
                marginBottom: 12,
                opacity: 0.8,
              }}>
                Your revelation is complete.
              </p>
              <h1 style={{
                fontFamily: "Cormorant Garamond, serif",
                fontWeight: 300,
                fontSize: "clamp(56px, 10vw, 128px)",
                letterSpacing: "-0.02em",
                lineHeight: 1,
                color: "#F2EEE8",
                margin: "0 0 28px 0",
              }}>
                {seasonWords[0]} <span style={{ color: "#D4AF7A", fontStyle: "italic" }}>{seasonWords.slice(1).join(" ")}</span>
              </h1>
              {(data.seasonTagline as string) && (
                <p style={{
                  fontFamily: "Cormorant Garamond, serif",
                  fontStyle: "italic",
                  fontSize: 22,
                  color: "#B8B0A4",
                  maxWidth: 520,
                  lineHeight: 1.5,
                  borderLeft: "2px solid rgba(212,175,122,0.3)",
                  paddingLeft: 24,
                  paddingTop: 4,
                  paddingBottom: 4,
                }}>
                  &ldquo;{data.seasonTagline as string}&rdquo;
                </p>
              )}
            </section>

            {/* ── Palette Grid (2x6) ── */}
            {palette && (
              <section style={{ marginBottom: 80 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 36 }}>
                  <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 36, fontWeight: 300, color: "#F2EEE8", margin: 0, whiteSpace: "nowrap" }}>Your Palette</h2>
                  <div style={{ flex: 1, height: 0.5, background: "rgba(78,70,57,0.3)" }} />
                  <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.3em", color: "#B8B0A4", whiteSpace: "nowrap" }}>
                    The 12 Signature Tones
                  </span>
                </div>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(6, 1fr)",
                  gap: 1,
                  background: "rgba(78,70,57,0.1)",
                  padding: 1,
                }}>
                  {palette.best
                    .filter((c: ColorSwatch, i: number, arr: ColorSwatch[]) => arr.findIndex(x => x.name === c.name) === i)
                    .slice(0, 12)
                    .map((c: ColorSwatch) => (
                      <div
                        key={c.hex}
                        style={{ position: "relative", aspectRatio: "1", minHeight: 80, overflow: "hidden", cursor: "pointer", background: "#131313", transition: "transform 0.3s ease, zIndex 0s" }}
                        onClick={() => {
                          navigator.clipboard.writeText(c.hex);
                          setStripCopied(c.hex);
                          setTimeout(() => setStripCopied(null), 1500);
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = "scale(1.08)";
                          e.currentTarget.style.zIndex = "10";
                          e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.5)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = "scale(1)";
                          e.currentTarget.style.zIndex = "0";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        <div style={{
                          width: "100%",
                          height: "100%",
                          background: c.hex,
                        }} />
                        <div style={{
                          position: "absolute",
                          inset: 0,
                          padding: 12,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "flex-end",
                          background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%)",
                          pointerEvents: "none",
                        }}>
                          <span style={{
                            fontFamily: "Cormorant Garamond, serif",
                            fontStyle: "italic",
                            fontSize: 15,
                            color: "#F2EEE8",
                            lineHeight: 1.3,
                          }}>{c.name}</span>
                        </div>
                        {stripCopied === c.hex && (
                          <div style={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            fontSize: 9,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            color: "#D4AF7A",
                            background: "rgba(0,0,0,0.75)",
                            padding: "3px 8px",
                            borderRadius: 3,
                            pointerEvents: "none",
                          }}>Copied</div>
                        )}
                      </div>
                    ))}
                </div>
              </section>
            )}

            {/* ── Analysis + Color DNA (Two Columns) ── */}
            <section style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 48,
              marginBottom: 80,
              alignItems: "start",
            }}>
              {/* Left: Feature List */}
              <div>
                <h3 style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", fontSize: 28, color: "#F2EEE8", marginBottom: 8 }}>Your Colour Analysis</h3>
                <p style={{ fontSize: 14, color: "#B8B0A4", lineHeight: 1.6, marginBottom: 28 }}>
                  Our AI analysis has mapped your physical traits to the frequency of {seasonName}. Your features possess a {colorDNA.depth > 60 ? "grounded, majestic depth" : "soft, luminous quality"}.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {[
                    { label: "Skin Undertone", value: shortenFeature("skin", keyFeatures?.skinTone || "") },
                    { label: "Hair", value: shortenFeature("hair", keyFeatures?.hairColor || "") },
                    { label: "Eyes", value: shortenFeature("eye", keyFeatures?.eyeColor || "") },
                    { label: "Contrast", value: (data.contrastLevel as string) || (colorDNA.contrast >= 70 ? "High" : colorDNA.contrast >= 45 ? "Medium" : "Low") },
                  ].filter(r => r.value).map((row, i, arr) => (
                    <div key={row.label} style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px 0",
                      borderBottom: i < arr.length - 1 ? "1px solid rgba(78,70,57,0.15)" : "none",
                    }}>
                      <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "#D4AF7A", fontWeight: 500 }}>{row.label}</span>
                      <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 17, color: "#F2EEE8" }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: DNA Horizontal Bars */}
              <div style={{
                background: "rgba(32,31,31,0.8)",
                padding: "32px 28px",
                position: "relative",
                overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute",
                  bottom: -40,
                  right: -40,
                  width: 200,
                  height: 200,
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(212,175,122,0.08) 0%, transparent 70%)",
                  pointerEvents: "none",
                }} />
                <h3 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 22, color: "#F2EEE8", textAlign: "center", marginBottom: 36 }}>Color DNA Analysis</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 28, position: "relative", zIndex: 1 }}>
                  {[
                    { low: "Cool", high: "Warm", value: colorDNA.temperature },
                    { low: "Light", high: "Deep", value: colorDNA.depth },
                    { low: "Muted", high: "Clear", value: colorDNA.clarity },
                    { low: "Low", high: "High", value: colorDNA.contrast },
                  ].map(({ low, high, value }) => (
                    <div key={high}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "#B8B0A4", marginBottom: 10 }}>
                        <span>{low}</span>
                        <span>{high}</span>
                      </div>
                      <div style={{ height: 2, width: "100%", background: "rgba(78,70,57,0.25)", position: "relative" }}>
                        <div style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          height: "100%",
                          width: `${value}%`,
                          background: "#D4AF7A",
                          boxShadow: "0 0 10px rgba(212,175,122,0.5)",
                          transition: "width 1s ease-out",
                        }} />
                        <div style={{
                          position: "absolute",
                          left: `${value}%`,
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#D4AF7A",
                          boxShadow: "0 0 0 4px rgba(212,175,122,0.1)",
                          transition: "left 1s ease-out",
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Season Story ── */}
            <section style={{ marginBottom: 80 }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "280px 1fr",
                gap: 40,
                alignItems: "start",
              }}>
                {/* Season photo */}
                <div style={{
                  width: 280,
                  height: 280,
                  overflow: "hidden",
                  flexShrink: 0,
                  position: "relative",
                }}>
                  <img
                    src={`/seasons/${seasonName.toLowerCase().includes("winter") ? "winter" : seasonName.toLowerCase().includes("summer") ? "summer" : seasonName.toLowerCase().includes("spring") ? "spring" : "autumn"}.png`}
                    alt={`${seasonName} season`}
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      filter: "brightness(0.8)",
                    }}
                  />
                  <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 0 1px rgba(212,175,122,0.2)", pointerEvents: "none" }} />
                </div>
                <div>
                  <h2 style={{
                    fontFamily: "Cormorant Garamond, serif",
                    fontStyle: "italic",
                    fontSize: 40,
                    fontWeight: 300,
                    lineHeight: 1.15,
                    color: "#D4AF7A",
                    marginBottom: 20,
                  }}>
                    Your Season Story
                  </h2>
                  <p style={{ fontSize: 15, color: "#B8B0A4", lineHeight: 1.8, maxWidth: 520 }}>
                    {(data.seasonStory as string) || `As a ${seasonName}, your coloring reflects ${colorDNA.temperature > 60 ? "warmth and richness" : "coolness and clarity"}. Your features carry a ${colorDNA.contrast > 60 ? "high-contrast" : "soft"} quality with ${colorDNA.depth > 60 ? "deep" : "light"}, ${colorDNA.clarity > 50 ? "clear" : "muted"} tones that define your unique palette. The colours chosen for you enhance your natural harmony and bring out your best features.`}
                  </p>
                </div>
              </div>
            </section>

            {/* ── How to Wear Your Palette (3 Cards) ── */}
            <section style={{ marginBottom: 80 }}>
              <h3 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 32, fontWeight: 300, color: "#F2EEE8", marginBottom: 24 }}>How to Wear Your Palette</h3>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 2,
              }}>
                {/* Card 1 — In Your Wardrobe */}
                <div style={{ background: "rgba(32,31,31,0.85)", padding: "32px 24px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 240 }}>
                  <div>
                    <h4 style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", fontSize: 22, color: "#D4AF7A", marginBottom: 12 }}>In Your Wardrobe</h4>
                    <p style={{ fontSize: 13, color: "#B8B0A4", lineHeight: 1.65, marginBottom: 20 }}>
                      Build your outfits around these grounding neutrals — they form the base of everything you wear.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 16 }}>
                    {wardrobeColors.map((c: ColorSwatch) => (
                      <div key={c.hex} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 40, height: 40, background: c.hex, border: "1px solid rgba(212,175,122,0.2)", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }} />
                        <span style={{ fontSize: 11, color: "#B8B0A4", textAlign: "center", lineHeight: 1.3, maxWidth: 64 }}>{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card 2 — In Your Makeup */}
                <div style={{ background: "rgba(32,31,31,0.85)", padding: "32px 24px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 240 }}>
                  <div>
                    <h4 style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", fontSize: 22, color: "#D4AF7A", marginBottom: 12 }}>In Your Makeup</h4>
                    <p style={{ fontSize: 13, color: "#B8B0A4", lineHeight: 1.65, marginBottom: 20 }}>
                      These shades harmonise with your undertone for foundation, blush, bronzer, and lips.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 16 }}>
                    {makeupChips.map((c) => (
                      <div key={c.hex} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 40, height: 40, background: c.hex, border: "1px solid rgba(212,175,122,0.2)", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }} />
                        <span style={{ fontSize: 11, color: "#B8B0A4", textAlign: "center", lineHeight: 1.3, maxWidth: 64 }}>{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card 3 — As Your Accents */}
                <div style={{ background: "rgba(32,31,31,0.85)", padding: "32px 24px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 240 }}>
                  <div>
                    <h4 style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", fontSize: 22, color: "#D4AF7A", marginBottom: 12 }}>As Your Accents</h4>
                    <p style={{ fontSize: 13, color: "#B8B0A4", lineHeight: 1.65, marginBottom: 20 }}>
                      Reach for these when you want to make a statement — in a bag, a lip colour, or a bold top.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 16 }}>
                    {accentColors.map((c: ColorSwatch) => (
                      <div key={c.hex} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 40, height: 40, background: c.hex, border: "1px solid rgba(212,175,122,0.2)", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }} />
                        <span style={{ fontSize: 11, color: "#B8B0A4", textAlign: "center", lineHeight: 1.3, maxWidth: 64 }}>{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ── CTA: Continue to Beauty Guide ── */}
            <section style={{ marginBottom: 48, position: "relative" }}>
              <button
                onClick={() => { setTab("beauty"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="cursor-pointer"
                style={{
                  display: "block",
                  width: "100%",
                  background: "#D4AF7A",
                  color: "#0D0D0F",
                  padding: "18px 48px",
                  border: "none",
                  borderRadius: 0,
                  fontFamily: "Inter, sans-serif",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.25em",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#EAD09A"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#D4AF7A"; }}
              >
                Continue to Beauty Guide
              </button>
            </section>

            {/* ── Wallet Card + Share ── */}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 56 }}>
              {[
                { label: "Save Wallet Card", href: getWalletCardUrl(sessionId!) },
                { label: "Share on WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`Check out my ${seasonName} color profile on Your Aura!`)}`, external: true },
              ].map((btn) => (
                <a
                  key={btn.label}
                  href={btn.href}
                  target={btn.external ? "_blank" : undefined}
                  rel={btn.external ? "noopener noreferrer" : undefined}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "12px 28px",
                    background: "transparent",
                    border: "0.5px solid rgba(212,175,122,0.4)",
                    borderRadius: 0,
                    fontFamily: "Inter, sans-serif",
                    fontSize: 11,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "#D4AF7A",
                    textDecoration: "none",
                    transition: "all 0.3s ease",
                    cursor: "pointer",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#D4AF7A"; e.currentTarget.style.color = "#0D0D0F"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#D4AF7A"; }}
                >
                  {btn.label}
                </a>
              ))}
            </div>

            {/* ── Footer ── */}
            <footer style={{ borderTop: "1px solid rgba(78,70,57,0.2)", paddingTop: 32, textAlign: "center", paddingBottom: 16 }}>
              <p style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", fontSize: 22, color: "#D4AF7A", marginBottom: 12, letterSpacing: "0.04em" }}>Your Aura</p>
              <p style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", fontSize: 14, color: "#B8B0A4", marginBottom: 8 }}>Created by Haneen</p>
              <a href="mailto:haneenabdulrahmand@gmail.com" style={{ fontSize: 12, color: "#B8B0A4", textDecoration: "none", opacity: 0.7 }}>haneenabdulrahmand@gmail.com</a>
              <p style={{ fontSize: 10, color: "rgba(184,176,164,0.4)", marginTop: 16, textTransform: "uppercase", letterSpacing: "0.15em" }}>&copy; 2026 Your Aura &middot; AI Color Analysis &middot; 12 Season System</p>
            </footer>

          </div>
        )}

{/* ==================== BEAUTY (Makeup + Nails) ==================== */}
        {tab === "beauty" && (
          <div className="animate-slide-up space-y-6">
            <div className="flex gap-2 mb-6">
              <button onClick={() => document.getElementById('section-makeup')?.scrollIntoView({ behavior: 'smooth' })} className="px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer" style={{ color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                Makeup
              </button>
              <button onClick={() => document.getElementById('section-nails')?.scrollIntoView({ behavior: 'smooth' })} className="px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer" style={{ color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                Nails
              </button>
            </div>

            <div id="section-makeup">
        {makeup && (
          <div className="animate-slide-up space-y-8 rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
            <SplitText key="beauty-heading" text="Your Beauty Guide" className="text-3xl font-bold" tag="h2" delay={30} duration={0.5} />

            {/* Foundation */}
            {(() => {
              const fd = makeup.foundation as { recommended?: Array<{ name: string; hex: string }>; avoid?: Array<{ name: string; hex: string }>; tip?: string } | string | undefined;
              const isObj = fd && typeof fd === "object" && !Array.isArray(fd);
              const recShades = isObj ? filterValidSwatches("foundation", fd.recommended || []) : filterValidSwatches("foundation", makeupSwatches.foundation.recommended);
              const avoidShades = isObj ? filterValidSwatches("foundation", fd.avoid || []) : filterValidSwatches("foundation", makeupSwatches.foundation.avoid);
              const tip = isObj ? fd.tip : (typeof fd === "string" ? fd : "");
              return (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold" style={{ fontFamily: "Cormorant Garamond, serif", color: 'var(--text-primary)' }}>Foundation</h3>
              {recShades.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide mb-3" style={{ color: 'var(--accent-gold)' }}>Recommended Shades</p>
                <div className="flex flex-wrap gap-4">
                  {recShades.map((s) => (
                    <MakeupSwatch key={s.name} category="foundation" name={s.name} hex={s.hex} size={52} />
                  ))}
                </div>
              </div>
              )}
              {avoidShades.length > 0 && (
              <div>
                <div style={{ height: "0.5px", background: "var(--accent-gold)", opacity: 0.4, marginBottom: "12px" }} />
                <p className="text-xs uppercase tracking-wide mb-3" style={{ color: 'var(--accent-gold)' }}>Colours to Avoid</p>
                <div className="flex flex-wrap gap-4">
                  {avoidShades.map((s) => (
                    <MakeupSwatch key={s.name} category="foundation" name={s.name} hex={s.hex} size={52} avoid />
                  ))}
                </div>
              </div>
              )}
              {tip && <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{tip}</p>}
            </div>
              );
            })()}

            <div className="h-px my-8" style={{ background: 'linear-gradient(90deg, transparent, var(--border-color), transparent)' }} />

            {/* Blush */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold" style={{ fontFamily: "Cormorant Garamond, serif", color: 'var(--text-primary)' }}>Blush</h3>
              <div className="flex flex-wrap gap-5">
                {filterValidSwatches("blush", makeupSwatches.blush).map((s) => (
                  <MakeupSwatch key={s.name} category="blush" name={s.name} hex={s.hex} size={52} />
                ))}
              </div>
              {makeup.blush && <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{makeup.blush as string}</p>}
            </div>

            <div className="h-px my-8" style={{ background: 'linear-gradient(90deg, transparent, var(--border-color), transparent)' }} />

            {/* Bronzer */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold" style={{ fontFamily: "Cormorant Garamond, serif", color: 'var(--text-primary)' }}>Bronzer</h3>
              <div className="flex flex-wrap gap-5">
                {filterValidSwatches("bronzer", makeupSwatches.bronzer.yes).map((s) => (
                  <MakeupSwatch key={s.name} category="bronzer" name={s.name} hex={s.hex} size={52} />
                ))}
              </div>
              {filterValidSwatches("bronzer", makeupSwatches.bronzer.no).length > 0 && (
              <div>
                <div style={{ height: "0.5px", background: "var(--accent-gold)", opacity: 0.4, marginBottom: "12px", marginTop: "16px" }} />
                <p className="text-xs uppercase tracking-wide mb-3" style={{ color: 'var(--accent-gold)' }}>Colours to Avoid</p>
                <div className="flex flex-wrap gap-5">
                  {filterValidSwatches("bronzer", makeupSwatches.bronzer.no).map((s) => (
                    <MakeupSwatch key={s.name} category="bronzer" name={s.name} hex={s.hex} size={52} avoid />
                  ))}
                </div>
              </div>
              )}
              {makeup.bronzer && <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{makeup.bronzer as string}</p>}
            </div>

            <div className="h-px my-8" style={{ background: 'linear-gradient(90deg, transparent, var(--border-color), transparent)' }} />

            {/* Lips */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold" style={{ fontFamily: "Cormorant Garamond, serif", color: 'var(--text-primary)' }}>Lips</h3>
              <div>
                <p className="text-xs uppercase tracking-wide mb-3" style={{ color: 'var(--accent-gold)' }}>Everyday</p>
                <div className="flex flex-wrap gap-5">
                  {filterValidSwatches("lips", makeupSwatches.lips.everyday).map((s) => (
                    <MakeupSwatch key={s.name} category="lips" name={s.name} hex={s.hex} size={52} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide mb-3" style={{ color: 'var(--accent-gold)' }}>Bold</p>
                <div className="flex flex-wrap gap-5">
                  {filterValidSwatches("lips", makeupSwatches.lips.bold).map((s) => (
                    <MakeupSwatch key={s.name} category="lips" name={s.name} hex={s.hex} size={52} />
                  ))}
                </div>
              </div>
              <div>
                <div style={{ height: "0.5px", background: "var(--accent-gold)", opacity: 0.4, marginBottom: "12px" }} />
                <p className="text-xs uppercase tracking-wide mb-3" style={{ color: 'var(--accent-gold)' }}>Colours to Avoid</p>
                <div className="flex flex-wrap gap-5">
                  {filterValidSwatches("lips", makeupSwatches.lips.avoid).map((s) => (
                    <MakeupSwatch key={s.name} category="lips" name={s.name} hex={s.hex} size={52} avoid />
                  ))}
                </div>
              </div>
              {makeup.lips && <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{makeup.lips as string}</p>}
            </div>

            <div className="h-px my-8" style={{ background: 'linear-gradient(90deg, transparent, var(--border-color), transparent)' }} />

            {/* Eye Makeup */}
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold" style={{ fontFamily: "Cormorant Garamond, serif", color: 'var(--text-primary)' }}>Eye Makeup</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Eyeshadow, liner & brow shades</p>
              </div>
              <div className="flex flex-wrap gap-5">
                {filterValidSwatches("eyeshadow", makeupSwatches.eyes).map((s) => (
                  <MakeupSwatch key={s.name} category="eyeshadow" name={s.name} hex={s.hex} size={52} />
                ))}
              </div>
              {makeup.eyes && <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{makeup.eyes as string}</p>}
            </div>

          </div>
        )}
            </div>

            <div className="h-px my-10" style={{ background: 'linear-gradient(90deg, transparent, var(--border-color), transparent)' }} />

            <div id="section-nails">
          <div className="animate-slide-up space-y-6 rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "0.5px solid var(--border-color)", borderRadius: "12px" }}>
            <div>
              <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: "Cormorant Garamond, serif", color: 'var(--text-primary)' }}>Nail Guide</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Shades curated for your {seasonName} palette.</p>
            </div>

            <div className="flex flex-wrap gap-5 justify-start">
              {bestNails.filter(s => getMakeupSwatchImage("nails", s) !== null).map((shadeName) => {
                const meta = getNailMeta(shadeName);
                return (
                  <div key={shadeName} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <MakeupSwatch category="nails" name={shadeName} size={52} label={false} />
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", maxWidth: "92px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", textAlign: "center", lineHeight: 1.3 }}>
                        {meta?.colorDescription ?? shadeName}
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--accent-gold)", textAlign: "center", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                        {meta?.brand ?? ""}
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center", fontStyle: "italic", lineHeight: 1.3 }}>
                        {meta?.shadeName ?? shadeName}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Avoid Section */}
            {avoidNails.length > 0 && (
            <div className="space-y-3">
              <div style={{ height: "0.5px", background: "var(--accent-gold)", opacity: 0.4, marginBottom: "12px" }} />
              <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--accent-gold)', letterSpacing: "0.15em" }}>Colours to Avoid</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>These shades don't complement your undertone.</p>
              <div className="flex flex-wrap gap-5 justify-start">
                {avoidNails.filter(s => getMakeupSwatchImage("nails", s) !== null).map((shadeName) => {
                  const meta = getNailMeta(shadeName);
                  return (
                    <div key={shadeName} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", opacity: 0.85 }}>
                      <MakeupSwatch category="nails" name={shadeName} size={52} avoid label={false} />
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", maxWidth: "92px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", textAlign: "center", lineHeight: 1.3 }}>
                          {meta?.colorDescription ?? shadeName}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--accent-gold)", textAlign: "center", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                          {meta?.brand ?? ""}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center", fontStyle: "italic", lineHeight: 1.3 }}>
                          {meta?.shadeName ?? shadeName}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            )}
          </div>
            </div>
          </div>
        )}

        {/* ==================== STYLE (Jewelry + Hair) ==================== */}
        {tab === "style" && (
          <div className="animate-slide-up space-y-6">

            <div id="section-jewelry">
        {jewelry && (
          <div className="animate-slide-up space-y-8 rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
            <SplitText key="style-heading" text="Your Style Guide" className="text-3xl font-bold" tag="h2" delay={30} duration={0.5} />

            <div className="space-y-3">
              <h3 className="text-lg font-semibold" style={{ fontFamily: "Cormorant Garamond, serif", color: 'var(--text-primary)' }}>Metals</h3>
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                {ALL_METALS.map((metal) => {
                  const file = METAL_FILE_MAP[metal.toLowerCase()];
                  const rec = (palette.metals?.best || []).map((m: string) => m.toLowerCase());
                  return (
                    <MetalCircle
                      key={metal}
                      metal={file as "rose-gold" | "silver" | "gold"}
                      recommended={rec.includes(metal.toLowerCase()) || rec.some((r: string) => METAL_FILE_MAP[r] === file)}
                    />
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ fontFamily: "Cormorant Garamond, serif", color: 'var(--text-primary)' }}>Gemstones</h3>
              <div className="flex flex-wrap gap-5">
                {((data.gemstones as Array<{ name: string }>) || []).length > 0
                  ? (data.gemstones as Array<{ name: string }>).map((g) => (
                      <GemstoneCard key={g.name} name={g.name} />
                    ))
                  : jewelrySwatches.stones.map((s) => (
                      <GemstoneCard key={s.name} name={s.name} />
                    ))
                }
              </div>
            </div>

            {jewelry.style && (
              <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--accent-gold)' }}>Style Tips</p>
                <p className="leading-relaxed text-sm" style={{ color: 'var(--text-primary)' }}>{jewelry.style}</p>
              </div>
            )}

            {/* Avoided Metals — faded discs */}
            {palette.metals?.avoid && palette.metals.avoid.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide mb-3" style={{ color: 'var(--accent-gold)' }}>Colours to Avoid</p>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  {palette.metals.avoid.map((metalName: string) => {
                    const file = METAL_FILE_MAP[metalName.toLowerCase()];
                    const METAL_GRADIENT: Record<string, string> = {
                      "copper": "radial-gradient(circle at 35% 35%, #D4855C, #8B4513)",
                      "bronze": "radial-gradient(circle at 35% 35%, #CD7F32, #8B6914)",
                    };
                    const hasFile = file && ["rose-gold", "silver", "gold"].includes(file);
                    return (
                      <div key={metalName} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        {hasFile ? (
                          <img
                            src={`/makeup/metals/${file}.png`}
                            alt={metalName}
                            style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", filter: "saturate(0.4) opacity(0.6)", boxShadow: "0 2px 12px rgba(0,0,0,0.5)" }}
                          />
                        ) : (
                          <div style={{ width: 52, height: 52, borderRadius: "50%", background: METAL_GRADIENT[metalName.toLowerCase()] || "radial-gradient(circle at 35% 35%, #B87333, #704214)", filter: "saturate(0.4) opacity(0.6)", boxShadow: "0 2px 12px rgba(0,0,0,0.5)" }} />
                        )}
                        <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{metalName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
            </div>

            <div className="h-px my-10" style={{ background: 'linear-gradient(90deg, transparent, var(--border-color), transparent)' }} />

            <div id="section-hair">
          <div className="animate-slide-up space-y-8 rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
            <div>
              <h2 className="text-3xl font-bold" style={{ fontFamily: "Cormorant Garamond, serif", color: 'var(--text-primary)' }}>Hair Color Guide</h2>
              <p style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", fontWeight: 300, fontSize: 14, color: "var(--text-secondary)", marginTop: 6 }}>
                {hairSubtitle}
              </p>
            </div>

            {/* Recommended hair shades */}
            <div>
              <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: "Cormorant Garamond, serif", color: 'var(--text-primary)' }}>Recommended</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {hairShades.best.map((shade) => (
                  <HairCard key={shade.id} shade={shade} />
                ))}
              </div>
            </div>

            {/* Avoid hair shades */}
            {hairShades.avoid.length > 0 && (
              <div>
                <div style={{ height: "0.5px", background: "var(--accent-gold)", opacity: 0.4, marginBottom: 12 }} />
                <h3 className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--accent-gold)', letterSpacing: "0.15em", fontWeight: 500 }}>
                  Colours to Avoid
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {hairShades.avoid.map((shade) => (
                    <HairCard key={shade.id} shade={shade} avoid />
                  ))}
                </div>
              </div>
            )}

            {/* Additional tips from AI analysis */}
            {hairColor && hairColor.bestHighlights && (
              <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--accent-gold)' }}>Best Highlights</p>
                <p className="leading-relaxed text-sm" style={{ color: 'var(--text-primary)' }}>{hairColor.bestHighlights}</p>
              </div>
            )}
            {hairColor && hairColor.bestOverall && (
              <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--accent-gold)' }}>Overall Direction</p>
                <p className="leading-relaxed text-sm" style={{ color: 'var(--text-primary)' }}>{hairColor.bestOverall}</p>
              </div>
            )}
          </div>
            </div>
          </div>
        )}

        {/* ==================== SHOP (Image Upload Checker) ==================== */}
        {tab === "shop" && (
          <div className="animate-slide-up" style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div className="mb-8">
              <SplitText key="shop-heading" text="Before You Buy" className="text-3xl font-bold mb-2" tag="h1" delay={30} duration={0.5} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Upload a photo of any item — we'll tell you if it matches your {seasonName} palette.</p>
            </div>

            {/* Palette quick-view */}
            {palette?.best?.length > 0 && (
              <div className="mb-6" style={{ padding: "12px 16px", borderRadius: "12px", background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
                <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--accent-gold)", marginBottom: "8px" }}>Your palette</p>
                <div style={{ display: "flex", gap: "10px" }}>
                  {palette.best.slice(0, 5).map((c: ColorSwatch) => (
                    <div
                      key={c.hex}
                      style={{
                        position: "relative",
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        backgroundColor: c.hex,
                        boxShadow: "inset 0 2px 8px rgba(0,0,0,0.25), inset 0 -1px 3px rgba(255,255,255,0.12), 0 2px 6px rgba(0,0,0,0.3)",
                        overflow: "hidden",
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ position: "absolute", top: "12%", left: "15%", width: "30%", height: "21%", borderRadius: "50%", background: "radial-gradient(ellipse at center, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 100%)", pointerEvents: "none" }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Image upload drop zone */}
            {!linkResult && !linkLoading && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleImageSelect(file);
                    e.target.value = '';
                  }}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file && /\.(jpe?g|png|webp)$/i.test(file.name)) handleImageSelect(file);
                  }}
                  className="rounded-2xl p-10 mb-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition hover:opacity-80"
                  style={{ background: 'var(--bg-card)', border: '2px dashed var(--border-accent)', minHeight: '180px' }}
                >
                  <Camera className="w-8 h-8" style={{ color: 'var(--accent-gold)' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Upload a photo of the item</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Tap to browse or drag & drop — JPG, PNG, or WebP</p>
                </div>

                {/* Manual entry toggle */}
                <div className="mb-6">
                  <button
                    onClick={() => setShowManualForm(!showManualForm)}
                    className="text-xs underline cursor-pointer transition hover:opacity-70"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showManualForm ? 'Hide manual entry' : 'Or describe it manually'}
                  </button>
                </div>

                {showManualForm && (
                  <div className="rounded-2xl p-6 mb-6 space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <input
                      value={manualColor}
                      onChange={e => setManualColor(e.target.value)}
                      placeholder="Color name or description (e.g. burgundy, olive green)"
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                      style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    />
                    <select
                      value={manualCategory}
                      onChange={e => setManualCategory(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                      style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    >
                      <option value="clothing">Clothing</option>
                      <option value="bag">Bag</option>
                      <option value="shoes">Shoes</option>
                      <option value="accessory">Accessory</option>
                      <option value="makeup">Makeup</option>
                    </select>
                    <input
                      value={manualBrand}
                      onChange={e => setManualBrand(e.target.value)}
                      placeholder="Brand (optional)"
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                      style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    />
                    <button
                      onClick={handleManualCheck}
                      disabled={!manualColor.trim()}
                      className="w-full px-6 py-3 rounded-xl text-sm font-semibold transition disabled:opacity-50"
                      style={{ background: 'var(--accent-gold)', color: 'var(--text-on-accent)' }}
                    >
                      Check Color
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Loading state with image preview */}
            {linkLoading && (
              <div className="rounded-xl p-8 text-center space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
                {imagePreview && (
                  <img src={imagePreview} alt="Uploaded item" className="w-32 h-32 object-cover rounded-xl mx-auto" />
                )}
                <p className="text-sm animate-pulse" style={{ color: 'var(--text-muted)' }}>Analyzing colors...</p>
              </div>
            )}

            {linkResult && !linkLoading && (
              <LinkCheckResult
                result={linkResult as any}
                onReset={() => { setLinkResult(null); setSelectedImage(null); setImagePreview(null); setShowManualForm(false); }}
              />
            )}

            {linkError && (
              <div className="rounded-xl p-4 text-sm" style={{ background: 'rgba(212,175,122,0.08)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>{linkError}</div>
            )}
          </div>
        )}
      </main>

      {/* ==================== FLOATING CHATBOT ==================== */}
      {!chatOpen && tab !== "overview" && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition cursor-pointer animate-bounce-in z-50"
          style={{ background: 'var(--accent-gold)', color: 'var(--text-on-accent)' }}
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {chatOpen && (
        <div className="fixed bottom-6 right-6 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] rounded-2xl shadow-2xl flex flex-col z-50 animate-bounce-in overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(212,175,122,0.12)' }}><Sparkles className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} /></div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Color Advisor &bull; {seasonName}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Ask anything specific</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {chatMessages.length > 0 && (
                <button
                  onClick={() => setChatMessages([])}
                  className="text-xs px-2 py-1 rounded-lg transition cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Clear
                </button>
              )}
              <button onClick={() => setChatOpen(false)} className="cursor-pointer" style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
            {chatMessages.length === 0 && (
              <div className="space-y-3">
                <div className="rounded-xl rounded-tl-sm p-3" style={{ background: 'rgba(212,175,122,0.12)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    Hi! I know your {seasonName} profile. Ask me about any specific product, shade, brand, or outfit — I&apos;ll give you a direct, personalized answer!
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {quickQuestions.map((q) => (
                    <button key={q} onClick={() => sendMessage(q)} className="px-3 py-1.5 rounded-full text-xs transition cursor-pointer" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl p-3 text-sm whitespace-pre-wrap ${
                  msg.role === "user" ? "rounded-br-sm" : "rounded-bl-sm"
                }`} style={msg.role === "user" ? { background: 'var(--accent-gold)', color: 'var(--text-on-accent)' } : { background: 'rgba(212,175,122,0.12)', color: 'var(--text-primary)' }}>
                  {msg.role === "assistant" ? renderChatContent(msg.content) : msg.content}
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex justify-start">
                <div className="rounded-xl rounded-bl-sm px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(212,175,122,0.12)' }}>
                  {chatSearchPhase ? (
                    <>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Looking up product details</span>
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-gold)', animation: "typing-dot 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s` }} />
                      ))}
                    </>
                  ) : (
                    <>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Thinking</span>
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-gold)', animation: "typing-dot 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s` }} />
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-3" style={{ borderTop: '1px solid var(--border-color)' }}>
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSendChat(); }}
                placeholder="Ask about a product or shade..."
                className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
                style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              />
              <button onClick={handleSendChat} disabled={!chatInput.trim() || chatLoading} className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-30 cursor-pointer transition" style={{ background: 'var(--accent-gold)', color: 'var(--text-on-accent)' }}>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
