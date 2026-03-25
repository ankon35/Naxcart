import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../store.db');

export const db = new Database(dbPath);

export function initDb() {
  // Products Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      original_price REAL,
      category TEXT NOT NULL,
      images_json TEXT, -- JSON array of image URLs
      sizes_json TEXT, -- JSON array of sizes
      stock INTEGER DEFAULT 0,
      cost_price REAL DEFAULT 0,
      is_featured INTEGER DEFAULT 0,
      try_now_enabled INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Add cost_price if it doesn't exist (for existing databases)
  try {
    db.exec('ALTER TABLE products ADD COLUMN cost_price REAL DEFAULT 0');
  } catch (e) {
    // Column already exists or table doesn't exist yet
  }

  // Orders Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT,
      customer_address TEXT NOT NULL,
      postal_code TEXT,
      delivery_charge REAL DEFAULT 0,
      payment_method TEXT NOT NULL,
      total_amount REAL NOT NULL,
      items_json TEXT NOT NULL, -- JSON array of order items
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Site Config Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_config (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // FAQs Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL
    )
  `);

  // Categories Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `);

  // Seed Categories if empty
  const categoryCount = db.prepare('SELECT count(*) as count FROM categories').get() as { count: number };
  if (categoryCount.count === 0) {
    const insertCategory = db.prepare('INSERT INTO categories (name) VALUES (?)');
    const defaultCategories = ['Fashion', 'Accessories', 'Gadgets', 'Footwear'];
    defaultCategories.forEach(c => insertCategory.run(c));
  }

  // Seed Site Config if empty
  const configCount = db.prepare('SELECT count(*) as count FROM site_config').get() as { count: number };
  if (configCount.count === 0) {
    const insertConfig = db.prepare('INSERT INTO site_config (key, value) VALUES (?, ?)');
    const defaultConfig = [
      { key: 'hero_title', value: 'FUTURE FASHION IS HERE' },
      { key: 'hero_subtitle', value: 'Discover the latest trends in cyberpunk aesthetics, neon streetwear, and futuristic gadgets.' },
      { key: 'hero_image', value: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2000&auto=format&fit=crop' },
      { key: 'footer_about', value: 'Naxcart is your premier destination for futuristic fashion and tech. We curate the best cyberpunk aesthetics from around the globe.' },
      { key: 'footer_email', value: 'support@naxcart.shop' },
      { key: 'footer_phone', value: '+1 (555) 123-4567' },
      { key: 'footer_address', value: '123 Neon Street, Cyber City, CC 90210' },
      { key: 'contact_whatsapp', value: 'https://wa.me/1234567890' },
      { key: 'contact_phone', value: 'tel:+1234567890' },
      { key: 'shipping_dhaka', value: '70' },
      { key: 'shipping_outside', value: '130' },
      { key: 'announcement_text', value: '🚀 FREE SHIPPING ON ORDERS OVER BDT 5000! SHOP NOW.' },
      { key: 'announcement_enabled', value: '1' }
    ];
    defaultConfig.forEach(c => insertConfig.run(c.key, c.value));
  }

  // Seed FAQs if empty
  const faqCount = db.prepare('SELECT count(*) as count FROM faqs').get() as { count: number };
  if (faqCount.count === 0) {
    const insertFaq = db.prepare('INSERT INTO faqs (question, answer) VALUES (?, ?)');
    const defaultFaqs = [
      { question: 'What is your return policy?', answer: 'We offer a 30-day return policy for all unworn items in original packaging.' },
      { question: 'Do you ship internationally?', answer: 'Yes, we ship to most countries worldwide. Shipping costs vary by location.' },
      { question: 'How long does shipping take?', answer: 'Standard shipping takes 5-7 business days. Express shipping takes 2-3 business days.' }
    ];
    defaultFaqs.forEach(f => insertFaq.run(f.question, f.answer));
  }

  // Seed data if empty
  const count = db.prepare('SELECT count(*) as count FROM products').get() as { count: number };
  if (count.count === 0) {
    console.log('Seeding database...');
    const insert = db.prepare(`
      INSERT INTO products (name, description, price, original_price, category, images_json, sizes_json, stock, is_featured, try_now_enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const seedProducts = [
      {
        name: 'Neon Puffer Jacket',
        description: 'Oversized, ultra-warm, and undeniably cool. This neon puffer is the statement piece your winter wardrobe needs.',
        price: 129.99,
        original_price: 159.99,
        category: 'Fashion',
        images: ['https://images.unsplash.com/photo-1545594861-3bef43ff22c7?q=80&w=1000&auto=format&fit=crop'],
        sizes: ['S', 'M', 'L', 'XL'],
        stock: 50,
        is_featured: 1,
        try_now_enabled: 1
      },
      {
        name: 'Cyberpunk Visor Shades',
        description: 'Futuristic shield sunglasses with a seamless lens design. Perfect for festivals and late-night drives.',
        price: 45.00,
        original_price: 60.00,
        category: 'Accessories',
        images: ['https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=1000&auto=format&fit=crop'],
        sizes: ['One Size'],
        stock: 100,
        is_featured: 1,
        try_now_enabled: 1
      },
      {
        name: 'Holographic Platform Boots',
        description: 'Stomp around in style. These platform boots feature a holographic finish that changes color with the light.',
        price: 89.99,
        original_price: null,
        category: 'Fashion',
        images: ['https://images.unsplash.com/photo-1605763240004-7e93b172d754?q=80&w=1000&auto=format&fit=crop'],
        sizes: ['36', '37', '38', '39', '40', '41'],
        stock: 25,
        is_featured: 1,
        try_now_enabled: 1
      },
      {
        name: 'Retro Gaming Console Mini',
        description: 'All your favorite 8-bit classics in the palm of your hand. Comes with 500 pre-loaded games.',
        price: 59.99,
        original_price: 79.99,
        category: 'Gadgets',
        images: ['https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1000&auto=format&fit=crop'],
        sizes: [],
        stock: 200,
        is_featured: 0,
        try_now_enabled: 0
      },
      {
        name: 'Pastel Mechanical Keyboard',
        description: 'Clicky, tactile, and aesthetically pleasing. RGB backlit with custom pastel keycaps.',
        price: 110.00,
        original_price: 140.00,
        category: 'Gadgets',
        images: ['https://images.unsplash.com/photo-1595225476474-87563907a212?q=80&w=1000&auto=format&fit=crop'],
        sizes: [],
        stock: 15,
        is_featured: 1,
        try_now_enabled: 0
      },
      {
        name: 'Glow-in-the-Dark Graphic Tee',
        description: '100% Cotton tee with a radioactive green graphic that glows when the lights go out.',
        price: 35.00,
        original_price: null,
        category: 'Fashion',
        images: ['https://images.unsplash.com/photo-1503341504253-dff4815485f1?q=80&w=1000&auto=format&fit=crop'],
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        stock: 80,
        is_featured: 0,
        try_now_enabled: 1
      }
    ];

    seedProducts.forEach(p => {
      insert.run(
        p.name, p.description, p.price, p.original_price, p.category, 
        JSON.stringify(p.images), JSON.stringify(p.sizes), p.stock, 
        p.is_featured, p.try_now_enabled
      );
    });
    console.log('Database seeded successfully.');
  }

  // Ensure Cyberpunk Visor Shades has virtual try-on enabled
  db.prepare("UPDATE products SET try_now_enabled = 1 WHERE name = 'Cyberpunk Visor Shades'").run();
}
