import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Triage from "./pages/Triage";
import Reception from "./pages/Reception";
import Doctor from "./pages/Doctor";
import Lab from "./pages/Lab";
import Pharmacy from "./pages/Pharmacy";
import Nurse from "./pages/Nurse";
import Admin from "./pages/Admin";
import Cashier from "./pages/Cashier";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/triage" element={<Triage />} />
        <Route path="/reception" element={<Reception />} />
        <Route path="/doctor" element={<Doctor />} />
        <Route path="/lab" element={<Lab />} />
        <Route path="/pharmacy" element={<Pharmacy />} />
        <Route path="/nurse" element={<Nurse />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/cashier" element={<Cashier />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;