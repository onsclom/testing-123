import fs from "node:fs/promises" // file system operations
import * as matter from "gray-matter" // parsing front matter
import { parse } from "marked" // parsing markdown

// User variables! You should edit these!
const OUTPUT_DIR = "./public" // Default for Vercel
const FAVICON_EMOJI = "🍞"
const BLOG_TITLE = "Bun Blog"
const nav = [
  {
    title: "Home",
    href: "/",
  },
  {
    title: "About",
    href: "/about",
  },
  {
    title: "Blog",
    href: "/blog",
  },
  {
    title: "GitHub",
    href: "https://github.com/onsclom/bun-blog",
  },
]

type Link = {
  title: string
  href: string
}

const renderNavItem = ({ title, href }: Link, curPath: string) =>
  `<a href="${href}" aria-current=${href === curPath}>${title}</a>`

const renderNavBar = (curPath: string) =>
  `<nav>${nav.map((link) => renderNavItem(link, curPath)).join(" ")}</nav>`

const renderPage = (
  path: string,
  title: string,
  content: string
) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${FAVICON_EMOJI}</text></svg>">
    <link rel="stylesheet" href="https://unpkg.com/bamboo.css">
    <style>
      a[aria-current="true"] { text-decoration: underline }
      nav { display: flex; gap: 2rem; }
    </style>
  </head>
  <body>
  <header>
    <h1>${FAVICON_EMOJI} ${BLOG_TITLE}</h1>
    ${renderNavBar(path)}
  </header>
  <main>
    ${content}
  </main>
  </body>
</html>`

await fs.rm(OUTPUT_DIR, { recursive: true, force: true })
await fs.mkdir(OUTPUT_DIR)
const pages = await fs.readdir("./content/pages")
for (const page of pages) {
  const { data, content } = matter.read(`./content/pages/${page}`)
  const renderedContent = parse(content)
  const path = page.replace(".md", "").replace("index", "")
  if (path) await fs.mkdir(`${OUTPUT_DIR}/${path}`)
  // TODO: use zod for this
  if (typeof data.title !== "string")
    throw new Error(`Missing title in ${page}`)
  await fs.writeFile(
    `${OUTPUT_DIR}/${path}/index.html`,
    renderPage(`/${path}`, data.title, renderedContent)
  )
}

const blogPosts = await fs.readdir("./content/blog")
const postData = blogPosts
  .map((page) => ({
    ...matter.read(`./content/blog/${page}`),
    slug: page.replace(".md", ""),
  }))
  .map(({ data, content, slug }) => ({
    data,
    renderedContent: parse(content),
    slug,
  }))
  .sort(
    (a, b) =>
      new Date(b.data.pubDate).getTime() - new Date(a.data.pubDate).getTime()
  )

await fs.mkdir(`${OUTPUT_DIR}/blog`)
await fs.writeFile(
  `${OUTPUT_DIR}/blog/index.html`,
  renderPage(
    "/blog",
    "Blog",
    `<h2>Posts</h2>
<ul>${postData
      .map(
        ({ data, slug }) =>
          `<li>${new Date(
            data.pubDate
          ).toLocaleDateString()} <a href="/blog/${slug}">${
            data.title
          }</a></li>`
      )
      .join(" ")}</ul>`
  )
)

postData.forEach(async ({ data, renderedContent, slug }) => {
  await fs.mkdir(`${OUTPUT_DIR}/blog/${slug}`)
  const postContent = `<h1>${data.title}</h1>\n${renderedContent}`
  await fs.writeFile(
    `${OUTPUT_DIR}/blog/${slug}/index.html`,
    renderPage(`/blog/${slug}`, data.title, postContent)
  )
})
