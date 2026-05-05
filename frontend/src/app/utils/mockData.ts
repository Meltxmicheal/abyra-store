import { Product, Category } from './types';

// Categories
export const categories: Category[] = [
  { id: "1", name: "Crochet Bouquets", image: "" },
  { id: "2", name: "Handmade Bags", image: "" },
  { id: "3", name: "Crochet Toys", image: "" },
  { id: "4", name: "Home Decor", image: "" },
  { id: "5", name: "Accessories", image: "" },
];

// Products
export const products: Product[] = [
  {
    id: "1",
    name: "Lavender Dream Crochet Bouquet",
    images: ["https://images.unsplash.com/photo-1689999015579-aaeaba5ebf69?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwdXJwbGUlMjBjcm9jaGV0JTIwZmxvd2VyJTIwYm91cXVldHxlbnwxfHx8fDE3Nzc1NjkxNjl8MA&ixlib=rb-4.1.0&q=80&w=1080"],
    description: "Handcrafted crochet flower bouquet featuring beautiful lavender roses. Each flower is meticulously crafted with premium yarn, making it a perfect gift that lasts forever. No wilting, no maintenance - just timeless beauty.",
    category: "Crochet Bouquets",
    basePrice: 899,
    variants: [
      {
        id: "1-1",
        name: "25 Flowers Bouquet",
        price: 899,
        attributes: { flowers: "25", size: "Medium (30cm)" }
      },
      {
        id: "1-2",
        name: "35 Flowers Bouquet",
        price: 1299,
        attributes: { flowers: "35", size: "Large (40cm)" }
      },
      {
        id: "1-3",
        name: "50 Flowers Bouquet",
        price: 1799,
        attributes: { flowers: "50", size: "Extra Large (50cm)" }
      }
    ],
    productionTime: 7,
    paymentMethods: ["UPI", "Card", "COD"],
    rating: 4.8,
    reviews: [
      {
        id: "r1",
        userId: "u1",
        userName: "Priya Sharma",
        rating: 5,
        comment: "Absolutely stunning! The craftsmanship is incredible. Gifted it to my mom and she loved it!",
        date: "2026-04-20",
        adminReply: "Thank you so much Priya! We're thrilled your mom loved it! 💜"
      }
    ]
  },
  {
    id: "2",
    name: "Sunshine Yellow Tulip Bouquet",
    images: ["https://images.unsplash.com/photo-1668233342581-ce94a57d9e01?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5ZWxsb3clMjB0dWxpcCUyMGZsb3dlcnMlMjBib3VxdWV0fGVufDF8fHx8MTc3NzU2OTE3MHww&ixlib=rb-4.1.0&q=80&w=1080"],
    description: "Brighten someone's day with this cheerful yellow tulip bouquet. Hand-crocheted with soft, high-quality yarn to create a vibrant display that never fades.",
    category: "Crochet Bouquets",
    basePrice: 799,
    variants: [
      {
        id: "2-1",
        name: "20 Tulips",
        price: 799,
        attributes: { flowers: "20", size: "Medium (28cm)" }
      },
      {
        id: "2-2",
        name: "30 Tulips",
        price: 1099,
        attributes: { flowers: "30", size: "Large (38cm)" }
      }
    ],
    productionTime: 5,
    paymentMethods: ["UPI", "Card", "COD"],
    rating: 4.9,
    reviews: []
  },
  {
    id: "3",
    name: "Rustic Tote Bag",
    images: ["https://images.unsplash.com/photo-1688469625789-d9aa18dbcd21?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYW5kbWFkZSUyMGNyb2NoZXQlMjB0b3RlJTIwYmFnfGVufDF8fHx8MTc3NzU2OTE3MHww&ixlib=rb-4.1.0&q=80&w=1080"],
    description: "Eco-friendly handmade crochet tote bag perfect for everyday use. Strong, durable, and stylish - carry your essentials in sustainable fashion.",
    category: "Handmade Bags",
    basePrice: 599,
    variants: [
      {
        id: "3-1",
        name: "Small Size",
        price: 599,
        attributes: { size: "Small (25x20cm)" }
      },
      {
        id: "3-2",
        name: "Medium Size",
        price: 799,
        attributes: { size: "Medium (35x30cm)" }
      },
      {
        id: "3-3",
        name: "Large Size",
        price: 999,
        attributes: { size: "Large (45x40cm)" }
      }
    ],
    productionTime: 10,
    paymentMethods: ["UPI", "Card"],
    rating: 4.7,
    reviews: []
  },
  {
    id: "4",
    name: "Cute Bunny Plushie",
    images: ["https://images.unsplash.com/photo-1753370474846-afc7a13defc4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcm9jaGV0JTIwYnVubnklMjBwbHVzaGllJTIwdG95fGVufDF8fHx8MTc3NzU2OTE3MXww&ixlib=rb-4.1.0&q=80&w=1080"],
    description: "Adorable handmade crochet bunny perfect for kids and collectors. Soft, safe, and made with love using premium hypoallergenic yarn.",
    category: "Crochet Toys",
    basePrice: 499,
    variants: [
      {
        id: "4-1",
        name: "Small (20cm)",
        price: 499,
        attributes: { size: "20cm", color: "White" }
      },
      {
        id: "4-2",
        name: "Medium (30cm)",
        price: 699,
        attributes: { size: "30cm", color: "White" }
      }
    ],
    productionTime: 12,
    paymentMethods: ["UPI", "Card", "COD"],
    rating: 5.0,
    reviews: []
  },
  {
    id: "5",
    name: "Boho Wall Hanging",
    images: ["https://images.unsplash.com/photo-1632393121391-3c40fcfafe1a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxib2hvJTIwbWFjcmFtZSUyMHdhbGwlMjBoYW5naW5nfGVufDF8fHx8MTc3NzU2OTE3MXww&ixlib=rb-4.1.0&q=80&w=1080"],
    description: "Transform your space with this beautiful macrame wall hanging. Features intricate patterns and natural cotton rope for a bohemian touch.",
    category: "Home Decor",
    basePrice: 1299,
    variants: [
      {
        id: "5-1",
        name: "Medium (60cm)",
        price: 1299,
        attributes: { width: "60cm", length: "80cm" }
      },
      {
        id: "5-2",
        name: "Large (90cm)",
        price: 1899,
        attributes: { width: "90cm", length: "120cm" }
      }
    ],
    productionTime: 14,
    paymentMethods: ["UPI", "Card"],
    rating: 4.6,
    reviews: []
  },
  {
    id: "6",
    name: "Rose Pink Crochet Bouquet",
    images: ["https://images.unsplash.com/photo-1712258090345-c1c46d3f5b6b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaW5rJTIwcm9zZSUyMGZsb3dlciUyMGJvdXF1ZXR8ZW58MXx8fHwxNzc3NTY5MTcyfDA&ixlib=rb-4.1.0&q=80&w=1080"],
    description: "Classic pink roses that symbolize love and appreciation. Each petal is carefully crafted to create realistic-looking blooms that last forever.",
    category: "Crochet Bouquets",
    basePrice: 999,
    variants: [
      {
        id: "6-1",
        name: "25 Roses",
        price: 999,
        attributes: { flowers: "25", size: "Medium (32cm)" }
      },
      {
        id: "6-2",
        name: "40 Roses",
        price: 1499,
        attributes: { flowers: "40", size: "Large (45cm)" }
      }
    ],
    productionTime: 8,
    paymentMethods: ["UPI", "Card", "COD"],
    rating: 4.9,
    reviews: []
  },
  {
    id: "7",
    name: "Crochet Headband Set",
    images: ["https://images.unsplash.com/photo-1542834743-9c2a0b778dc7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcm9jaGV0JTIwa25pdCUyMGhlYWRiYW5kJTIwYWNjZXNzb3JpZXN8ZW58MXx8fHwxNzc3NTY5MTcyfDA&ixlib=rb-4.1.0&q=80&w=1080"],
    description: "Stylish handmade crochet headbands. Set of 3 in complementary colors. Perfect for adding a handmade touch to any outfit.",
    category: "Accessories",
    basePrice: 399,
    variants: [
      {
        id: "7-1",
        name: "Set of 3",
        price: 399,
        attributes: { pieces: "3", colors: "Pastel Mix" }
      }
    ],
    productionTime: 5,
    paymentMethods: ["UPI", "Card", "COD"],
    rating: 4.5,
    reviews: []
  },
  {
    id: "8",
    name: "Midnight Blue Sunflower Bouquet",
    images: ["https://images.unsplash.com/photo-1628188516448-04f78a4669f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibHVlJTIwc3VuZmxvd2VyJTIwYm91cXVldHxlbnwxfHx8fDE3Nzc1NjkxNzJ8MA&ixlib=rb-4.1.0&q=80&w=1080"],
    description: "Unique midnight blue sunflowers that add a modern twist to a classic flower. Perfect for contemporary home decor.",
    category: "Crochet Bouquets",
    basePrice: 1099,
    variants: [
      {
        id: "8-1",
        name: "15 Sunflowers",
        price: 1099,
        attributes: { flowers: "15", size: "Medium (35cm)" }
      },
      {
        id: "8-2",
        name: "25 Sunflowers",
        price: 1599,
        attributes: { flowers: "25", size: "Large (48cm)" }
      }
    ],
    productionTime: 10,
    paymentMethods: ["UPI", "Card"],
    rating: 4.8,
    reviews: []
  }
];