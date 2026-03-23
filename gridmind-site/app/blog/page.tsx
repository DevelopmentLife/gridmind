import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog — GridMind",
  description: "News and insights on DBaaS, AI costs, and autonomous database operations.",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <main className="min-h-screen bg-slate-950 pt-24 pb-32">
      <div className="mx-auto max-w-4xl px-6">
        <div className="mb-16 text-center">
          <span className="font-mono text-sm text-primary">Blog</span>
          <h1 className="mt-2 font-heading text-4xl font-bold text-white sm:text-5xl">
            DBaaS & AI Insights
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            Deep research on the database-as-a-service market and the rising cost of AI infrastructure.
          </p>
        </div>

        {posts.length === 0 ? (
          <p className="text-center text-slate-500">No posts yet — check back soon.</p>
        ) : (
          <div className="space-y-10">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group block overflow-hidden rounded-xl border border-white/10 bg-slate-900/50 transition-colors hover:border-white/20 hover:bg-slate-900/80"
              >
                <img
                  src={post.imageUrl}
                  alt={post.imageAlt}
                  className="h-56 w-full object-cover"
                  loading="lazy"
                />
                <div className="p-8">
                  <time className="font-mono text-xs text-slate-500">
                    {new Date(post.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                  <h2 className="mt-2 font-heading text-2xl font-bold text-white transition-colors group-hover:text-primary">
                    {post.title}
                  </h2>
                  <p className="mt-3 leading-relaxed text-slate-400">{post.excerpt}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Read more
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
