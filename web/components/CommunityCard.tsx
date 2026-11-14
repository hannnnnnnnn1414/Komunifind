import Link from "next/link";
import { mediaUrl } from "@/lib/format";
import type { Community } from "@/lib/types";

export function CommunityCard({ community }: { community: Community }) {
  const logo = mediaUrl(community.logoKey);
  const banner = mediaUrl(community.bannerKey);

  return (
    <Link href={`/communities/${community.slug}`} className="card community-card">
      <div className="banner">
        <div className="banner-media">
          {banner ? <img src={banner} alt={`Banner ${community.name}`} loading="lazy" /> : null}
        </div>
        <div className="logo-wrap">
          {logo ? <img src={logo} alt={`Logo ${community.name}`} loading="lazy" /> : community.name.slice(0, 1)}
        </div>
      </div>
      <div className="info">
        <h3>{community.name}</h3>
        <p className="tagline">{community.tagline || community.description || "Komunitas di Komunifind."}</p>
        <div className="chips">
          {community.category ? <span className="chip chip-accent">{community.category}</span> : null}
          {community.city ? <span className="chip">{community.city}</span> : null}
        </div>
      </div>
    </Link>
  );
}
