import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Route-level code splitting — each page (and its heavy deps like gsap)
// loads only when visited.
const Home = lazy(() => import("./pages/Home"));
const Analysis = lazy(() => import("./pages/Analysis"));
const Results = lazy(() => import("./pages/Results"));
const BeforeYouBuy = lazy(() => import("./pages/BeforeYouBuy"));

function PageFallback() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--bg-primary)" }}
    >
      <div
        className="w-12 h-12 rounded-full border-4 animate-spin-slow"
        style={{
          borderColor: "var(--border-color)",
          borderTopColor: "var(--accent-gold)",
        }}
      />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/analyze" element={<Analysis />} />
          <Route path="/results/:sessionId" element={<Results />} />
          {/* Its own route, not a tab: people return to this without re-reading
              their result, and the id pins which palette it scores against. */}
          <Route path="/before-you-buy/:sessionId" element={<BeforeYouBuy />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
