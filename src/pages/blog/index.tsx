import { getAllPosts } from "../../../lib/blog-post";
import { PostPreview } from "../../components/post-preview";
import { Post } from "../../models/post";

export default function Index({ posts }: { posts: Post[] }) {
    if (posts.length === 0) {
        return <p>Seems like there&apos;s nothing here!</p>;
    }

    return (
        <>
            {posts.map((post) => (
                <PostPreview
                    key={post.slug}
                    title={post.title}
                    date={post.date}
                    slug={post.slug}
                    excerpt={post.excerpt}
                />
            ))}
        </>
    );
}

export const getStaticProps = async () => {
    const posts = getAllPosts(["title", "excerpt", "date", "slug"]);

    return {
        props: { posts },
    };
};
