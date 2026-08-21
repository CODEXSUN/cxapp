import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { listTenantPublicStories, tenantStoryImage } from "../tenant-news.services";
import { codexsunStories } from "../tenant-site.content";
import { useTenantSite } from "../tenant-site.context";

type HomeStory = {
  description: string;
  href: string;
  image: string;
  label: string;
  publishedAt: string;
  title: string;
};

export function TenantNewsDeskSection() {
  const { portal } = useTenantSite();
  const query = useQuery({
    queryFn: listTenantPublicStories,
    queryKey: ["tenant-public-stories", "home"]
  });
  const tenantKey = portal.tenantCode?.trim().toLowerCase() || "public";
  const mediaBasePath = portal.blogMediaPath || `/storage/${tenantKey}/public/blogs/images`;
  const stories = query.isError
    ? [...codexsunStories]
    : (query.data ?? []).slice(0, 6).map((story, index): HomeStory => ({
        description: story.excerpt,
        href: `/blog/${story.slug}`,
        image:
          tenantStoryImage(story.featuredImage, mediaBasePath) ||
          codexsunStories[index % codexsunStories.length]!.image,
        label: story.kind === "page" ? "Product note" : "Daily story",
        publishedAt: story.publishedAt ?? new Date().toISOString(),
        title: story.title
      }));

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
        {stories.map((story, index) => (
          <article className={index === 0 ? "is-lead" : undefined} key={story.title}>
            <a href={story.href}>
              <figure>
                <img
                  src={story.image}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src =
                      codexsunStories[index % codexsunStories.length]!.image;
                  }}
                />
              </figure>
              <div>
                <span>
                  {story.label} · {formatStoryDate(story.publishedAt)}
                </span>
                <h3>{story.title}</h3>
                <p>{story.description}</p>
              </div>
            </a>
          </article>
        ))}
      </div>
      {query.isError ? (
        <p className="tenant-news-source-note">
          Showing the CODEXSUN editorial selection while live stories reconnect.
        </p>
      ) : null}
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
