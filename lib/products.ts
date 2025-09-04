import products from "@/data/products.json";

export type Product = {
  id: number; slug: string; title: string; description: string;
  price: number; category: "gifts" | "toys" | "services"; image: string;
};

export function getAllProducts(): Product[] { return products as Product[]; }
export function getProductsByCategory(cat: Product["category"]): Product[] {
  return (products as Product[]).filter(p => p.category === cat);
}
export function getProductBySlug(slug: string): Product | undefined {
  return (products as Product[]).find(p => p.slug === slug);
}
