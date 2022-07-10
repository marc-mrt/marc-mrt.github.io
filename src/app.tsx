import React, { Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Layout } from "./components/layout";
import { Skeleton } from "./components/post-skeleton";
import { Home } from "./pages/home";
import { NotFound } from "./pages/not-found";
import "./styles/index.css";

const Blog = React.lazy(() => import("./pages/blog"));

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route
            path="blog/*"
            element={
              <Suspense fallback={<Skeleton />}>
                <Blog />
              </Suspense>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
