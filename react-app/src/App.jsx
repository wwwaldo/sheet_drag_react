import { NavLink, Route, Routes } from "react-router-dom";
import BearingtonSheet from "./BearingtonSheet.jsx";
import LayoutLab from "./LayoutLab.jsx";

export default function App() {
  return (
    <>
      <nav className="nav">
        <span className="brand">Bearington</span>
        <NavLink to="/" end>Sheet</NavLink>
        <NavLink to="/layout-lab">Layout Lab</NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<BearingtonSheet />} />
        <Route path="/layout-lab" element={<LayoutLab />} />
      </Routes>
    </>
  );
}
