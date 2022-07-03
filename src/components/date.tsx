import { DateTime } from "luxon";

export function Date({ date }: { date: string }) {
    const parsedDate = DateTime.fromISO(date);

    return <time dateTime={date}>{parsedDate.toFormat("LLLL	d, yyyy")}</time>;
}
