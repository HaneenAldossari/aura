import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Analysis from "./pages/Analysis";
import Results from "./pages/Results";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/analyze" element={<Analysis />} />
        <Route path="/results/:sessionId" element={<Results />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
