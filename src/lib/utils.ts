import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency: "RWF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-RW", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateUniqueSlug(title: string, id: string): string {
  const base = slugify(title);
  const shortId = id.slice(-6);
  return `${base}-${shortId}`;
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trimEnd() + "...";
}

export function getInitials(firstName?: string, lastName?: string): string {
  return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
}

export function availabilityLabel(status: string, date?: string | Date | null): string {
  if (status === "AVAILABLE") return "Available now";
  if (status === "UNAVAILABLE") return "Unavailable";
  if (status === "UPCOMING" && date) {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Available soon";
    if (diffDays === 1) return "Available tomorrow";
    if (diffDays <= 30) return `Available in ${diffDays} days`;
    return `Available ${d.toLocaleDateString("en-RW", { month: "short", day: "numeric" })}`;
  }
  return "Available soon";
}
