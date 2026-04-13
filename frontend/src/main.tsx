import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "./components/ui/provider";
import { Toaster } from "./components/ui/toaster";
import "./i18n";

import { App } from "./App";
import { queryClient } from "./lib/queryClient";
import "./tailwind.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Provider>
        <App />
        <Toaster />
      </Provider>
    </BrowserRouter>
  </QueryClientProvider>
);

