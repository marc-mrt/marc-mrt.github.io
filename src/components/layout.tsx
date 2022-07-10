import React from "react";
import { NavLink, Outlet } from "react-router-dom";

import classNames from "classnames";

import { Meta } from "./meta";

export function Layout() {
  return (
    <div className="min-h-screen mx-auto w-11/12 sm:w-10/12 md:w-8/12 lg:w-6/12 xl:w-4/12 pt-48">
      <Meta />
      <header>
        <h1 className="mb-20">
          <NavLink
            to="/"
            className={({ isActive }) =>
              classNames(isActive ? "text-blue-900" : "hover:underline")
            }
          >
            Home
          </NavLink>
          .
          <NavLink
            to="/blog"
            className={({ isActive }) =>
              classNames(isActive ? "text-blue-900" : "hover:underline")
            }
          >
            Blog
          </NavLink>
          .
        </h1>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="flex flex-col items-center my-8 border-t border-slate-500">
        <div className="flex items-center my-2">
          <a
            className="mr-2"
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Svg Icon={GitHub} />
          </a>
          <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
            <Svg viewBox="0 0 24 24" Icon={LinkedIn} />
          </a>
        </div>
        <small>{APP_VERSION}</small>
      </footer>
    </div>
  );
}

function Svg({
  size = 16,
  viewBox = "0 0 16 16",
  Icon,
}: {
  size?: number;
  viewBox?: string;
  Icon: () => JSX.Element;
}) {
  return (
    <svg
      version="1.1"
      height={size}
      width={size}
      viewBox={viewBox}
      className="transition duration-200 ease-in-out text-blue-secondary dark:hover:text-blue-primary dark:text-white-primary hover:text-blue-primary fill-current"
      preserveAspectRatio="xMidYMid meet"
    >
      {Icon()}
    </svg>
  );
}

function GitHub() {
  return (
    <path
      fillRule="evenodd"
      d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
    />
  );
}

function LinkedIn() {
  return (
    <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z" />
  );
}
