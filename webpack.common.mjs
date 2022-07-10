import CopyPlugin from "copy-webpack-plugin";
import matter from "gray-matter";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import path from "path";
import { remark } from "remark";
import html from "remark-html";
import webpack from "webpack";

function appVersion() {
  const date = new Date(Date.now());

  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}

export default {
  entry: path.join(process.cwd(), "src", "index.tsx"),
  resolve: {
    extensions: [".js", ".ts", ".tsx"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: path.resolve(process.cwd(), "node_modules"),
        use: {
          loader: "babel-loader",
          options: {
            env: {
              production: {
                compact: true,
                comments: false,
                minified: true,
              },
            },
            presets: [
              "@babel/preset-env",
              "@babel/preset-react",
              "@babel/preset-typescript",
            ],
            plugins: [
              "@babel/plugin-syntax-dynamic-import",
              "@babel/plugin-proposal-object-rest-spread",
            ],
          },
        },
      },
      {
        test: /\.css$/,
        exclude: /node_modules/,
        use: [
          MiniCssExtractPlugin.loader,
          { loader: "css-loader", options: { url: false } },
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                plugins: [
                  ["postcss-import", {}],
                  [
                    "tailwindcss",
                    {
                      content: ["./src/app.tsx", "./src/components/**/*.tsx"],
                    },
                  ],
                  ["autoprefixer", {}],
                ],
              },
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "[name].[contenthash].css",
    }),
    new HtmlWebpackPlugin({
      template: path.join(process.cwd(), "src", "index.html"),
    }),
    new CopyPlugin({
      patterns: [
        {
          from: "_posts/*.md",
          to: "[name].json",
          async transform(fileContents) {
            const { data, content } = matter(fileContents.toString());
            const markdown = await remark().use(html).process(content);

            return JSON.stringify({
              title: data.title,
              excerpt: data.excerpt,
              date: data.date,
              content: markdown.toString(),
            });
          },
        },
        {
          from: "_posts/*.md",
          to: "posts.json",
          transformAll(assets) {
            const result = assets.reduce((accumulator, asset) => {
              const fileContents = asset.data;
              const { data } = matter(fileContents.toString());

              const filePath = asset.sourceFilename.split("/");
              const slug = filePath[filePath.length - 1].replace(/\.md$/, "");

              return [
                ...accumulator,
                {
                  slug,
                  title: data.title,
                  excerpt: data.excerpt,
                  date: data.date,
                },
              ];
            }, []);

            return JSON.stringify(result);
          },
        },
      ],
    }),
    new webpack.DefinePlugin({
      APP_VERSION: JSON.stringify(appVersion()),
      LINKEDIN_URL: JSON.stringify(
        "https://www.linkedin.com/in/marc-morant-dev/",
      ),
      GITHUB_URL: JSON.stringify("https://github.com/marc-mrt/"),
    }),
  ],
  output: {
    filename: "[name].[contenthash].js",
    publicPath: "/",
    path: path.resolve(process.cwd(), "dist"),
    clean: true,
  },
};
