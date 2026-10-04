// Initial café details for `pnpm db:seed`. After seeding they live in CafeSettings
// and are edited in the dashboard; the site reads them from the database.
export const cafe = {
  name: "Healthy Hunger",
  promise: "100% veg. Protein from real food.",
  address: "Address to be confirmed",
  mapUrl: "https://maps.google.com/?q=Healthy+Hunger+Cafe",
  phone: "+91 98000 00000",
  whatsapp: "919800000000",
  instagram: "healthyhunger",
  hours: [
    { days: "Mon – Sat", time: "7:30 am – 10:30 pm" },
    { days: "Sunday", time: "8:00 am – 9:00 pm" },
  ],
};

export const NUTRITION_NOTE =
  "Protein and calorie values are approximate, not exact. They can vary with portion size, ingredients and seasonal fruits.";
