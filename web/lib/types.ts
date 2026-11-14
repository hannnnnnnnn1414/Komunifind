export type Role = "user" | "organizer" | "admin";

export type User = {
  id: number;
  email: string;
  name: string;
  avatarUrl: string;
  role: Role;
  createdAt: string;
};

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  avatarUrl: string;
  role: Role;
  communityId: number | null;
};

export type Community = {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  logoKey: string | null;
  bannerKey: string | null;
  category: string;
  city: string;
  socials: Record<string, string>;
  organizerId: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type Event = {
  id: number;
  communityId: number;
  communitySlug?: string;
  communityName?: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  locationName: string;
  locationUrl: string | null;
  capacity: number | null;
  posterKey: string | null;
  externalUrl: string | null;
  externalLabel: string;
  status: string;
  price: number;
  currency: string;
  createdAt: string;
  approvedCount: number;
};

export type RegistrationStatus = "pending" | "approved" | "rejected" | "cancelled";

export type Registration = {
  id: number;
  eventId: number;
  userId: number;
  status: RegistrationStatus;
  decidedAt: string | null;
  createdAt: string;
  eventTitle: string;
  startsAt: string;
  communitySlug: string;
  communityName: string;
  userName: string;
  userEmail: string;
};

export type ListResult<T> = {
  items: T[];
  total: number;
  page: number;
  perPage: number;
};
