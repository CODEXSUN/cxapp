import { ArrowRight } from "lucide-react";

export function TenantEditorialBand({
  body,
  eyebrow,
  href,
  image,
  imageAlt,
  linkLabel,
  title
}: {
  body: string;
  eyebrow: string;
  href: string;
  image: string;
  imageAlt: string;
  linkLabel: string;
  title: string;
}) {
  return (
    <section className="tenant-editorial-band">
      <figure>
        <img src={image} alt={imageAlt} />
      </figure>
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{body}</p>
        <a href={href}>
          {linkLabel} <ArrowRight />
        </a>
      </div>
    </section>
  );
}
