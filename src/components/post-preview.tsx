import Link from "next/link";

import { Date } from "./date";

export function PostPreview({
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
        <article className="mb-2">
            <h2>
                <Link as={`/blog/${slug}`} href="/blog/[slug]">
                    <a className="hover:underline">{title}</a>
                </Link>
            </h2>
            <Date date={date} />
            <p className="italic leading-relaxed mb-4">{excerpt}</p>
        </article>
    );
}
