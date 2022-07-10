import React from "react";
import { Route, Routes } from "react-router-dom";

import { useJSONAsset } from "../assets/fetch";
import { Post } from "../components/post";
import { Preview } from "../components/post";
import { Skeleton } from "../components/post-skeleton";
import { Post as PostType } from "../models/post";

export default function Blog() {
  const posts = useJSONAsset<PostType[]>("posts", []);

  return (
    <Routes>
      <Route path="/">
        <Route index element={<Previews posts={posts} />} />
        {posts.map((post) => (
          <Route
            path={post.slug}
            key={post.slug}
            element={
              <Post
                title={post.title}
                date={post.date}
                slug={post.slug}
                excerpt={post.excerpt}
              />
            }
          />
        ))}
        <Route path="*" element={<Skeleton />} />
      </Route>
    </Routes>
  );
}

function Previews({ posts }: { posts: PostType[] }) {
  if (posts.length === 0) {
    return <Skeleton />;
  }

  return (
    <>
      {posts.map((post) => (
        <Preview
          key={post.slug}
          title={post.title}
          date={post.date}
          excerpt={post.excerpt}
          slug={post.slug}
        />
      ))}
    </>
  );
}
