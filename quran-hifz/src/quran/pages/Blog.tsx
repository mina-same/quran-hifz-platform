import { SaasNav, SaasFooter } from "../components/SaasChrome";
import { BLOG_POSTS, type BlogBlock, type BlogPost } from "../data/blog";
import { toAr } from "../../lib/format";
import { PLATFORM_NAME, TRIAL_DAYS } from "../config/saas";

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
}

function PostMeta({ post }: { post: BlogPost }) {
  return (
    <div className="blog-meta">
      <span className="blog-tag">{post.tag}</span>
      <time dateTime={post.date}>{formatDate(post.date)}</time>
      <span>· {toAr(post.readMinutes)} دقائق قراءة</span>
    </div>
  );
}

/** `/blog` — article list. */
export function BlogIndex() {
  return (
    <div className="saas">
      <SaasNav />
      <main className="saas-section blog-wrap">
        <header className="blog-head">
          <h1>مدونة {PLATFORM_NAME}</h1>
          <p>مقالات عملية في إدارة حلقات تحفيظ القرآن الكريم، وخطط الحفظ والمراجعة، والتواصل مع أولياء الأمور.</p>
        </header>
        <div className="blog-list">
          {BLOG_POSTS.map((post) => (
            <a className="blog-card" key={post.slug} href={`/blog/${post.slug}`}>
              <div className="saas-card-icon"><i className={`ti ${post.icon}`} /></div>
              <div className="blog-card-body">
                <PostMeta post={post} />
                <h2>{post.title}</h2>
                <p>{post.description}</p>
                <span className="blog-more">اقرأ المقال <i className="ti ti-arrow-left" /></span>
              </div>
            </a>
          ))}
        </div>
      </main>
      <SaasFooter />
    </div>
  );
}

function Block({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case "h2":
      return <h2>{block.text}</h2>;
    case "ul":
      return <ul>{block.items.map((i) => <li key={i}>{i}</li>)}</ul>;
    case "quote":
      return (
        <blockquote>
          «{block.text}»{block.source && <cite>— {block.source}</cite>}
        </blockquote>
      );
    default:
      return <p>{block.text}</p>;
  }
}

/** `/blog/<slug>` — one article. */
export function BlogPostView({ post }: { post: BlogPost }) {
  const others = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);
  return (
    <div className="saas">
      <SaasNav />
      <main className="saas-section blog-wrap">
        <nav className="blog-crumbs" aria-label="مسار التنقل">
          <a href="/">الرئيسية</a> <i className="ti ti-chevron-left" /> <a href="/blog">المدونة</a>
        </nav>
        <article className="blog-article">
          <PostMeta post={post} />
          <h1>{post.title}</h1>
          <p className="blog-lead">{post.description}</p>
          {post.body.map((b, i) => <Block key={i} block={b} />)}
        </article>

        <aside className="blog-cta">
          <h2>طبّق هذا في حلقاتك اليوم</h2>
          <p>{PLATFORM_NAME} تنظّم الحضور والتقييم وخطط الحفظ وتواصل أولياء الأمور في مكان واحد — جرّبها مجاناً {toAr(TRIAL_DAYS)} أيام.</p>
          <a className="saas-btn saas-btn-light" href="/signup">سجّل مؤسستك مجاناً</a>
        </aside>

        {others.length > 0 && (
          <section className="blog-related">
            <h2>مقالات أخرى</h2>
            <div className="blog-related-grid">
              {others.map((p) => (
                <a key={p.slug} className="saas-card blog-related-card" href={`/blog/${p.slug}`}>
                  <span className="blog-tag">{p.tag}</span>
                  <h3>{p.title}</h3>
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
