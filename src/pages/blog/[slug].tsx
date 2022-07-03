import ErrorPage from "next/error";
import Head from "next/head";
import { useRouter } from "next/router";

import { getAllPosts, getPostBySlug } from "../../../lib/blog-post";
import { markdownToHtml } from "../../../lib/markdown-to-html";
import { Meta } from "../../components/meta";
import { PostContent } from "../../components/post-content";
import { Post as PostType } from "../../models/post";

export default function Post({ post }: { post: PostType }) {
    const router = useRouter();
    if (!router.isFallback && !post?.slug) {
        return <ErrorPage statusCode={404} />;
    }

    if (router.isFallback) {
        return <h2 className="italic">Loading…</h2>;
    }

    return (
        <>
            <Meta title={post.title} description={post.excerpt} />
            <PostContent
                title={post.title}
                content={post.content}
                date={post.date}
            />
        </>
    );
}

export async function getStaticProps({
    params,
}: {
    params: {
        slug: string;
    };
}) {
    const post = getPostBySlug(params.slug, [
        "title",
        "date",
        "slug",
        "content",
    ]);
    const content = await markdownToHtml(post.content);

    return {
        props: {
            post: {
                ...post,
                content,
            },
        },
    };
}

export async function getStaticPaths() {
    const posts = getAllPosts(["slug"]);

    return {
        paths: posts.map((post) => {
            return {
                params: {
                    slug: post.slug,
                },
            };
        }),
        fallback: false,
    };
}
