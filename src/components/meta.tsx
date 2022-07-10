import React from "react";
import { Helmet } from "react-helmet";

export function Meta({
  title = "Marc Morant",
  description = "Personnal app",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Helmet>
      <title>{title}</title>

      <meta name="og:site_name" content={title} />
      <meta name="og:title" content={title} />
      <meta name="twitter:title" content={title} />

      <meta name="description" content={description} />
      <meta name="og:description" content={description} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}
