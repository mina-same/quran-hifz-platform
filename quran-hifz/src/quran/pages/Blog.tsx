import { SaasNav, SaasFooter } from "../components/SaasChrome";
import {
  BLOG_AUTHOR,
  BLOG_POSTS,
  readMinutes,
  tableOfContents,
  type BlogBlock,
  type BlogImage,
  type BlogPost,
} from "../data/blog";
import { toAr } from "../../lib/format";
import { PLATFORM_LOGO, PLATFORM_NAME, TRIAL_DAYS } from "../config/saas";

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

function minutesLabel(n: number): string {
  if (n === 1) return "دقيقة قراءة";
  if (n === 2) return "دقيقتا قراءة";
  return `${toAr(n)} ${n <= 10 ? "دقائق" : "دقيقة"} قراءة`;
}

function PostMeta({ post }: { post: BlogPost }) {
  return (
    <div className="blog-meta">
      <span className="blog-tag">{post.tag}</span>
      <time dateTime={post.date}>{formatDate(post.date)}</time>
      <span aria-hidden="true">·</span>
      <span>{minutesLabel(readMinutes(post))}</span>
    </div>
  );
}

/** <img> with alt + title + intrinsic size (prevents layout shift). */
function Img({ image, eager, className }: { image: BlogImage; eager?: boolean; className?: string }) {
  return (
    <img
      className={className}
      src={image.src}
      alt={image.alt}
      title={image.title}
      width={image.width}
      height={image.height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      {...(eager ? { fetchPriority: "high" as const } : {})}
    />
  );
}

function PostCard({ post, featured }: { post: BlogPost; featured?: boolean }) {
  return (
    <article className={`blog-card ${featured ? "featured" : ""}`}>
      <a href={`/blog/${post.slug}`} className="blog-card-link" aria-label={post.title}>
        <div className="blog-card-media">
          <Img image={post.cover} eager={featured} />
        </div>
        <div className="blog-card-body">
          <PostMeta post={post} />
          <h2>{post.title}</h2>
          <p>{post.description}</p>
          <span className="blog-more">اقرأ المقال <i className="ti ti-arrow-left" /></span>
        </div>
      </a>
    </article>
  );
}

/** `/blog` — article list. */
export function BlogIndex() {
  const [first, ...rest] = BLOG_POSTS;
  return (
    <div className="saas">
      <SaasNav />
      <main className="saas-section blog-wrap blog-wrap-wide">
        <nav className="blog-crumbs" aria-label="مسار التنقل">
          <a href="/">الرئيسية</a> <i className="ti ti-chevron-left" /> <span aria-current="page">المدونة</span>
        </nav>
        <header className="blog-head">
          <h1>مدونة {PLATFORM_NAME}: إدارة حلقات تحفيظ القرآن الكريم</h1>
          <p>مقالات عملية في إدارة حلقات التحفيظ، وخطط الحفظ والمراجعة، ومتابعة أولياء الأمور، والتحول الرقمي لجمعيات القرآن الكريم.</p>
        </header>
        {first && <PostCard post={first} featured />}
        <div className="blog-grid">
          {rest.map((post) => <PostCard key={post.slug} post={post} />)}
        </div>
      </main>
      <SaasFooter />
    </div>
  );
}

function Block({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case "h2":
      return <h2 id={block.id}>{block.text}</h2>;
    case "h3":
      return <h3>{block.text}</h3>;
    case "ul":
      return <ul>{block.items.map((i) => <li key={i}>{i}</li>)}</ul>;
    case "ol":
      return <ol>{block.items.map((i) => <li key={i}>{i}</li>)}</ol>;
    case "quote":
      return (
        <blockquote>
          <p>«{block.text}»</p>
          {block.source && <cite>— {block.source}</cite>}
        </blockquote>
      );
    case "tip":
      return (
        <aside className="blog-tip">
          <i className="ti ti-bulb" />
          <div><b>{block.title}</b><p>{block.text}</p></div>
        </aside>
      );
    case "img":
      return (
        <figure className="blog-figure">
          <Img image={block.image} />
          {block.image.caption && <figcaption>{block.image.caption}</figcaption>}
        </figure>
      );
    default:
      return <p>{block.text}</p>;
  }
}

/** `/blog/<slug>` — one article. */
export function BlogPostView({ post }: { post: BlogPost }) {
  const toc = tableOfContents(post);
  const others = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);
  return (
    <div className="saas">
      <SaasNav />
      <main className="saas-section blog-wrap">
        <nav className="blog-crumbs" aria-label="مسار التنقل">
          <a href="/">الرئيسية</a> <i className="ti ti-chevron-left" />
          <a href="/blog">المدونة</a> <i className="ti ti-chevron-left" />
          <span aria-current="page">{post.tag}</span>
        </nav>

        <article className="blog-article">
          <header>
            <PostMeta post={post} />
            <h1>{post.title}</h1>
            <p className="blog-lead">{post.description}</p>
            <div className="blog-byline">
              <img src={PLATFORM_LOGO} alt={`شعار ${PLATFORM_NAME}`} title={BLOG_AUTHOR} width={36} height={36} />
              <div>
                <b>{BLOG_AUTHOR}</b>
                <span>آخر تحديث: <time dateTime={post.updated}>{formatDate(post.updated)}</time></span>
              </div>
            </div>
          </header>

          <figure className="blog-figure blog-cover">
            <Img image={post.cover} eager />
          </figure>

          {toc.length > 2 && (
            <nav className="blog-toc" aria-label="محتويات المقال">
              <b><i className="ti ti-list" /> محتويات المقال</b>
              <ol>{toc.map((t) => <li key={t.id}><a href={`#${t.id}`}>{t.text}</a></li>)}</ol>
            </nav>
          )}

          {post.body.map((b, i) => <Block key={i} block={b} />)}

          {post.faq.length > 0 && (
            <section className="blog-faq" aria-labelledby="faq">
              <h2 id="faq">أسئلة شائعة</h2>
              {post.faq.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </section>
          )}
        </article>

        <aside className="blog-cta">
          <h2>طبّق هذا في حلقاتك اليوم</h2>
          <p>{PLATFORM_NAME} تنظّم الحضور والتقييم وخطط الحفظ وتواصل أولياء الأمور في مكان واحد — جرّبها مجاناً {toAr(TRIAL_DAYS)} أيام.</p>
          <a className="saas-btn saas-btn-light" href="/signup">سجّل مؤسستك مجاناً</a>
        </aside>

        {others.length > 0 && (
          <section className="blog-related" aria-labelledby="related">
            <h2 id="related">مقالات ذات صلة</h2>
            <div className="blog-related-grid">
              {others.map((p) => (
                <a key={p.slug} className="blog-related-card" href={`/blog/${p.slug}`}>
                  <Img image={p.cover} />
                  <div>
                    <span className="blog-tag">{p.tag}</span>
                    <h3>{p.title}</h3>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
      <SaasFooter />
    </div>
  );
}
