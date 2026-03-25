import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import fs from 'fs';
import compression from 'compression';
import helmet from 'helmet';
import { db, initDb } from './src/db/database';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configure Multer for file uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set('trust proxy', 1);

  // Security & Performance Middlewares
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for Vite dev mode compatibility
    crossOriginEmbedderPolicy: false,
  }));
  app.use(compression());
  app.use(express.json());
  app.use(cookieParser());
  
  // Rate Limiting removed to prevent proxy issues
  // Apply rate limiter to API routes
  // app.use('/api/', limiter);

  // Serve uploaded files with caching
  app.use('/uploads', express.static(uploadDir, {
    maxAge: '1d',
    immutable: true
  }));

  // Initialize Database
  initDb();

  // API Routes
  
  // Products
  app.get('/api/products', (req, res) => {
    try {
      const { category, featured } = req.query;
      
      if (category) {
        const products = db.prepare('SELECT * FROM products WHERE category = ?').all(category);
        return res.json(products);
      }
      
      if (featured === 'true') {
         const products = db.prepare('SELECT * FROM products WHERE is_featured = 1').all();
         return res.json(products);
      }

      const products = db.prepare('SELECT * FROM products').all();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/products/:id', (req, res) => {
    try {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
      if (product) {
        res.json(product);
      } else {
        res.status(404).json({ error: 'Product not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Categories
  app.get('/api/categories', (req, res) => {
    try {
      const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
      res.json(categories.map((c: any) => c.name));
    } catch (e) {
      const categories = db.prepare('SELECT DISTINCT category FROM products').all();
      res.json(categories.map((c: any) => c.category));
    }
  });

  // Orders
  app.post('/api/orders', (req, res) => {
    const { customer, items, total, paymentMethod, deliveryCharge } = req.body;
    
    if (!customer || !items || !total) {
      return res.status(400).json({ error: 'Missing required order fields' });
    }

    try {
      const insertOrder = db.prepare(`
        INSERT INTO orders (customer_name, customer_email, customer_phone, customer_address, postal_code, delivery_charge, payment_method, total_amount, items_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = insertOrder.run(
        customer.name,
        customer.email,
        customer.phone,
        customer.address,
        customer.postalCode || '',
        deliveryCharge || 0,
        paymentMethod,
        total,
        JSON.stringify(items),
        new Date().toISOString()
      );
      
      res.json({ success: true, orderId: result.lastInsertRowid });
    } catch (error) {
      console.error('Order error:', error);
      res.status(500).json({ error: 'Failed to create order' });
    }
  });

  // Admin Routes (Simplified Auth for Demo)
  const ADMIN_SECRET = 'naxcart-secret-admin-key';
  const ADMIN_EMAIL = 'ankontheanalyst@gmail.com';
  const ADMIN_PASSWORD = 'Hossain1@';

  app.post('/api/admin/login', (req, res) => {
    const { email, password } = req.body;
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      res.cookie('admin_token', ADMIN_SECRET, { 
        httpOnly: true, 
        sameSite: 'none', 
        secure: true,
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  });

  app.get('/api/admin/check', (req, res) => {
    if (req.cookies.admin_token === ADMIN_SECRET) {
      res.json({ authenticated: true });
    } else {
      res.json({ authenticated: false });
    }
  });

  app.post('/api/admin/logout', (req, res) => {
    res.clearCookie('admin_token');
    res.json({ success: true });
  });

  // Middleware to protect admin routes
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.cookies.admin_token === ADMIN_SECRET) {
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  };

  // File Upload Endpoint
  app.post('/api/admin/upload', requireAdmin, upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  });

  // Category Management
  app.get('/api/admin/categories', requireAdmin, (req, res) => {
    try {
      const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
      res.json(categories);
    } catch (e) {
      res.json([]);
    }
  });

  app.post('/api/admin/categories', requireAdmin, (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    try {
      const result = db.prepare('INSERT INTO categories (name) VALUES (?)').run(name);
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (e) {
      res.status(500).json({ error: 'Failed to create category' });
    }
  });

  app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
    try {
      db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to delete category' });
    }
  });

  // Site Config Endpoints
  app.get('/api/config', (req, res) => {
    try {
      const config = db.prepare('SELECT * FROM site_config').all();
      const configObj: Record<string, string> = {};
      config.forEach((c: any) => {
        configObj[c.key] = c.value;
      });
      res.json(configObj);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch config' });
    }
  });

  app.post('/api/admin/config', requireAdmin, (req, res) => {
    const updates = req.body;
    const stmt = db.prepare('INSERT OR REPLACE INTO site_config (key, value) VALUES (?, ?)');
    
    const updateTransaction = db.transaction((updates) => {
      for (const [key, value] of Object.entries(updates)) {
        stmt.run(key, value);
      }
    });

    try {
      updateTransaction(updates);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update config' });
    }
  });

  // FAQ Endpoints
  app.get('/api/faqs', (req, res) => {
    try {
      const faqs = db.prepare('SELECT * FROM faqs').all();
      res.json(faqs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch FAQs' });
    }
  });

  app.post('/api/admin/faqs', requireAdmin, (req, res) => {
    const { question, answer } = req.body;
    if (!question || !answer) return res.status(400).json({ error: 'Question and answer are required' });
    try {
      const result = db.prepare('INSERT INTO faqs (question, answer) VALUES (?, ?)').run(question, answer);
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create FAQ' });
    }
  });

  app.put('/api/admin/faqs/:id', requireAdmin, (req, res) => {
    const { question, answer } = req.body;
    try {
      db.prepare('UPDATE faqs SET question = ?, answer = ? WHERE id = ?').run(question, answer, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update FAQ' });
    }
  });

  app.delete('/api/admin/faqs/:id', requireAdmin, (req, res) => {
    try {
      db.prepare('DELETE FROM faqs WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete FAQ' });
    }
  });

  app.get('/api/admin/orders', requireAdmin, (req, res) => {
    try {
      const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

  app.put('/api/admin/orders/:id/status', requireAdmin, (req, res) => {
    const { status } = req.body;
    try {
      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to update order status' });
    }
  });

  app.post('/api/admin/products', requireAdmin, (req, res) => {
    const { name, description, price, original_price, cost_price, category, images, sizes, stock, is_featured, try_now_enabled } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO products (name, description, price, original_price, cost_price, category, images_json, sizes_json, stock, is_featured, try_now_enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        name, description, price, original_price, cost_price || 0, category, 
        JSON.stringify(images), JSON.stringify(sizes), stock, 
        is_featured ? 1 : 0, try_now_enabled ? 1 : 0
      );
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
    const { name, description, price, original_price, cost_price, category, images, sizes, stock, is_featured, try_now_enabled } = req.body;
    try {
      const stmt = db.prepare(`
        UPDATE products SET 
        name = ?, description = ?, price = ?, original_price = ?, cost_price = ?, category = ?, 
        images_json = ?, sizes_json = ?, stock = ?, is_featured = ?, try_now_enabled = ?
        WHERE id = ?
      `);
      stmt.run(
        name, description, price, original_price, cost_price || 0, category, 
        JSON.stringify(images), JSON.stringify(sizes), stock, 
        is_featured ? 1 : 0, try_now_enabled ? 1 : 0,
        req.params.id
      );
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  
  app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
    try {
      db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true
    }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
