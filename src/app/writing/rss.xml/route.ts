import { publishedPosts } from "@/lib/writing";
import { absoluteUrl, siteConfig } from "@/lib/seo";

// Prerendered at build time like everything else on this site.
export const dynamic = "force-static";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function GET() {
  const posts = publishedPosts();
  const updated = posts[0]?.date;

  const items = posts
    .map((post) => {
      // External pieces link to where they actually live, which is what a
      // reader subscribing to this feed wants to open.
      const url = post.external ? post.external.url : absoluteUrl(`/writing/${post.slug}`);
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(post.summary)}</description>
      <pubDate>${new Date(`${post.date}T00:00:00Z`).toUTCString()}</pubDate>
${post.tags.map((tag) => `      <category>${escapeXml(tag)}</category>`).join("\n")}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteConfig.name)}</title>
    <link>${absoluteUrl("/writing")}</link>
    <description>Occasional essays. Some about building software, some about the things that sit underneath it.</description>
    <language>en-us</language>
    <atom:link href="${absoluteUrl("/writing/rss.xml")}" rel="self" type="application/rss+xml"/>
${updated ? `    <lastBuildDate>${new Date(`${updated}T00:00:00Z`).toUTCString()}</lastBuildDate>` : ""}
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
