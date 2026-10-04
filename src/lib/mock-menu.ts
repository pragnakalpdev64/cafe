// Menu from the owner's list (27 Sep 2026). Phase 1 moves this into PostgreSQL.
// NOT FINAL: prices, protein, kcal, descriptions, ingredients and bestseller tags are
// placeholders until the owner confirms them in the menu manager.
import type { AddOn, Category, CategorySlug, MenuItem, MenuTag } from "./menu-types";

export const categories: Category[] = [
  { slug: "salads", name: "Salads & bowls" },
  { slug: "chaat", name: "Chaat" },
  { slug: "sandwiches", name: "Sandwiches" },
  { slug: "toast", name: "Toast" },
  { slug: "oats-bowls", name: "Oats bowls" },
  { slug: "drinks", name: "Drinks" },
];

export const addOns: AddOn[] = [
  { id: "ao-paneer", name: "Extra paneer (50 g)", price: 50, protein: 9, kcal: 130, available: true },
  { id: "ao-sprouts", name: "Extra sprouts", price: 30, protein: 4, kcal: 45, available: true },
  { id: "ao-chickpeas", name: "Extra chickpeas", price: 30, protein: 5, kcal: 90, available: true },
  { id: "ao-avocado", name: "Avocado (half)", price: 80, protein: 2, kcal: 120, available: true },
  { id: "ao-cheese", name: "Cheese slice", price: 25, protein: 4, kcal: 70, available: true },
  { id: "ao-honey", name: "Honey", price: 15, protein: 0, kcal: 45, available: true },
];

const SALAD_ADDONS = ["ao-paneer", "ao-sprouts", "ao-chickpeas", "ao-avocado"];
const CHAAT_ADDONS = ["ao-sprouts", "ao-paneer"];
const BREAD_ADDONS = ["ao-paneer", "ao-cheese", "ao-avocado"];

type Row = {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  price: number;
  protein: number;
  kcal: number;
  tags?: MenuTag[];
  available?: boolean;
  addOnIds?: string[];
};

const section = (category: CategorySlug, defaults: Partial<Row>, rows: Row[]): MenuItem[] =>
  rows.map((r) => ({
    category,
    isVeg: true,
    tags: [],
    available: true,
    addOnIds: [],
    ...defaults,
    ...r,
  }));

export const menuItems: MenuItem[] = [
  ...section("salads", { addOnIds: SALAD_ADDONS }, [
    {
      id: "s-hp-chatpata",
      name: "High Protein Chatpata Salad",
      description: "Paneer, chickpeas, sweet corn and crunchy veggies in a tangy chaat dressing.",
      ingredients: ["Paneer", "Chickpeas", "Sweet corn", "Cherry tomato", "Cucumber", "Lettuce", "Chaat masala", "Lemon"],
      price: 249,
      protein: 24,
      kcal: 380,
      tags: ["bestseller", "high-protein"],
    },
    {
      id: "s-mediterranean",
      name: "Mediterranean Bowl",
      description: "Hummus, chickpeas, cucumber, tomato, olives and greens with herb dressing.",
      ingredients: ["Hummus", "Chickpeas", "Cucumber", "Tomato", "Olives", "Lettuce", "Herbs"],
      price: 269,
      protein: 15,
      kcal: 410,
      tags: ["high-protein"],
    },
    {
      // owner's note read "...6ole..." – assumed Chole; confirm the name
      id: "s-chole",
      name: "Chole Bowl",
      description: "Spiced chole with onion, tomato, cucumber and coriander.",
      ingredients: ["Chickpeas", "Onion", "Tomato", "Cucumber", "Coriander", "Spices"],
      price: 199,
      protein: 14,
      kcal: 360,
    },
    {
      id: "s-rajma-tikki",
      name: "Rajma Tikki",
      description: "Pan-seared rajma tikkis on greens with mint yoghurt.",
      ingredients: ["Rajma", "Oats", "Onion", "Spices", "Greens", "Mint yoghurt"],
      price: 219,
      protein: 16,
      kcal: 390,
      tags: ["high-protein"],
    },
    {
      id: "s-hp-meal",
      name: "High Protein Meal",
      description: "Paneer, soya, sprouts and sautéed veggies – our biggest protein plate.",
      ingredients: ["Paneer", "Soya chunks", "Moong sprouts", "Sautéed veggies"],
      price: 299,
      protein: 32,
      kcal: 520,
      tags: ["bestseller", "high-protein"],
    },
    {
      id: "s-scrambled-paneer",
      name: "Scrambled Paneer",
      description: "Soft paneer bhurji with onion, tomato and capsicum.",
      ingredients: ["Paneer", "Onion", "Tomato", "Capsicum", "Spices"],
      price: 229,
      protein: 22,
      kcal: 400,
      tags: ["high-protein"],
    },
    {
      id: "s-soya-masala",
      name: "Soya Masala Delight",
      description: "Soya chunks tossed in a light masala with peppers and onion.",
      ingredients: ["Soya chunks", "Bell pepper", "Onion", "Tomato", "Spices"],
      price: 209,
      protein: 26,
      kcal: 350,
      tags: ["high-protein"],
    },
    {
      id: "s-mexican-mania",
      name: "Mexican Mania",
      description: "Rajma, corn, peppers and salsa with a squeeze of lime.",
      ingredients: ["Rajma", "Sweet corn", "Bell pepper", "Salsa", "Lettuce", "Lime"],
      price: 249,
      protein: 15,
      kcal: 380,
    },
    {
      id: "s-sauteed-veggies",
      name: "Sautéed Veggies",
      description: "Seasonal vegetables sautéed with garlic and herbs.",
      ingredients: ["Broccoli", "Zucchini", "Bell pepper", "Carrot", "Garlic", "Herbs"],
      price: 199,
      protein: 7,
      kcal: 220,
    },
    {
      id: "s-sauteed-mushroom",
      name: "Sautéed Mushroom",
      description: "Mushrooms sautéed with garlic, pepper and herbs.",
      ingredients: ["Mushroom", "Garlic", "Onion", "Black pepper", "Herbs"],
      price: 219,
      protein: 8,
      kcal: 210,
    },
  ]),

  ...section("chaat", { addOnIds: CHAAT_ADDONS }, [
    {
      id: "c-sprouts",
      name: "Sprouts Chaat",
      description: "Moong sprouts with onion, tomato, lemon and chaat masala.",
      ingredients: ["Moong sprouts", "Onion", "Tomato", "Lemon", "Chaat masala"],
      price: 129,
      protein: 12,
      kcal: 210,
      tags: ["bestseller"],
    },
    {
      id: "c-sweet-corn",
      name: "Sweet Corn Chaat",
      description: "Buttery sweet corn with lemon, chilli and masala.",
      ingredients: ["Sweet corn", "Lemon", "Chilli", "Chaat masala"],
      price: 119,
      protein: 5,
      kcal: 190,
    },
    {
      id: "c-peanut",
      name: "Peanut Chaat",
      description: "Roasted peanuts with onion, tomato, coriander and lemon.",
      ingredients: ["Peanuts", "Onion", "Tomato", "Coriander", "Lemon"],
      price: 119,
      protein: 13,
      kcal: 320,
    },
    {
      id: "c-makhana",
      name: "Makhana Chaat",
      description: "Roasted makhana tossed with spices, onion and chutney.",
      ingredients: ["Makhana", "Onion", "Tomato", "Chutney", "Spices"],
      price: 139,
      protein: 6,
      kcal: 200,
    },
    {
      id: "c-chana",
      name: "Chana Chaat",
      description: "Kabuli chana with onion, tomato, cucumber and tangy masala.",
      ingredients: ["Chickpeas", "Onion", "Tomato", "Cucumber", "Lemon", "Chaat masala"],
      price: 129,
      protein: 14,
      kcal: 260,
    },
    {
      id: "c-dahi",
      name: "Dahi Chaat",
      description: "Thick dahi over chana and veggies with sweet and green chutney.",
      ingredients: ["Dahi", "Chickpeas", "Onion", "Chutneys", "Spices"],
      price: 139,
      protein: 11,
      kcal: 280,
    },
  ]),

  ...section("sandwiches", { addOnIds: BREAD_ADDONS }, [
    {
      id: "w-veg",
      name: "Veg Sandwich",
      description: "Classic multigrain sandwich with cucumber, tomato, onion and chutney.",
      ingredients: ["Multigrain bread", "Cucumber", "Tomato", "Onion", "Green chutney"],
      price: 129,
      protein: 7,
      kcal: 280,
    },
    {
      id: "w-veg-exotic",
      name: "Veg Exotic Sandwich",
      description: "Grilled zucchini, bell peppers, corn and olives with herb spread.",
      ingredients: ["Multigrain bread", "Zucchini", "Bell pepper", "Sweet corn", "Olives", "Herb spread"],
      price: 179,
      protein: 9,
      kcal: 330,
    },
    {
      id: "w-paneer-veggies",
      name: "Paneer with Veggies Sandwich",
      description: "Grilled paneer with crunchy veggies and mint chutney.",
      ingredients: ["Multigrain bread", "Paneer", "Capsicum", "Onion", "Mint chutney"],
      price: 199,
      protein: 20,
      kcal: 410,
      tags: ["bestseller", "high-protein"],
    },
    {
      // owner's list read "Chipotle Avocado Cucumber" – treated as two sandwiches; confirm
      id: "w-chipotle",
      name: "Chipotle Sandwich",
      description: "Smoky chipotle spread with grilled veggies and corn.",
      ingredients: ["Multigrain bread", "Chipotle spread", "Bell pepper", "Onion", "Sweet corn"],
      price: 189,
      protein: 10,
      kcal: 360,
    },
    {
      id: "w-avocado-cucumber",
      name: "Avocado Cucumber Sandwich",
      description: "Smashed avocado, cucumber ribbons and a pinch of chilli flakes.",
      ingredients: ["Multigrain bread", "Avocado", "Cucumber", "Lemon", "Chilli flakes"],
      price: 219,
      protein: 8,
      kcal: 340,
    },
  ]),

  ...section("toast", { addOnIds: BREAD_ADDONS }, [
    {
      id: "t-avocado",
      name: "Avocado Toast",
      description: "Sourdough with smashed avocado, cherry tomatoes and seeds.",
      ingredients: ["Sourdough", "Avocado", "Cherry tomato", "Seeds", "Lemon"],
      price: 229,
      protein: 9,
      kcal: 350,
      tags: ["bestseller"],
    },
    {
      id: "t-cheese-paneer",
      name: "Cheese Paneer Toast",
      description: "Toasted bread with paneer, cheese and herbs, grilled till golden.",
      ingredients: ["Bread", "Paneer", "Cheese", "Herbs"],
      price: 199,
      protein: 18,
      kcal: 420,
      tags: ["high-protein"],
    },
  ]),

  // Owner's list names the "Oats bowl" category but no items yet – placeholders below.
  ...section("oats-bowls", { addOnIds: ["ao-honey"] }, [
    {
      id: "o-classic",
      name: "Classic Oats Bowl",
      description: "Rolled oats with milk, banana, nuts and seeds.",
      ingredients: ["Rolled oats", "Milk", "Banana", "Almonds", "Seeds"],
      price: 179,
      protein: 14,
      kcal: 380,
    },
  ]),

  ...section("drinks", {}, [
    {
      id: "d-blue-tea",
      name: "Blue Tea",
      description: "Butterfly pea flower tea – caffeine-free.",
      ingredients: ["Butterfly pea flower"],
      price: 89,
      protein: 0,
      kcal: 5,
      addOnIds: ["ao-honey"],
    },
    {
      id: "d-green-tea",
      name: "Green Tea",
      description: "Light, clean green tea.",
      ingredients: ["Green tea"],
      price: 79,
      protein: 0,
      kcal: 5,
      addOnIds: ["ao-honey"],
    },
    {
      id: "d-lemon-iced-tea",
      name: "Lemon Iced Tea",
      description: "Chilled tea with fresh lemon.",
      ingredients: ["Tea", "Lemon", "Ice"],
      price: 99,
      protein: 0,
      kcal: 60,
    },
    {
      id: "d-coffee-honey",
      name: "Black Coffee with Honey",
      description: "Black coffee sweetened with a little honey.",
      ingredients: ["Coffee", "Honey"],
      price: 99,
      protein: 0,
      kcal: 45,
    },
    {
      id: "d-coffee-lemon",
      name: "Black Coffee with Lemon",
      description: "Black coffee with a twist of lemon.",
      ingredients: ["Coffee", "Lemon"],
      price: 99,
      protein: 0,
      kcal: 5,
    },
  ]),
];

export const todaysPickId = "s-hp-chatpata";
