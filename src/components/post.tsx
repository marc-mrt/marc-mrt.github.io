import React from "react";
import { Link } from "react-router-dom";

import { useJSONAsset } from "../assets/fetch";
import { Post as PostType } from "../models/post";
import { Date } from "./date";
import { Meta } from "./meta";
import {
  Article,
  ParagraphSkeleton,
  PulsingSkeletonContainer,
} from "./post-skeleton";

export function Post({
  title,
  date,
  excerpt,
  slug,
}: {
  title: string;
  date: string;
  excerpt: string;
  slug: string;
}) {
  const post = useJSONAsset<PostType | undefined>(slug, undefined);

  return (
    <Article>
      <Meta title={title} description={excerpt} />
      <h2 className="text-blue-900">{title}</h2>
      <Date date={date} />
      {post?.content ? (
        <div dangerouslySetInnerHTML={{ __html: post.content }} />
      ) : (
        <PulsingSkeletonContainer>
          <ParagraphSkeleton />
          <ParagraphSkeleton />
          <ParagraphSkeleton />
        </PulsingSkeletonContainer>
      )}
    </Article>
  );
}

export function Preview({
  title,
  date,
  excerpt,
  slug,
}: {
  title: string;
  date: string;
  excerpt: string;
  slug: string;
}) {
  return (
    <Article>
      <h2>
        <Link className="hover:underline" to={`/blog/${slug}`}>
          {title}
        </Link>
      </h2>
      <Date date={date} />
      <p className="italic">{excerpt}</p>
    </Article>
  );
}
