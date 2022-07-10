import React from "react";

import classNames from "classnames";

export function Article({
  className = "",
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <article className={classNames("mb-4", className)}>{children}</article>
  );
}

export function Skeleton() {
  return (
    <PulsingSkeletonContainer>
      <h2 className="bg-gray-300 text-transparent">LOADING</h2>
      <time className="bg-gray-300 text-transparent">LOADING</time>
      <ParagraphSkeleton />
    </PulsingSkeletonContainer>
  );
}

export function PulsingSkeletonContainer({
  children,
}: React.PropsWithChildren) {
  return (
    <Article className="flex animate-pulse flex-col w-full space-y-1">
      {children}
    </Article>
  );
}

export function ParagraphSkeleton() {
  return <p className="bg-gray-300 text-transparent">LOADING</p>;
}
