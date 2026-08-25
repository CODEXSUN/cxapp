import { useQuery } from "@tanstack/react-query";
import { blogMediaUrl, blogPlaceholder, searchPublicArticles } from "@codexsun/blog/web";
import { ArrowRight } from "lucide-react";
import { useTenantSite } from "../tenant-site.context";

export function TenantNewsDeskSection() {
  const { portal } = useTenantSite();
  const query = useQuery({
    queryFn: () => searchPublicArticles(),
    queryKey: ["public-blog"]
  });
  const tenantKey = portal.tenantCode?.trim().toLowerCase() || "codexsun";
  const mediaBasePath = portal.blogMediaPath || `/storage/${tenantKey}/public/blogs/images`;
  const stories = (query.data ?? []).slice(0, 6);

  return (
    <section className="tenant-news-desk">
      <header className="tenant-news-masthead">
        <span>{formatLongDate(new Date())}</span>
        <strong>CODEXSUN STORIES</strong>
        <small>Features · Technology · Automation</small>
      </header>
      <div className="tenant-news-title">
        <h2>The latest</h2>
        <a href="/blog">
          View all <ArrowRight />
        </a>
      </div>
      <div className="tenant-news-grid" aria-live="polite">
        {query.isLoading ? (
          <p className="tenant-news-source-note">Loading latest stories…</p>
        ) : null}
        {query.isError ? (
          <p className="tenant-news-source-note">Stories are temporarily unavailable.</p>
        ) : null}
        {!query.isLoading && !query.isError && !stories.length ? (
          <p className="tenant-news-source-note">Published stories will appear here.</p>
        ) : null}
        {stories.map((story, index) => {
          const fallbackImage = blogPlaceholder("");
          const image = story.featuredImage
            ? blogMediaUrl(story.featuredImage, mediaBasePath)
            : fallbackImage;
          return (
            <article className={index === 0 ? "is-lead" : undefined} key={story.id}>
              <a href={`/blog/${story.slug}`}>
                <figure>
                  <img
                    src={image}
                    alt={story.imageAlt}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = fallbackImage;
                    }}
                  />
                </figure>
                <div>
                  <span>
                    {story.kind === "page" ? "Product note" : "Daily story"} ·{" "}
                    {formatStoryDate(story.publishedAt ?? story.createdAt)}
                  </span>
                  <h3>{story.title}</h3>
                  <p>{story.excerpt}</p>
                </div>
              </a>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function formatLongDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric"
  })
    .format(value)
    .toUpperCase();
}

function formatStoryDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}
