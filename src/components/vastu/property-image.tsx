import { cn } from "@/lib/cn";

/** Deterministic hue from a string key. */
function hueOf(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 360;
  return h;
}

/**
 * Architectural placeholder. The demo uses no real listing photos — this draws
 * a calm, deterministic abstract "home" so the feed looks premium without
 * misrepresenting any real property. A real image URL renders directly.
 */
export function PropertyImage({
  imageKey,
  url,
  alt,
  className,
  rounded = "rounded-t-lg",
}: {
  imageKey: string;
  url?: string | null;
  alt: string;
  className?: string;
  rounded?: string;
}) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={alt} className={cn("h-full w-full object-cover", rounded, className)} />;
  }
  const hue = hueOf(imageKey);
  const h2 = (hue + 28) % 360;
  const gid = `g-${imageKey.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg
      viewBox="0 0 400 260"
      role="img"
      aria-label={alt}
      preserveAspectRatio="xMidYMid slice"
      className={cn("h-full w-full", rounded, className)}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={`hsl(${hue} 32% 82%)`} />
          <stop offset="1" stopColor={`hsl(${h2} 26% 68%)`} />
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill={`url(#${gid})`} />
      {/* sky-to-ground calm band */}
      <rect y="178" width="400" height="82" fill={`hsl(${h2} 22% 42%)`} opacity="0.28" />
      {/* simple house silhouette */}
      <g fill={`hsl(${hue} 30% 30%)`} opacity="0.55">
        <path d="M150 150 L200 112 L250 150 Z" />
        <rect x="162" y="150" width="76" height="52" />
        <rect x="190" y="172" width="20" height="30" fill={`hsl(${hue} 30% 20%)`} />
      </g>
      <g fill={`hsl(${h2} 30% 34%)`} opacity="0.4">
        <rect x="250" y="156" width="54" height="46" />
        <path d="M250 156 L277 134 L304 156 Z" />
      </g>
    </svg>
  );
}
