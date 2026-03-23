import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { marked } from "marked";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return { title: `${post.title} — GridMind Blog`, description: post.excerpt };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const html = marked(post.content);

  return (
    <main className="min-h-screen bg-slate-950 pt-24 pb-32">
      <article className="mx-auto max-w-3xl px-6">
        <Link
          href="/blog"
          className="mb-8 inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-300"
        >
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
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          All posts
        </Link>

        <img
          src={post.imageUrl}
          alt={post.imageAlt}
          className="mb-10 h-72 w-full rounded-xl object-cover"
        />

        <time className="font-mono text-xs text-slate-500">
          {new Date(post.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>
        <h1 className="mt-2 font-heading text-4xl font-bold leading-tight text-white">
          {post.title}
        </h1>

        <div
          className="prose prose-invert prose-slate mt-10 max-w-none prose-p:leading-relaxed prose-p:text-slate-300 prose-headings:text-white prose-a:text-primary"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </article>
    </main>
  );
}
