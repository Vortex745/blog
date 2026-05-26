import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context) {
  const articles = await getCollection("articles");
  const projects = await getCollection("projects");

  const items = [
    ...articles.map((article) => ({
      title: article.data.title,
      description: article.data.description,
      pubDate: article.data.date,
      link: `/articles/${article.id.replace(/\.mdx?$/, "")}/`,
    })),
    ...projects.map((project) => ({
      title: project.data.title,
      description: project.data.description,
      pubDate: project.data.date,
      link: `/projects/${project.id.replace(/\.mdx?$/, "")}/`,
    })),
  ];

  items.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: "子衿的个人博客网站",
    description: "子衿的个人博客 — 技术、设计、生活的思考",
    site: context.site,
    items,
    customData: "<language>zh-CN</language>",
  });
}


