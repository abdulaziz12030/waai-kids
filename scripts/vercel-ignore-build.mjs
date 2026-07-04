const productionUrl = (process.env.VERCEL_PROJECT_PRODUCTION_URL || "").toLowerCase();
const isLegacyNamaaProject =
  productionUrl === "namaa.vercel.app" ||
  productionUrl.startsWith("namaa-") ||
  productionUrl.includes("/namaa");

if (isLegacyNamaaProject) {
  console.log(`Skipping legacy Vercel project build: ${productionUrl || "namaa"}`);
  process.exit(0);
}

console.log(`Continuing active waai-kids build: ${productionUrl || "unknown project"}`);
process.exit(1);
