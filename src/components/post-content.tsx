import { Date } from "./date";

export function PostContent({
    title,
    content,
    date,
}: {
    title: string;
    content: string;
    date: string;
}) {
    return (
        <article>
            <h2 className="text-blue-900">{title}</h2>
            <Date date={date} />
            <div dangerouslySetInnerHTML={{ __html: content }} />{" "}
        </article>
    );
}
