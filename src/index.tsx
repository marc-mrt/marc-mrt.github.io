import React from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app";

const container = document.getElementById("app");
if (!container) throw new Error("app container doesn't exist");

const root = createRoot(container);
root.render(<App />);
