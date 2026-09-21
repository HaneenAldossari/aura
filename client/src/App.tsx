import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";

import Home from "./pages/Home";

// Route-level code splitting — each page (and its heavy deps) loads only when
// visited. Home is the exception: it is where almost everyone arrives, and as
// a lazy chunk it could not even be requested until the main bundle had run,
// which put a full round trip between the visitor and the headline.
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
/** The route was /analyze before British spelling reached the router. */
function AnalyseRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/analyse${search}`} replace />;
}

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
          {/* British spelling is the rule everywhere else, so it is the rule
              here too. The old path redirects: links to it already exist. */}
          <Route path="/analyse" element={<Analysis />} />
          <Route path="/analyze" element={<AnalyseRedirect />} />
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
