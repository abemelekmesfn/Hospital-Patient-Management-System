import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Triage from "./pages/Triage";
import Reception from "./pages/Reception";
import Doctor from "./pages/Doctor";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/triage" element={<Triage />} />
        <Route path="/reception" element={<Reception />} />
        <Route path="/doctor" element={<Doctor />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;