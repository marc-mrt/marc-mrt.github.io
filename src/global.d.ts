declare const GITHUB_URL: string;
declare const LINKEDIN_URL: string;

declare const APP_VERSION: string;

declare module "react-helmet" {
  export const Helmet: (props: React.PropsWithChildren) => JSX.Element;
}
