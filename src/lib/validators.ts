import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone must be at least 10 digits").max(15),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  role: z.enum(["COMMISSIONAIRE", "CLIENT"], { required_error: "Role is required" }),
  marketplace: z.enum(["House Rental", "Plot Selling VIP", "House Selling VVIP"], { required_error: "Marketplace is required" }),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const propertySchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  marketplace: z.enum(["House Rental", "Plot Selling VIP", "House Selling VVIP"]),
  propertyTypeId: z.string().min(1),
  price: z.number().int().positive().max(100_000_000),
  negotiable: z.boolean().default(true),
  availabilityStatus: z.enum(["AVAILABLE", "UPCOMING", "UNAVAILABLE"]).default("AVAILABLE"),
  availabilityDate: z.string().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  coordinatesRevealed: z.boolean().default(false),
  locationCountry: z.string().min(1),
  locationDistrict: z.string().min(1),
  locationSector: z.string().optional(),
  locationCell: z.string().optional(),
  locationVillage: z.string().optional(),
  contactPhone: z.string().min(10),
  contactName: z.string().min(1).max(100),
  keywords: z.array(z.string()).max(10).optional(),
  bedrooms: z.number().int().min(0).max(20).optional(),
  bathrooms: z.number().int().min(0).max(20).optional(),
  areaValue: z.number().positive().optional(),
  areaUnit: z.string().optional(),
  plotPurpose: z.string().optional(),
});

/// Statuses an owner is allowed to set on their own listing. DELETED is
/// intentionally excluded (use DELETE), as is any admin-only moderation state.
export const OWNER_SETTABLE_STATUSES = ["DRAFT", "ACTIVE", "UNAVAILABLE"] as const;

/// Body schema for PUT /api/properties/[id].
///
/// This is deliberately NOT `propertySchema.partial()`. That schema has no
/// `status` key, so Zod silently stripped it and the dashboard publish toggle
/// was a no-op — every listing stayed DRAFT forever and never appeared in
/// search, which only returns ACTIVE.
export const propertyUpdateSchema = propertySchema.partial().extend({
  status: z.enum(OWNER_SETTABLE_STATUSES).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(16, "Invalid or expired reset link"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const profileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().min(10).max(15).optional(),
  bio: z.string().max(500).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  district: z.string().max(100).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
});

export const savedSearchSchema = z.object({
  name: z.string().min(1).max(100),
  marketplace: z.string().optional(),
  query: z.record(z.string()).default({}),
  alertsOn: z.boolean().default(true),
});

export const searchSchema = z.object({
  q: z.string().optional(),
  marketplace: z.string().optional(),
  district: z.string().optional(),
  sector: z.string().optional(),
  cell: z.string().optional(),
  village: z.string().optional(),
  propertyType: z.string().optional(),
  minPrice: z.coerce.number().int().optional(),
  maxPrice: z.coerce.number().int().optional(),
  availability: z.string().optional(),
  negotiable: z.string().optional(),
  areaMin: z.coerce.number().optional(),
  areaMax: z.coerce.number().optional(),
  purpose: z.string().optional(),
  bedroomsMin: z.coerce.number().int().min(0).max(20).optional(),
  bathroomsMin: z.coerce.number().int().min(0).max(20).optional(),
  // Radius search: all three must be present for it to apply.
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().positive().max(500).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  sort: z
    .enum(["newest", "price_asc", "price_desc", "popular", "relevance", "distance"])
    .default("newest"),
});

export const reportSchema = z.object({
  propertyId: z.string().min(1),
  reason: z.enum(["FRAUD", "WRONG_LOCATION", "FAKE_PROPERTY", "WRONG_PRICE", "ALREADY_RENTED", "INAPPROPRIATE", "OTHER"]),
  description: z.string().min(10).max(1000).optional(),
});
