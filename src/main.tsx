import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/brand.css"; // ✅ ADD THIS


import { getToken } from "@/lib/auth";



createRoot(document.getElementById("root")!).render(<App />);