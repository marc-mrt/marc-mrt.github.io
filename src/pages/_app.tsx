import { AppProps } from "next/app";

import { Layout } from "../components/layout";
import { Meta } from "../components/meta";
import "../styles/index.css";

export default function App({ Component, pageProps }: AppProps) {
    return (
        <>
            <Meta />
            <Layout>
                <Component {...pageProps} />
            </Layout>
        </>
    );
}
