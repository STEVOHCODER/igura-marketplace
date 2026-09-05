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
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  sort: z.enum(["newest", "price_asc", "price_desc", "popular"]).default("newest"),
});

export const reportSchema = z.object({
  propertyId: z.string().min(1),
  reason: z.enum(["FRAUD", "WRONG_LOCATION", "FAKE_PROPERTY", "WRONG_PRICE", "ALREADY_RENTED", "INAPPROPRIATE", "OTHER"]),
  description: z.string().min(10).max(1000).optional(),
});
