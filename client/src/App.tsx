import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";

// Route-level code splitting — each page (and its heavy deps like gsap)
// loads only when visited.
const Home = lazy(() => import("./pages/Home"));
const Analysis = lazy(() => import("./pages/Analysis"));
const Results = lazy(() => import("./pages/Results"));

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

/** The standalone page became the Shop tab; shared links still land right. */
function BeforeYouBuyRedirect() {
  const { sessionId } = useParams<{ sessionId: string }>();
  return <Navigate to={`/results/${sessionId}?tab=shop`} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/analyze" element={<Analysis />} />
          <Route path="/results/:sessionId" element={<Results />} />
          {/* Kept as a redirect: the standalone page became the Shop tab, and
              any link already shared should still land on the right thing. */}
          <Route path="/before-you-buy/:sessionId" element={<BeforeYouBuyRedirect />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
