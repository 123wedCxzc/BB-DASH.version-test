import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("database.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    points REAL DEFAULT 0,
    role TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS game_ids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_pass TEXT UNIQUE,
    username TEXT,
    latest_farm TEXT,
    try_id TEXT,
    money INTEGER,
    fragment INTEGER,
    fruit_inv TEXT,
    nature_id TEXT
  );

  CREATE TABLE IF NOT EXISTS kaitun_ids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_pass TEXT UNIQUE,
    data TEXT
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    image_url TEXT,
    price REAL,
    stock INTEGER,
    status TEXT DEFAULT 'online',
    category TEXT DEFAULT 'upgrade'
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    product_name TEXT,
    addons TEXT,
    total_price REAL,
    status TEXT DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Add category column if not exists
try {
  db.prepare("ALTER TABLE products ADD COLUMN category TEXT DEFAULT 'upgrade'").run();
} catch (e) {}

// Seed Settings if not exists
const fbExists = db.prepare("SELECT * FROM settings WHERE key = ?").get("facebook_url");
if (!fbExists) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("facebook_url", "https://facebook.com/yourpage");
}

const logoExists = db.prepare("SELECT * FROM settings WHERE key = ?").get("app_logo");
if (!logoExists) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("app_logo", "https://cdn.discordapp.com/attachments/1464815681420660788/1478675436215992391/1.png");
}

const botLogoExists = db.prepare("SELECT * FROM settings WHERE key = ?").get("bot_logo");
if (!botLogoExists) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("bot_logo", "https://cdn.discordapp.com/attachments/1464815681420660788/1478675436215992391/1.png");
}

// Seed Admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE username = ?").get("gun");
if (!adminExists) {
  db.prepare("INSERT INTO users (username, password, points, role) VALUES (?, ?, ?, ?)").run("gun", "123", 999999, "admin");
}

// Seed Normal User if not exists
const normalUserExists = db.prepare("SELECT * FROM users WHERE username = ?").get("123");
if (!normalUserExists) {
  db.prepare("INSERT INTO users (username, password, points, role) VALUES (?, ?, ?, ?)").run("123", "123", 0, "user");
}

// Seed New Products
const newProducts = [
  { name: "7 หมัด + ซุปเปอร์เซ็ท + V4 T10 (6เผ่า)", price: 200, image: "https://cdn.discordapp.com/attachments/1464815681420660788/1478675436215992391/1.png?ex=69a94350&is=69a7f1d0&hm=fa4d7ec59f1f2f9f856d4d2f797800df9da51054d4df52d7f59656d8a8204cbd&", category: 'upgrade' },
  { name: "7 หมัด + ซุปเปอร์เซ็ท + V4 T10 (ไซบอร์ก)", price: 55, image: "https://cdn.discordapp.com/attachments/1464815681420660788/1478675436593483921/2.png?ex=69a94350&is=69a7f1d0&hm=18708d99f9d87a6fc9196521503a19ae38787fa720b4050d267e85bf91d5ee91&", category: 'upgrade' },
  { name: "7 หมัด + ซุปเปอร์เซ็ท + V4 T10 (กูล)", price: 55, image: "https://cdn.discordapp.com/attachments/1464815681420660788/1478675976689946675/3.png?ex=69a943d1&is=69a7f251&hm=cb18d5f8839f928b941250432ab54dc2d100090175808783279ced01e8d75594&", category: 'upgrade' },
  { name: "7 หมัด + ซุปเปอร์เซ็ท + V4 T10 (มนุษย์)", price: 55, image: "https://cdn.discordapp.com/attachments/1464815681420660788/1478675977436663952/4.png?ex=69a943d1&is=69a7f251&hm=26149fc51c262e8850a76a3752bc001b3ebe28d5ade3b521ca479266f95acf9b&", category: 'upgrade' },
  { name: "7 หมัด + ซุปเปอร์เซ็ท + V4 T10 (กระต่าย)", price: 55, image: "https://cdn.discordapp.com/attachments/1464815681420660788/1478676111755051040/5.png?ex=69a943f1&is=69a7f271&hm=e187d688a017e38bf7547ae35f25aecca9fb85a11b88036431443469fd3d3e9e&", category: 'upgrade' },
  { name: "7 หมัด + ซุปเปอร์เซ็ท + V4 T10 (นางฟ้า)", price: 55, image: "https://cdn.discordapp.com/attachments/1464815681420660788/1478676112551706684/6.png?ex=69a943f1&is=69a7f271&hm=fcc67b6b99115f4435dc2c265dc93d6d70a1e785a30b0caf297c6212e25de6fa&", category: 'upgrade' },
  { name: "7 หมัด + ซุปเปอร์เซ็ท + V4 T10 (เงือก)", price: 55, image: "https://cdn.discordapp.com/attachments/1464815681420660788/1478676244454178949/7.png?ex=69a94411&is=69a7f291&hm=e803cad67c4df18e3a803d74d1dcda46cb6e77372165371d259f234b3fff78e0&", category: 'upgrade' },
  { name: "6 หมัด + ซุปเปอร์เซ็ท + V4 T10 (กูล)", price: 40, image: "https://cdn.discordapp.com/attachments/1464815681420660788/1478676332807327786/6_.png?ex=69a94426&is=69a7f2a6&hm=74049b3eba1c709ad6ad528b0cd5779e935f56a9a6f9c0cbb90bba5c9d12355b&", category: 'upgrade' },
  { name: "Get E-mail", price: 1.5, image: "https://cdn-icons-png.flaticon.com/512/281/281769.png", category: 'addon' },
  { name: "Change Password", price: 1.5, image: "https://cdn-icons-png.flaticon.com/512/6195/6195700.png", category: 'addon' },
  { name: "Delete E-mail", price: 1.5, image: "https://cdn-icons-png.flaticon.com/512/1214/1214428.png", category: 'addon' },
  { name: "Recover Key", price: 1.5, image: "https://cdn-icons-png.flaticon.com/512/1000/1000966.png", category: 'addon' },
];

newProducts.forEach(p => {
  const exists = db.prepare("SELECT 1 FROM products WHERE name = ?").get(p.name);
  if (!exists) {
    db.prepare("INSERT INTO products (name, price, image_url, stock, status, category) VALUES (?, ?, ?, ?, ?, ?)").run(p.name, p.price, p.image, 0, 'online', p.category);
  }
});

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer);

  const sendDiscordWebhook = async (type: string, title: string, description: string, color: number = 0x0ea5e9, imageUrl?: string, extraMessages?: string[]) => {
    try {
      const webhookKey = `webhook_${type}`;
      const setting = db.prepare("SELECT value FROM settings WHERE key = ?").get(webhookKey);
      if (setting && setting.value) {
        const embed: any = {
          title,
          description,
          color,
          timestamp: new Date().toISOString(),
          footer: { text: "BB SHOP Notification System" }
        };
        if (imageUrl) {
          embed.image = { url: imageUrl };
        }
        
        // Send main embed
        await fetch(setting.value, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            embeds: [embed]
          })
        });

        // Send extra messages if any
        if (extraMessages && extraMessages.length > 0) {
          for (const msg of extraMessages) {
            await fetch(setting.value, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content: msg })
            });
          }
        }
      }
    } catch (e) {
      console.error("Discord Webhook Error:", e);
    }
  };

  app.use(express.json());

  // Socket.io Logic
  io.on("connection", (socket) => {
    socket.on("join", (username) => {
      socket.join(username);
      console.log(`User ${username} joined their private room`);
    });

    socket.on("join-admin", () => {
      socket.join("admin-room");
      console.log("Admin joined the admin room");
    });
  });

  // Settings Routes
  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const map = {};
    settings.forEach(s => map[s.key] = s.value);
    res.json(map);
  });

  app.post("/api/admin/settings", (req, res) => {
    const { key, value } = req.body;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
    res.json({ success: true });
  });

  // Product Routes
  app.get("/api/products", (req, res) => {
    const products = db.prepare("SELECT * FROM products WHERE status = 'online'").all();
    res.json(products);
  });

  app.get("/api/admin/products", (req, res) => {
    const products = db.prepare("SELECT * FROM products").all();
    res.json(products);
  });

  app.post("/api/admin/products", (req, res) => {
    const { id, name, image_url, price, stock, status } = req.body;
    if (id) {
      db.prepare("UPDATE products SET name = ?, image_url = ?, price = ?, stock = ?, status = ? WHERE id = ?")
        .run(name, image_url, price, stock, status, id);
    } else {
      db.prepare("INSERT INTO products (name, image_url, price, stock, status) VALUES (?, ?, ?, ?, ?)")
        .run(name, image_url, price, stock, status);
    }
    res.json({ success: true });
  });

  app.delete("/api/admin/products/:id", (req, res) => {
    db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Auth Routes
  app.post("/api/auth/register", (req, res) => {
    const { username, password } = req.body;
    try {
      db.prepare("INSERT INTO users (username, password, points, role) VALUES (?, ?, ?, ?)").run(username, password, 0, "user");
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Username already exists" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password);
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.get("/api/user/:username", (req, res) => {
    const user = db.prepare("SELECT id, username, points, role FROM users WHERE username = ?").get(req.params.username);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  app.post("/api/user/deduct", (req, res) => {
    const { username, amount, serviceName, details } = req.body;
    const user = db.prepare("SELECT points FROM users WHERE username = ?").get(username);
    if (!user || user.points < amount) {
      return res.status(400).json({ error: "Insufficient points" });
    }
    db.prepare("UPDATE users SET points = points - ? WHERE username = ?").run(amount, username);
    
    if (serviceName) {
      db.prepare("INSERT INTO orders (username, product_name, addons, total_price, status) VALUES (?, ?, ?, ?, ?)")
        .run(username, serviceName, details ? JSON.stringify(details) : null, amount, 'Completed');
      
      // Notify admin of new completed service
      io.to("admin-room").emit("new-order", { username, product_name: serviceName, total_price: amount, status: 'Completed' });

      // Discord Webhook
      sendDiscordWebhook("id_service", "🔔 รายการ ID Service สำเร็จ", 
        `**ผู้ใช้งาน:** ${username}\n**บริการ:** ${serviceName}\n**ราคา:** ${amount} Points\n**สถานะ:** สำเร็จ (Completed)`, 0x10b981);
    }

    // Notify user of point change
    const updatedUser = db.prepare("SELECT points FROM users WHERE username = ?").get(username);
    io.to(username).emit("points-updated", updatedUser.points);

    res.json({ success: true });
  });

  app.post("/api/user/add-points", (req, res) => {
    const { username, amount } = req.body;
    db.prepare("UPDATE users SET points = points + ? WHERE username = ?").run(amount, username);
    
    // Notify user of point change
    const updatedUser = db.prepare("SELECT points FROM users WHERE username = ?").get(username);
    io.to(username).emit("points-updated", updatedUser.points);
    
    res.json({ success: true });
  });

  app.post("/api/user/update-username", (req, res) => {
    const { oldUsername, newUsername } = req.body;
    try {
      db.prepare("UPDATE users SET username = ? WHERE username = ?").run(newUsername, oldUsername);
      // Also update orders
      db.prepare("UPDATE orders SET username = ? WHERE username = ?").run(newUsername, oldUsername);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Username already exists" });
    }
  });

  // Order Routes
  app.get("/api/orders/:username", (req, res) => {
    const orders = db.prepare("SELECT * FROM orders WHERE username = ? ORDER BY created_at DESC").all();
    res.json(orders);
  });

  app.post("/api/orders", (req, res) => {
    const { username, productName, addons, totalPrice } = req.body;
    const user = db.prepare("SELECT points FROM users WHERE username = ?").get(username);
    if (!user || user.points < totalPrice) {
      return res.status(400).json({ error: "Insufficient points" });
    }
    db.prepare("UPDATE users SET points = points - ? WHERE username = ?").run(totalPrice, username);
    const result = db.prepare("INSERT INTO orders (username, product_name, addons, total_price) VALUES (?, ?, ?, ?)")
      .run(username, productName, JSON.stringify(addons), totalPrice);
    
    const newOrder = {
      id: result.lastInsertRowid,
      username,
      product_name: productName,
      addons: JSON.stringify(addons),
      total_price: totalPrice,
      status: 'Pending',
      created_at: new Date().toISOString()
    };

    // Notify admin
    io.to("admin-room").emit("new-order", newOrder);

    // Discord Webhook
    const type = productName ? "upgrade" : "addon";
    sendDiscordWebhook(type, `🛒 ออเดอร์ใหม่ (${type === 'upgrade' ? 'Upgrade' : 'Add-on'})`, 
      `**ผู้ใช้งาน:** ${username}\n**สินค้า:** ${productName || "Add-ons only"}\n**รายการเพิ่มเติม:** ${addons.map((a: any) => a.name).join(", ") || "-"}\n**ราคา:** ${totalPrice} Points\n**สถานะ:** รอดำเนินการ (Pending)`, 0xf59e0b);
    
    // Notify user of point change
    const updatedUser = db.prepare("SELECT points FROM users WHERE username = ?").get(username);
    io.to(username).emit("points-updated", updatedUser.points);

    res.json({ success: true, newPoints: updatedUser.points });
  });

  app.get("/api/admin/orders", (req, res) => {
    const orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
    res.json(orders);
  });

  app.post("/api/admin/orders/:id/status", (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);
    
    // Notify user of status update
    const order = db.prepare("SELECT username, product_name FROM orders WHERE id = ?").get(req.params.id);
    if (order) {
      io.to(order.username).emit("order-status-updated", { orderId: req.params.id, status });
      
      // Discord Webhook for status update
      const color = status === 'Completed' ? 0x10b981 : (status === 'Cancelled' ? 0xef4444 : 0x3b82f6);
      sendDiscordWebhook("orders", "📦 อัปเดตสถานะออเดอร์", 
        `**ออเดอร์ ID:** #${req.params.id}\n**ผู้ใช้งาน:** ${order.username}\n**สินค้า:** ${order.product_name}\n**สถานะใหม่:** ${status}`, color);
    }

    res.json({ success: true });
  });

  // Search Routes
  app.post("/api/search/check", (req, res) => {
    const { ids } = req.body; // Array of user:pass
    const found = [];
    const notFound = [];

    for (const id of ids) {
      const record = db.prepare("SELECT * FROM game_ids WHERE user_pass = ?").get(id);
      if (record) {
        found.push(id);
      } else {
        notFound.push(id);
      }
    }
    res.json({ found, notFound });
  });

  app.post("/api/search/details", (req, res) => {
    const { ids } = req.body;
    const details = [];
    for (const id of ids) {
      const record = db.prepare("SELECT * FROM game_ids WHERE user_pass = ?").get(id);
      if (record) details.push(record);
    }

    // Discord Webhook
    if (details.length > 0) {
      sendDiscordWebhook("check_id", "🔍 มีการเช็ครายละเอียดไอดี", 
        `**จำนวนไอดีที่พบ:** ${details.length} ไอดี\n**ไอดี:**\n${details.map(d => `- ${d.user_pass}`).join("\n")}`, 0x3b82f6);
    }

    res.json(details);
  });

  // Kaitun Routes
  app.post("/api/kaitun/check", (req, res) => {
    const { ids } = req.body;
    const found = [];
    const notFound = [];
    for (const id of ids) {
      const record = db.prepare("SELECT * FROM kaitun_ids WHERE user_pass = ?").get(id);
      if (record) {
        found.push(id);
      } else {
        notFound.push(id);
      }
    }
    res.json({ found, notFound });
  });

  app.post("/api/kaitun/confirm", (req, res) => {
    const { username, ids } = req.body;
    let totalCost = 0;
    const results = [];
    
    for (const id of ids) {
      const kaitunRecord = db.prepare("SELECT data FROM kaitun_ids WHERE user_pass = ?").get(id);
      totalCost += kaitunRecord ? 0.30 : 1.50;
      
      // Get username from user_pass (assuming format user:pass)
      const idUser = id.split(":")[0];
      results.push({
        user_pass: id,
        username: idUser,
        image_url: kaitunRecord ? kaitunRecord.data : null
      });
    }

    const user = db.prepare("SELECT points FROM users WHERE username = ?").get(username);
    if (!user || user.points < totalCost) {
      return res.status(400).json({ error: "Insufficient points" });
    }

    db.prepare("UPDATE users SET points = points - ? WHERE username = ?").run(totalCost, username);
    
    // Record as order - Include results with images in addons
    db.prepare("INSERT INTO orders (username, product_name, addons, total_price, status) VALUES (?, ?, ?, ?, ?)")
      .run(username, `เช็คไอดีไก่ตัน (${ids.length} ไอดี)`, JSON.stringify(results), totalCost, 'Completed');

    // Notify user of point change
    const updatedUser = db.prepare("SELECT points FROM users WHERE username = ?").get(username);
    io.to(username).emit("points-updated", updatedUser.points);
    
    // Notify admin
    io.to("admin-room").emit("new-order", { username, product_name: `เช็คไอดีไก่ตัน (${ids.length} ไอดี)`, total_price: totalCost, status: 'Completed' });

    // Discord Webhook
    const spongebobGif = "https://media.giphy.com/media/nDSlfqf0gn5g4/giphy.gif";
    const description = `** DETAILS **
\`\`\`
username  :  ${username}
quantity  :  ${ids.length}
price  :  ${totalCost}
remaining point  :  ${updatedUser.points}
stats  :  🟢
\`\`\`

** USERNAME ID **
\`\`\`
${ids.map(id => `- ${id}`).join("\n")}
\`\`\``;

    const extraMessages = results.map(r => `ID: ${r.username}\nImage: ${r.image_url || "No Image"}`);

    sendDiscordWebhook("kaitun", "🐔 รายการเช็คไอดีไก่ตัน", description, 0x10b981, spongebobGif, extraMessages);

    res.json({ success: true, newPoints: updatedUser.points, results });
  });

  // Admin Routes
  app.get("/api/admin/users", (req, res) => {
    const users = db.prepare("SELECT id, username, points, role FROM users").all();
    res.json(users);
  });

  app.post("/api/admin/users/:id/points", (req, res) => {
    const { points } = req.body;
    db.prepare("UPDATE users SET points = ? WHERE id = ?").run(points, req.params.id);
    
    // Notify user
    const user = db.prepare("SELECT username FROM users WHERE id = ?").get(req.params.id);
    if (user) {
      io.to(user.username).emit("points-updated", points);
    }

    res.json({ success: true });
  });

  app.get("/api/admin/game-ids", (req, res) => {
    const records = db.prepare("SELECT * FROM game_ids").all();
    res.json(records);
  });

  app.post("/api/admin/game-ids", (req, res) => {
    const { user_pass, username, latest_farm, try_id, money, fragment, fruit_inv, nature_id } = req.body;
    try {
      db.prepare(`
        INSERT INTO game_ids (user_pass, username, latest_farm, try_id, money, fragment, fruit_inv, nature_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_pass) DO UPDATE SET
          username=excluded.username,
          latest_farm=excluded.latest_farm,
          try_id=excluded.try_id,
          money=excluded.money,
          fragment=excluded.fragment,
          fruit_inv=excluded.fruit_inv,
          nature_id=excluded.nature_id
      `).run(user_pass, username, latest_farm, try_id, money, fragment, fruit_inv, nature_id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to save record" });
    }
  });

  app.delete("/api/admin/game-ids/:id", (req, res) => {
    db.prepare("DELETE FROM game_ids WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/admin/kaitun-ids", (req, res) => {
    const records = db.prepare("SELECT * FROM kaitun_ids").all();
    res.json(records);
  });

  app.post("/api/admin/kaitun-ids", (req, res) => {
    const { user_pass, data } = req.body;
    db.prepare(`
      INSERT INTO kaitun_ids (user_pass, data)
      VALUES (?, ?)
      ON CONFLICT(user_pass) DO UPDATE SET data=excluded.data
    `).run(user_pass, data);
    res.json({ success: true });
  });

  app.delete("/api/admin/kaitun-ids/:id", (req, res) => {
    db.prepare("DELETE FROM kaitun_ids WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
