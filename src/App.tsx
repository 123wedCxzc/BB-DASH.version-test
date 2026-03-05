import React, { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  Copy, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  User, 
  LogOut, 
  Shield, 
  Coins, 
  Plus, 
  Trash2, 
  Edit,
  LayoutDashboard, 
  Image as ImageIcon,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Mail,
  Lock,
  Trash,
  Key,
  MessageSquare,
  Bot,
  Clock,
  Zap,
  Menu,
  X,
  History,
  ShoppingCart,
  Settings as SettingsIcon,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { io } from "socket.io-client";

// Types
interface GameID {
  id?: number;
  user_pass: string;
  username: string;
  latest_farm: string;
  try_id: string;
  money: number;
  fragment: number;
  fruit_inv: string;
  nature_id: string;
}

interface KaitunID {
  id?: number;
  user_pass: string;
  data: string;
}

interface Product {
  id?: number;
  name: string;
  image_url: string;
  price: number;
  stock: number;
  status: 'online' | 'offline';
  category?: 'upgrade' | 'addon';
}

interface Settings {
  facebook_url: string;
  theme_color: string;
  get_email_rate: number;
  change_password_rate: number;
  delete_email_rate: number;
  recover_key_rate: number;
  webhook_check_id?: string;
  webhook_kaitun?: string;
  webhook_id_service?: string;
  webhook_upgrade?: string;
  webhook_addon?: string;
  app_logo?: string;
  bot_logo?: string;
}

interface ChatMessage {
  id: string;
  sender: "BB BOT";
  serviceName: string;
  timestamp: string;
  total: number;
  current: number;
  amount: number;
  refundAmount?: number;
  success?: number;
  failed?: number;
  failedIds?: string[];
  isCompleted: boolean;
}

interface UserProfile {
  id: number;
  username: string;
  points: number;
  role: string;
}

interface Addon {
  id: string;
  name: string;
  price: number;
  image_url: string;
}

interface Order {
  id: number;
  username: string;
  product_name: string;
  addons: string;
  total_price: number;
  status: 'Pending' | 'Completed' | 'Failed';
  created_at: string;
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"search" | "kaitun" | "store" | "upgrade" | "id_service" | "profile" | "admin">("search");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthMode, setIsAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Search State
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<{ found: string[], notFound: string[] } | null>(null);
  const [detailedResults, setDetailedResults] = useState<GameID[]>([]);
  const [isCheckingDetails, setIsCheckingDetails] = useState(false);

  // Kaitun State
  const [kaitunInput, setKaitunInput] = useState("");
  const [kaitunResults, setKaitunResults] = useState<{ found: string[], notFound: string[] } | null>(null);
  const [isProcessingKaitun, setIsProcessingKaitun] = useState(false);
  const [kaitunFinalResults, setKaitunFinalResults] = useState<any[]>([]);

  // Store State
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings>({ 
    facebook_url: "", 
    theme_color: "#0ea5e9",
    get_email_rate: 95,
    change_password_rate: 95,
    delete_email_rate: 95,
    recover_key_rate: 95,
    webhook_check_id: "",
    webhook_kaitun: "",
    webhook_id_service: "",
    webhook_upgrade: "",
    webhook_addon: "",
    app_logo: "",
    bot_logo: ""
  });

  // ID Service State
  const [idServiceInput, setIdServiceInput] = useState("");
  const [isProcessingService, setIsProcessingService] = useState(false);
  const [serviceProgress, setServiceProgress] = useState(0);
  const [showServiceSuccess, setShowServiceSuccess] = useState(false);
  const [currentService, setCurrentService] = useState<string>("");

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("bb_chat_messages");
    return saved ? JSON.parse(saved) : [];
  });
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Upgrade & Add-on State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([]);
  const [showUpgradeConfirm, setShowUpgradeConfirm] = useState(false);
  const [upgradeAgreements, setUpgradeAgreements] = useState({ terms: false, noRefund: false });
  const [userOrders, setUserOrders] = useState<Order[]>([]);

  // Profile Edit State
  const [newProfileName, setNewProfileName] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Admin State
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
  const [adminGameIDs, setAdminGameIDs] = useState<GameID[]>([]);
  const [adminKaitunIDs, setAdminKaitunIDs] = useState<KaitunID[]>([]);
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [adminSubTab, setAdminSubTab] = useState<"users" | "search" | "kaitun" | "store" | "id_service" | "orders" | "settings" | "chat">("users");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<{ name: string, sub?: string, ids: string[], cost: number } | null>(null);
  const [newGameID, setNewGameID] = useState<GameID>({
    user_pass: "",
    username: "",
    latest_farm: "",
    try_id: "",
    money: 0,
    fragment: 0,
    fruit_inv: "",
    nature_id: ""
  });
  const [newKaitunID, setNewKaitunID] = useState<KaitunID>({ user_pass: "", data: "" });
  const [newProduct, setNewProduct] = useState<Product>({
    name: "",
    image_url: "",
    price: 0,
    stock: 0,
    status: 'online'
  });
  const [imageSourceType, setImageSourceType] = useState<'url' | 'upload'>('url');

  useEffect(() => {
    fetchSettings();
    if (activeTab === "store" || activeTab === "upgrade") fetchProducts();
    if (activeTab === "admin") fetchAdminData();
    
    // Clear inputs when switching tabs
    setSearchInput("");
    setSearchResults(null);
    setDetailedResults([]);
    setKaitunInput("");
    setKaitunResults(null);
    setKaitunFinalResults([]);
  }, [activeTab, refreshTrigger]);

  useEffect(() => {
    if (user) {
      const socket = io();
      socket.emit("join", user.username);
      if (user.role === "admin") {
        socket.emit("join-admin");
      }

      socket.on("points-updated", (newPoints) => {
        setUser(prev => prev ? { ...prev, points: newPoints } : null);
      });

      socket.on("order-status-updated", ({ orderId, status }) => {
        setRefreshTrigger(prev => prev + 1);
        alert(`ออเดอร์ #${orderId} ของคุณถูกเปลี่ยนสถานะเป็น: ${status}`);
      });

      socket.on("new-order", (order) => {
        if (user.role === "admin") {
          setRefreshTrigger(prev => prev + 1);
          alert(`มีออเดอร์ใหม่จากคุณ ${order.username}: ${order.product_name}`);
        }
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setSettings(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      fetchUserProfile(parsed.username);
    }
  }, []);

  const fetchUserProfile = async (username: string) => {
    try {
      const res = await fetch(`/api/user/${username}`);
      const data = await res.json();
      if (data.username) {
        setUser(data);
        localStorage.setItem("user", JSON.stringify(data));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateUsername = async (newUsername: string) => {
    if (!user) return;
    try {
      const res = await fetch("/api/user/update-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldUsername: user.username, newUsername })
      });
      const data = await res.json();
      if (data.success) {
        fetchUserProfile(newUsername);
        alert("Username updated successfully!");
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Failed to update username");
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const endpoint = isAuthMode === "login" ? "/api/auth/login" : "/api/auth/register";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      if (data.success) {
        if (isAuthMode === "login") {
          setUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
        } else {
          setIsAuthMode("login");
          setError("Registration successful! Please login.");
        }
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    setActiveTab("search");
  };

  const handleSearch = async () => {
    if (!searchInput.trim()) return;
    setLoading(true);
    const ids = searchInput.split("\n").map(s => s.trim()).filter(s => s && s.includes(":")).slice(0, 20);
    try {
      const res = await fetch("/api/search/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids })
      });
      const data = await res.json();
      setSearchResults(data);
      setDetailedResults([]);
    } catch (e) {
      setError("Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckDetails = async () => {
    if (!searchResults?.found.length) return;
    setIsCheckingDetails(true);
    try {
      const res = await fetch("/api/search/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: searchResults.found })
      });
      const data = await res.json();
      setDetailedResults(data);
    } catch (e) {
      setError("Failed to fetch details");
    } finally {
      setIsCheckingDetails(false);
    }
  };

  const handleKaitunSearch = async () => {
    if (!kaitunInput.trim()) return;
    setLoading(true);
    setKaitunFinalResults([]);
    const ids = kaitunInput.split("\n").map(s => s.trim()).filter(s => s && s.includes(":")).slice(0, 20);
    try {
      const res = await fetch("/api/kaitun/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids })
      });
      const data = await res.json();
      setKaitunResults(data);
    } catch (e) {
      setError("Kaitun search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmKaitun = async () => {
    if (!kaitunResults?.found.length || !user) return;
    setIsProcessingKaitun(true);
    try {
      const res = await fetch("/api/kaitun/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user.username, ids: kaitunResults.found })
      });
      const data = await res.json();
      if (data.success) {
        setUser({ ...user, points: data.newPoints });
        setKaitunFinalResults(data.results);
        setKaitunResults(null);
        setKaitunInput("");
        alert("เช็คไอดีสำเร็จ! บันทึกรายการลงในประวัติการสั่งซื้อแล้ว");
      } else {
        if (data.error === "Insufficient points") {
          setActiveTab("profile");
          alert("Insufficient points! Redirecting to top-up.");
        } else {
          alert(data.error);
        }
      }
    } catch (e) {
      alert("Processing failed");
    } finally {
      setIsProcessingKaitun(false);
    }
  };

  const handleIDServiceConfirm = async (serviceName: string, subType?: string) => {
    if (!idServiceInput.trim() || !user) return;
    
    const ids = idServiceInput.split("\n").map(s => s.trim()).filter(Boolean).slice(0, 500);
    if (ids.length === 0) return;

    const costPerId = 0.30;
    const totalCost = ids.length * costPerId;

    if (user.points < totalCost) {
      setError("Insufficient points (Need " + totalCost.toFixed(2) + " P)");
      return;
    }

    setPendingOrder({ name: serviceName, sub: subType, ids, cost: totalCost });
    setShowConfirmModal(true);
  };

  const startIDService = async () => {
    if (!pendingOrder || !user) return;
    
    const { name, sub, ids, cost } = pendingOrder;
    setShowConfirmModal(false);
    setIsProcessingService(true);
    setServiceProgress(0);
    setCurrentService(name + (sub ? ` (${sub})` : ""));

    // Deduct points immediately
    try {
      await fetch("/api/user/deduct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: user.username, 
          amount: cost,
          serviceName: name + (sub ? ` (${sub})` : ""),
          details: ids.map(id => ({ name: id }))
        })
      });
      fetchUserProfile(user.username);
      setActiveTab("profile");
      alert("เริ่มทำรายการแล้ว! กำลังพาท่านไปยังประวัติการสั่งซื้อ (คุณสามารถดูความคืบหน้าได้ที่แชทบอท)");
    } catch (err) {
      console.error("Failed to deduct points:", err);
    }

    // Start progress animation
    const duration = 5000 + Math.random() * 3000; // 5-8 seconds
    const startTime = Date.now();
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / duration) * 100);
      setServiceProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        finishService(ids, name, sub);
      }
    }, 100);
  };

  const finishService = async (ids: string[], serviceName: string, subType?: string) => {
    setIsProcessingService(false);
    setShowServiceSuccess(true);
    
    const fullServiceName = serviceName + (subType ? ` (${subType})` : "");
    const messageId = Math.random().toString(36).substr(2, 9);
    const newMessage: ChatMessage = {
      id: messageId,
      sender: "BB BOT",
      serviceName: fullServiceName,
      timestamp: new Date().toLocaleTimeString(),
      total: ids.length,
      current: 0,
      amount: pendingOrder?.cost || 0,
      isCompleted: false
    };

    setMessages(prev => [newMessage, ...prev]);
    setIsChatOpen(true);

    processBotUpdates(messageId, ids, serviceName);
    setPendingOrder(null);
  };

  const processBotUpdates = (messageId: string, ids: string[], serviceName: string) => {
    let current = 0;
    const total = ids.length;
    
    const updateNext = () => {
      if (current < total) {
        current += Math.max(1, Math.floor(total / 10)); // Process in chunks for larger amounts
        if (current > total) current = total;
        
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, current } : m));
        
        const delay = 2000 + Math.random() * 5000; // Faster updates for 500 IDs
        setTimeout(updateNext, delay);
      } else {
        // Complete
        let rateKey = "get_email_rate";
        if (serviceName.includes("Change password")) rateKey = "change_password_rate";
        if (serviceName.includes("Delete E-mail")) rateKey = "delete_email_rate";
        if (serviceName.includes("Recover the key")) rateKey = "recover_key_rate";
        
        const successRate = (settings as any)[rateKey] || 95;
        const successCount = Math.floor(total * (successRate / 100));
        const failedCount = total - successCount;
        
        // Simulate which ones failed
        const shuffled = [...ids].sort(() => 0.5 - Math.random());
        const failedIds = shuffled.slice(0, failedCount);
        
        const costPerId = 0.30;
        const refundAmount = failedCount * costPerId;

        // Refund points for failed ones
        if (refundAmount > 0 && user) {
          fetch("/api/user/add-points", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: user.username, amount: refundAmount })
          }).then(() => {
            fetchUserProfile(user.username);
          });
        }
        
        setMessages(prev => prev.map(m => m.id === messageId ? { 
          ...m, 
          success: successCount, 
          failed: failedCount, 
          failedIds,
          refundAmount,
          isCompleted: true 
        } : m));
      }
    };

    setTimeout(updateNext, 2000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  // Admin Functions
  const fetchAdminData = async () => {
    if (user?.role !== "admin") return;
    const [usersRes, gameRes, kaitunRes, productsRes, ordersRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/admin/game-ids"),
      fetch("/api/admin/kaitun-ids"),
      fetch("/api/admin/products"),
      fetch("/api/admin/orders")
    ]);
    setAdminUsers(await usersRes.json());
    setAdminGameIDs(await gameRes.json());
    setAdminKaitunIDs(await kaitunRes.json());
    setAdminProducts(await productsRes.json());
    setAdminOrders(await ordersRes.json());
  };

  const updateOrderStatus = async (id: number, status: string) => {
    await fetch(`/api/admin/orders/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    fetchAdminData();
  };

  useEffect(() => {
    if (activeTab === "admin") fetchAdminData();
  }, [activeTab]);

  const updatePoints = async (id: number, points: number) => {
    await fetch(`/api/admin/users/${id}/points`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points })
    });
    fetchAdminData();
  };

  const saveGameID = async () => {
    await fetch("/api/admin/game-ids", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newGameID)
    });
    setNewGameID({
      user_pass: "",
      username: "",
      latest_farm: "",
      try_id: "",
      money: 0,
      fragment: 0,
      fruit_inv: "",
      nature_id: ""
    });
    fetchAdminData();
  };

  const deleteGameID = async (id: number) => {
    await fetch(`/api/admin/game-ids/${id}`, { method: "DELETE" });
    fetchAdminData();
  };

  const saveKaitunID = async () => {
    await fetch("/api/admin/kaitun-ids", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newKaitunID)
    });
    setNewKaitunID({ user_pass: "", data: "" });
    fetchAdminData();
  };

  const deleteKaitunID = async (id: number) => {
    await fetch(`/api/admin/kaitun-ids/${id}`, { method: "DELETE" });
    fetchAdminData();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct({ ...newProduct, image_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProduct = async () => {
    await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProduct)
    });
    setNewProduct({
      name: "",
      image_url: "",
      price: 0,
      stock: 0,
      status: 'online'
    });
    fetchAdminData();
    fetchProducts();
  };
  const deleteProduct = async (id: number) => {
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    fetchAdminData();
    fetchProducts();
  };

  const updateSetting = async (key: string, value: string) => {
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value })
    });
    fetchSettings();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-950">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md glass p-8 rounded-2xl shadow-2xl"
        >
          <div className="text-center mb-8">
            <img 
              src="https://cdn.discordapp.com/attachments/1464815681420660788/1477969312416534528/file_00000000c4b872088c92127820c322e7-removebg-preview.png?ex=69a6b1af&is=69a5602f&hm=effe26b53b8229830129744632f54f2f869e67e8498c9c64427efe8b6e7c0553&" 
              alt="BB-DASH Logo" 
              className="w-32 h-32 mx-auto mb-4 drop-shadow-[0_0_20px_rgba(14,165,233,0.4)]"
              referrerPolicy="no-referrer"
            />
            <h1 className="text-6xl font-bold brand-text mb-2">BB-DASH</h1>
            <p className="text-neutral-500 tracking-[0.3em] uppercase text-[10px] thai-font">Professional Gaming Tools</p>
          </div>

          <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-lg">
            <button 
              onClick={() => setIsAuthMode("login")}
              className={`flex-1 py-2 rounded-md transition-all thai-font ${isAuthMode === "login" ? "bg-sky-500 text-white shadow-lg" : "text-neutral-400 hover:text-white"}`}
            >
              เข้าสู่ระบบ
            </button>
            <button 
              onClick={() => setIsAuthMode("register")}
              className={`flex-1 py-2 rounded-md transition-all thai-font ${isAuthMode === "register" ? "bg-sky-500 text-white shadow-lg" : "text-neutral-400 hover:text-white"}`}
            >
              สมัครสมาชิก
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1 thai-font">ชื่อผู้ใช้งาน</label>
              <input 
                type="text" 
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                value={authForm.username}
                onChange={e => setAuthForm({ ...authForm, username: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1 thai-font">รหัสผ่าน</label>
              <input 
                type="password" 
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                value={authForm.password}
                onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
              />
            </div>
            {error && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 text-sm thai-font"
              >
                {error}
              </motion.p>
            )}
            <button 
              disabled={loading}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-sky-900/20 flex items-center justify-center gap-2 thai-font"
            >
              {loading ? <Loader2 className="animate-spin" /> : null}
              {isAuthMode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      {/* Sidebar / Nav */}
      <nav className="glass-dark border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsMenuOpen(true)}
                className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                <Menu size={24} />
              </button>
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab("search")}>
                <img 
                  src={settings.app_logo || "https://cdn.discordapp.com/attachments/1464815681420660788/1477969312416534528/file_00000000c4b872088c92127820c322e7-removebg-preview.png?ex=69a6b1af&is=69a5602f&hm=effe26b53b8229830129744632f54f2f869e67e8498c9c64427efe8b6e7c0553&"} 
                  alt="Logo" 
                  className="w-8 h-8 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <h1 className="text-2xl font-bold brand-text tracking-tight hidden sm:block">BB-DASH</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-sky-500/10 rounded-full border border-sky-500/20">
                <Coins size={16} className="text-sky-400" />
                <span className="font-bold text-sky-400">{user.points.toFixed(2)} <span className="text-[10px] thai-font">Point</span></span>
              </div>
              <button 
                onClick={() => setActiveTab("profile")}
                className={`p-2 rounded-full transition-all ${activeTab === "profile" ? "bg-sky-500 text-white" : "text-neutral-400 hover:bg-white/5"}`}
              >
                <User size={20} />
              </button>
              <button onClick={handleLogout} className="p-2 text-neutral-400 hover:text-red-400 transition-all">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hamburger Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-neutral-900 border-r border-white/10 z-[101] p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <img 
                    src="https://cdn.discordapp.com/attachments/1464815681420660788/1477969312416534528/file_00000000c4b872088c92127820c322e7-removebg-preview.png?ex=69a6b1af&is=69a5602f&hm=effe26b53b8229830129744632f54f2f869e67e8498c9c64427efe8b6e7c0553&" 
                    alt="Logo" 
                    className="w-8 h-8"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-xl font-bold brand-text">BB-DASH</span>
                </div>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 text-neutral-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 space-y-2">
                <MenuBtn active={activeTab === "search"} onClick={() => { setActiveTab("search"); setIsMenuOpen(false); }} icon={<Search size={20}/>} label="ค้นหาไอดี" />
                <MenuBtn active={activeTab === "kaitun"} onClick={() => { setActiveTab("kaitun"); setIsMenuOpen(false); }} icon={<ImageIcon size={20}/>} label="Auto Crop Kaitun" />
                <MenuBtn active={activeTab === "id_service"} onClick={() => { setActiveTab("id_service"); setIsMenuOpen(false); }} icon={<Zap size={20}/>} label="ID SERVICE" />
                <MenuBtn active={activeTab === "store"} onClick={() => { setActiveTab("store"); setIsMenuOpen(false); }} icon={<LayoutDashboard size={20}/>} label="เช็คไอดีคงเหลือ" />
                <MenuBtn active={activeTab === "upgrade"} onClick={() => { setActiveTab("upgrade"); setIsMenuOpen(false); }} icon={<ShoppingCart size={20}/>} label="Upgrade & Add on" />
                <div className="h-px bg-white/5 my-4" />
                <MenuBtn active={activeTab === "profile"} onClick={() => { setActiveTab("profile"); setIsMenuOpen(false); }} icon={<User size={20}/>} label="โปรไฟล์" />
                {user.role === "admin" && (
                  <MenuBtn active={activeTab === "admin"} onClick={() => { setActiveTab("admin"); setIsMenuOpen(false); }} icon={<Shield size={20}/>} label="หลังบ้าน" />
                )}
              </div>

              <div className="mt-auto pt-6 border-t border-white/5">
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  <div className="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center font-bold">
                    {user.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="font-bold truncate">{user.username}</p>
                    <p className="text-[10px] text-sky-400 font-mono">{user.points.toFixed(2)} P</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <AnimatePresence mode="wait">
          {activeTab === "search" && (
            <motion.div 
              key="search"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="glass p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2 thai-font">
                    <Search className="text-sky-400" /> ค้นหาไอดีเกม
                  </h2>
                  <span className="text-xs text-neutral-500 thai-font">สูงสุด 20 ไอดี (1 ไอดี : 1 บรรทัด)</span>
                </div>
                <textarea 
                  className="w-full h-40 bg-black/40 border border-white/10 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-sky-500/50 font-mono text-sm transition-all"
                  placeholder="user:pass&#10;user2:pass2"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                />
                <button 
                  onClick={handleSearch}
                  disabled={loading}
                  className="mt-4 w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 thai-font"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Search size={20} />}
                  เริ่มการค้นหา
                </button>
              </div>

              {searchResults && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Found */}
                  <div className="glass p-6 rounded-2xl border-sky-500/20">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sky-400 font-bold flex items-center gap-2 thai-font">
                        <CheckCircle2 size={18} /> พบไอดีที่เช็คได้ ({searchResults.found.length})
                      </h3>
                      <button 
                        onClick={() => copyToClipboard(searchResults.found.join("\n"))}
                        className="p-2 hover:bg-white/5 rounded-lg text-neutral-400 transition-all"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {searchResults.found.map((id, i) => (
                        <div key={i} className="p-3 bg-sky-500/5 border border-sky-500/10 rounded-lg text-sm font-mono flex items-center justify-between">
                          {id}
                          <CheckCircle2 size={14} className="text-sky-500" />
                        </div>
                      ))}
                    </div>
                    {searchResults.found.length > 0 && (
                      <button 
                        onClick={handleCheckDetails}
                        disabled={isCheckingDetails}
                        className="mt-4 w-full bg-white/5 hover:bg-white/10 text-white py-2 rounded-lg transition-all flex items-center justify-center gap-2 thai-font border border-white/10"
                      >
                        {isCheckingDetails ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                        กดเช็คข้อมูลในไอดีที่พบ ({searchResults.found.length})
                      </button>
                    )}
                  </div>

                  {/* Not Found */}
                  <div className="glass p-6 rounded-2xl border-red-500/20">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-red-400 font-bold flex items-center gap-2 thai-font">
                        <XCircle size={18} /> ไม่พบไอดี ({searchResults.notFound.length})
                      </h3>
                      <button 
                        onClick={() => copyToClipboard(searchResults.notFound.join("\n"))}
                        className="p-2 hover:bg-white/5 rounded-lg text-neutral-400 transition-all"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {searchResults.notFound.map((id, i) => (
                        <div key={i} className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg text-sm font-mono flex items-center justify-between group">
                          {id}
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <Loader2 size={14} className="text-red-500 animate-spin-slow" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Detailed Results */}
              {detailedResults.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold thai-font px-2">รายละเอียดข้อมูลไอดี</h2>
                  <div className="grid grid-cols-1 gap-4">
                    {detailedResults.map((item, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass p-6 rounded-2xl border-l-4 border-l-sky-500"
                      >
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <DetailItem label="Username" value={item.username} />
                          <DetailItem label="Latest farm" value={item.latest_farm} />
                          <DetailItem label="TRY ID" value={item.try_id} />
                          <DetailItem label="Money" value={item.money.toLocaleString()} />
                          <DetailItem label="Fragment" value={item.fragment.toLocaleString()} />
                          <DetailItem label="Fruit inv" value={item.fruit_inv} />
                          <DetailItem label="Nature ID" value={item.nature_id} />
                          <DetailItem label="User:Pass" value={item.user_pass} isMono />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "kaitun" && (
            <motion.div 
              key="kaitun"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="glass p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2 thai-font">
                    <ImageIcon className="text-sky-400" style={{ color: settings.theme_color }} /> Auto Crop image Kaitun 🐔
                  </h2>
                  <div className="text-right">
                    <p className="text-[10px] text-sky-400 thai-font" style={{ color: settings.theme_color }}>ไอดีทางร้าน: 0.30 Point / ID</p>
                    <p className="text-[10px] text-red-400 thai-font">ไอดีทั่วไป: 1.50 Point / ID</p>
                  </div>
                </div>
                <textarea 
                  className="w-full h-40 bg-black/40 border border-white/10 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-sky-500/50 font-mono text-sm transition-all"
                  placeholder="user:pass"
                  value={kaitunInput}
                  onChange={e => setKaitunInput(e.target.value)}
                />
                <button 
                  onClick={handleKaitunSearch}
                  disabled={loading}
                  className="mt-4 w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 thai-font"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Search size={20} />}
                  ตรวจสอบไอดี Kaitun
                </button>
              </div>

              {kaitunResults && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="glass p-6 rounded-2xl border-sky-500/20">
                    <h3 className="text-sky-400 font-bold mb-4 thai-font">พบไอดี ({kaitunResults.found.length})</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
                      {kaitunResults.found.map((id, i) => (
                        <div key={i} className="p-2 bg-white/5 rounded border border-white/10 text-sm font-mono">{id}</div>
                      ))}
                    </div>
                    {kaitunResults.found.length > 0 && (
                      <button 
                        onClick={handleConfirmKaitun}
                        disabled={isProcessingKaitun}
                        className="w-full bg-sky-600 hover:bg-sky-500 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 thai-font"
                      >
                        {isProcessingKaitun ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
                        Confirm & Pay ({(kaitunResults.found.length * 0.3).toFixed(2)} Points)
                      </button>
                    )}
                  </div>
                  <div className="glass p-6 rounded-2xl border-red-500/20">
                    <h3 className="text-red-400 font-bold mb-4 thai-font">ไม่พบไอดี ({kaitunResults.notFound.length})</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {kaitunResults.notFound.map((id, i) => (
                        <div key={i} className="p-2 bg-red-500/5 rounded border border-red-500/10 text-sm font-mono flex justify-between">
                          {id}
                          <Loader2 size={14} className="text-red-500 animate-spin" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {kaitunFinalResults.length > 0 && (
                <div className="glass p-6 rounded-2xl">
                  <h3 className="text-xl font-bold mb-6 thai-font flex items-center gap-2">
                    <CheckCircle2 className="text-emerald-400" /> ผลการตรวจสอบไอดี Kaitun
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {kaitunFinalResults.map((res, i) => (
                      <div key={i} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                        <div className="p-3 border-b border-white/5 bg-black/20">
                          <p className="text-xs text-neutral-500 thai-font">Username</p>
                          <p className="font-mono text-sm text-sky-400 truncate">{res.username}</p>
                        </div>
                        <div className="aspect-video bg-black/40 relative group">
                          {res.image_url ? (
                            <img 
                              src={res.image_url} 
                              alt={res.username} 
                              className="w-full h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-600">
                              <ImageIcon size={32} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "id_service" && user && (
            <motion.div
              key="id_service"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <IDServiceTab 
                input={idServiceInput}
                setInput={setIdServiceInput}
                onConfirm={handleIDServiceConfirm}
                isProcessing={isProcessingService}
                progress={serviceProgress}
                showSuccess={showServiceSuccess}
                setShowSuccess={setShowServiceSuccess}
                user={user}
              />
            </motion.div>
          )}

          {activeTab === "store" && (
            <motion.div 
              key="store"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-display font-bold neon-text thai-font">เช็คไอดีคงเหลือของร้าน</h2>
                <p className="text-neutral-400 thai-font mt-2">เลือกชมสินค้าที่พร้อมจำหน่ายในขณะนี้</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.filter(p => p.stock > 0 || p.status === 'online').map((product) => (
                  <motion.div 
                    key={product.id}
                    whileHover={{ y: -5 }}
                    className="glass rounded-2xl overflow-hidden group border-white/10 hover:border-sky-500/50 transition-all"
                  >
                    <div className="aspect-square relative overflow-hidden">
                      <img 
                        src={product.image_url || "https://picsum.photos/seed/game/400/400"} 
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="p-4 space-y-3">
                      <h3 className="font-bold text-lg leading-tight thai-font line-clamp-2 h-14">{product.name}</h3>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-sky-400 text-xl font-bold" style={{ color: settings.theme_color }}>{product.price.toLocaleString()} <span className="text-xs">บาท</span></p>
                        </div>
                      </div>
                      {product.stock > 0 ? (
                        <button 
                          onClick={() => alert(`Coming soon`)}
                          className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-lg transition-all thai-font shadow-lg shadow-red-900/20"
                        >
                          ซื้อสินค้าที่นี่
                        </button>
                      ) : (
                        <div className="w-full bg-neutral-800 text-neutral-500 font-bold py-2 rounded-lg text-center thai-font border border-white/5">
                          สินค้านี้หมด
                        </div>
                      )}
                      <div className="flex items-center justify-center gap-1 text-neutral-500 text-[10px] thai-font">
                        <LayoutDashboard size={12} />
                        เหลือทั้งหมด {product.stock} ชิ้น
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "upgrade" && user && (
            <motion.div
              key="upgrade"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <UpgradeTab 
                products={products}
                user={user}
                onOrderSuccess={() => {
                  fetchUserProfile(user.username);
                  setActiveTab("profile");
                  alert("สั่งซื้อสำเร็จ! กำลังพาท่านไปยังประวัติการสั่งซื้อ");
                }}
              />
            </motion.div>
          )}

          {activeTab === "profile" && user && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ProfileTab 
                user={user} 
                onLogout={handleLogout}
                onUpdateUsername={handleUpdateUsername}
                refreshTrigger={refreshTrigger}
              />
            </motion.div>
          )}

          {activeTab === "admin" && user.role === "admin" && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="flex flex-wrap gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                <AdminTabBtn active={adminSubTab === "users"} onClick={() => setAdminSubTab("users")} label="จัดการผู้ใช้งาน" />
                <AdminTabBtn active={adminSubTab === "search"} onClick={() => setAdminSubTab("search")} label="ตั้งค่า ค้นหาไอดี" />
                <AdminTabBtn active={adminSubTab === "kaitun"} onClick={() => setAdminSubTab("kaitun")} label="ตั้งค่า Auto crop kaitun" />
                <AdminTabBtn active={adminSubTab === "store"} onClick={() => setAdminSubTab("store")} label="ตั้งค่า เช็คไอดีคงเหลือ" />
                <AdminTabBtn active={adminSubTab === "id_service"} onClick={() => setAdminSubTab("id_service")} label="ตั้งค่า ID Service" />
                <AdminTabBtn active={adminSubTab === "orders"} onClick={() => setAdminSubTab("orders")} label="จัดการออเดอร์" />
                <AdminTabBtn active={adminSubTab === "settings"} onClick={() => setAdminSubTab("settings")} label="ตั้งค่าระบบ" />
                <AdminTabBtn active={adminSubTab === "chat"} onClick={() => setAdminSubTab("chat")} label="จัดการแชท" />
              </div>

              {adminSubTab === "users" && (
                <section className="glass p-6 rounded-2xl">
                  <h2 className="text-xl font-bold mb-6 thai-font">จัดการผู้ใช้งาน</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/10 text-neutral-400 text-sm">
                          <th className="pb-3 thai-font">Username</th>
                          <th className="pb-3 thai-font">Points</th>
                          <th className="pb-3 thai-font">Role</th>
                          <th className="pb-3 thai-font text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {adminUsers.map(u => (
                          <tr key={u.id} className="text-sm">
                            <td className="py-4">{u.username}</td>
                            <td className="py-4">
                              <input 
                                type="number" 
                                className="bg-white/5 border border-white/10 rounded px-2 py-1 w-24"
                                defaultValue={u.points}
                                onBlur={e => updatePoints(u.id, parseFloat(e.target.value))}
                              />
                            </td>
                            <td className="py-4 uppercase text-xs">{u.role}</td>
                            <td className="py-4 text-right">
                              <button className="text-sky-400 hover:underline thai-font">บันทึก</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {adminSubTab === "search" && (
                <section className="glass p-6 rounded-2xl">
                  <h2 className="text-xl font-bold mb-6 thai-font">จัดการข้อมูล ค้นหาไอดี</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 p-4 bg-white/5 rounded-xl border border-white/10">
                    <AdminInput label="User:Pass" value={newGameID.user_pass} onChange={v => setNewGameID({...newGameID, user_pass: v})} />
                    <AdminInput label="Username" value={newGameID.username} onChange={v => setNewGameID({...newGameID, username: v})} />
                    <AdminInput label="Latest Farm" value={newGameID.latest_farm} onChange={v => setNewGameID({...newGameID, latest_farm: v})} />
                    <AdminInput label="TRY ID" value={newGameID.try_id} onChange={v => setNewGameID({...newGameID, try_id: v})} />
                    <AdminInput label="Money" type="number" value={newGameID.money.toString()} onChange={v => setNewGameID({...newGameID, money: parseInt(v) || 0})} />
                    <AdminInput label="Fragment" type="number" value={newGameID.fragment.toString()} onChange={v => setNewGameID({...newGameID, fragment: parseInt(v) || 0})} />
                    <AdminInput label="Fruit Inv" value={newGameID.fruit_inv} onChange={v => setNewGameID({...newGameID, fruit_inv: v})} />
                    <AdminInput label="Nature ID" value={newGameID.nature_id} onChange={v => setNewGameID({...newGameID, nature_id: v})} />
                    <div className="lg:col-span-4">
                      <button onClick={saveGameID} className="w-full bg-sky-600 py-2 rounded-lg font-bold thai-font">เพิ่ม/แก้ไข ข้อมูล</button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-neutral-400">
                          <th className="pb-3">User:Pass</th>
                          <th className="pb-3">Username</th>
                          <th className="pb-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminGameIDs.map(g => (
                          <tr key={g.id} className="border-b border-white/5">
                            <td className="py-3 font-mono">{g.user_pass}</td>
                            <td className="py-3">{g.username}</td>
                            <td className="py-3 text-right">
                              <button onClick={() => deleteGameID(g.id!)} className="text-red-400 hover:text-red-300"><Trash2 size={16}/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {adminSubTab === "kaitun" && (
                <section className="glass p-6 rounded-2xl">
                  <h2 className="text-xl font-bold mb-6 thai-font">จัดการข้อมูล Auto crop kaitun</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 p-4 bg-white/5 rounded-xl border border-white/10">
                    <AdminInput label="User:Pass (ไอดีทางร้าน)" value={newKaitunID.user_pass} onChange={v => setNewKaitunID({...newKaitunID, user_pass: v})} />
                    <AdminInput label="ลิ้งค์รูปภาพ (Image URL)" value={newKaitunID.data} onChange={v => setNewKaitunID({...newKaitunID, data: v})} />
                    <div className="md:col-span-2">
                      <button onClick={saveKaitunID} className="w-full bg-sky-600 py-2 rounded-lg font-bold thai-font">เพิ่ม/แก้ไข ข้อมูล</button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-neutral-400">
                          <th className="pb-3">User:Pass</th>
                          <th className="pb-3">ลิ้งค์รูปภาพ</th>
                          <th className="pb-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminKaitunIDs.map(k => (
                          <tr key={k.id} className="border-b border-white/5">
                            <td className="py-3 font-mono">{k.user_pass}</td>
                            <td className="py-3 truncate max-w-[200px]">{k.data}</td>
                            <td className="py-3 text-right">
                              <button onClick={() => deleteKaitunID(k.id!)} className="text-red-400 hover:text-red-300"><Trash2 size={16}/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {adminSubTab === "store" && (
                <section className="glass p-6 rounded-2xl">
                  <h2 className="text-xl font-bold mb-6 thai-font">จัดการข้อมูล เช็คไอดีคงเหลือ</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 p-6 bg-white/5 rounded-2xl border border-white/10">
                    <AdminInput label="ชื่อสินค้า" value={newProduct.name} onChange={v => setNewProduct({...newProduct, name: v})} />
                    <div>
                      <label className="block text-xs text-neutral-500 mb-2 thai-font">หมวดหมู่</label>
                      <select 
                        value={newProduct.category || 'upgrade'} 
                        onChange={e => setNewProduct({...newProduct, category: e.target.value as any})}
                        className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="upgrade">Upgrade</option>
                        <option value="addon">Add-on</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs text-neutral-500 thai-font">รูปภาพสินค้า</label>
                        <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/10">
                          <button 
                            onClick={() => setImageSourceType('url')}
                            className={`px-2 py-1 text-[10px] rounded-md transition-all ${imageSourceType === 'url' ? 'bg-sky-500 text-white' : 'text-neutral-400'}`}
                          >URL</button>
                          <button 
                            onClick={() => setImageSourceType('upload')}
                            className={`px-2 py-1 text-[10px] rounded-md transition-all ${imageSourceType === 'upload' ? 'bg-sky-500 text-white' : 'text-neutral-400'}`}
                          >Upload</button>
                        </div>
                      </div>
                      {imageSourceType === 'url' ? (
                        <input 
                          type="text"
                          className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-500 text-sm"
                          placeholder="https://..."
                          value={newProduct.image_url}
                          onChange={e => setNewProduct({...newProduct, image_url: e.target.value})}
                        />
                      ) : (
                        <div className="relative">
                          <input 
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <div className="w-full bg-black/40 border border-dashed border-white/20 rounded-lg px-3 py-2 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                            <ImageIcon size={14} />
                            {newProduct.image_url?.startsWith('data:') ? 'เปลี่ยนรูปภาพ' : 'เลือกไฟล์รูปภาพ'}
                          </div>
                        </div>
                      )}
                      {newProduct.image_url && (
                        <div className="mt-2 relative w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                          <img src={newProduct.image_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <button 
                            onClick={() => setNewProduct({...newProduct, image_url: ""})}
                            className="absolute top-0 right-0 bg-red-500 p-0.5 rounded-bl-lg"
                          ><Trash2 size={10} /></button>
                        </div>
                      )}
                    </div>

                    <AdminInput label="ราคา" type="number" value={newProduct.price?.toString() || ""} onChange={v => setNewProduct({...newProduct, price: parseFloat(v) || 0})} />
                    <AdminInput label="จำนวนคงเหลือ" type="number" value={newProduct.stock?.toString() || ""} onChange={v => setNewProduct({...newProduct, stock: parseInt(v) || 0})} />
                    <div>
                      <label className="block text-xs text-neutral-500 mb-1 thai-font">สถานะ</label>
                      <select 
                        className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-500 text-sm"
                        value={newProduct.status}
                        onChange={e => setNewProduct({...newProduct, status: e.target.value as 'online' | 'offline'})}
                      >
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                      </select>
                    </div>
                    <div className="lg:col-span-3 flex gap-2">
                      <button onClick={saveProduct} className="flex-1 bg-sky-600 py-3 rounded-xl font-bold thai-font shadow-lg shadow-sky-900/20 hover:bg-sky-500 transition-all">
                        {newProduct.id ? "บันทึกการแก้ไข" : "เพิ่มสินค้าใหม่"}
                      </button>
                      {newProduct.id && (
                        <button 
                          onClick={() => setNewProduct({ name: "", image_url: "", price: 0, stock: 0, status: 'online' })} 
                          className="px-6 bg-white/5 border border-white/10 rounded-xl font-bold thai-font hover:bg-white/10 transition-all"
                        >
                          ยกเลิก
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-neutral-400">
                          <th className="pb-3">สินค้า</th>
                          <th className="pb-3">หมวดหมู่</th>
                          <th className="pb-3">ราคา</th>
                          <th className="pb-3">สต็อก</th>
                          <th className="pb-3">สถานะ</th>
                          <th className="pb-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminProducts.map(p => (
                          <tr key={p.id} className="border-b border-white/5">
                            <td className="py-3 flex items-center gap-2">
                              <img src={p.image_url} className="w-8 h-8 rounded object-cover" referrerPolicy="no-referrer" />
                              {p.name}
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] ${p.category === 'addon' ? 'bg-purple-500/20 text-purple-400' : 'bg-sky-500/20 text-sky-400'}`}>
                                {p.category || 'upgrade'}
                              </span>
                            </td>
                            <td className="py-3">{p.price}</td>
                            <td className="py-3">{p.stock}</td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] ${p.status === 'online' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="py-3 text-right flex items-center justify-end gap-2">
                              <button onClick={() => {
                                setNewProduct(p);
                                setImageSourceType(p.image_url?.startsWith('data:') ? 'upload' : 'url');
                              }} className="text-sky-400 hover:text-sky-300"><Edit size={16}/></button>
                              <button onClick={() => deleteProduct(p.id!)} className="text-red-400 hover:text-red-300"><Trash2 size={16}/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {adminSubTab === "id_service" && (
                <section className="glass p-6 rounded-2xl">
                  <h2 className="text-xl font-bold mb-6 thai-font flex items-center gap-2">
                    <Zap size={24} className="text-sky-400" /> ตั้งค่า ID Service
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm text-neutral-400 thai-font">Success Rate: Get E-mail (%)</label>
                      <input 
                        type="number" 
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2"
                        value={settings.get_email_rate}
                        onChange={e => updateSetting("get_email_rate", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-neutral-400 thai-font">Success Rate: Change Password (%)</label>
                      <input 
                        type="number" 
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2"
                        value={settings.change_password_rate}
                        onChange={e => updateSetting("change_password_rate", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-neutral-400 thai-font">Success Rate: Delete E-mail (%)</label>
                      <input 
                        type="number" 
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2"
                        value={settings.delete_email_rate}
                        onChange={e => updateSetting("delete_email_rate", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-neutral-400 thai-font">Success Rate: Recover Key (%)</label>
                      <input 
                        type="number" 
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2"
                        value={settings.recover_key_rate}
                        onChange={e => updateSetting("recover_key_rate", e.target.value)}
                      />
                    </div>
                  </div>
                </section>
              )}

              {adminSubTab === "orders" && (
                <div className="glass p-6 rounded-2xl space-y-6">
                  <h3 className="text-xl font-bold thai-font">จัดการออเดอร์ทั้งหมด</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-neutral-500 text-xs uppercase thai-font">
                          <th className="py-4 px-2">ID</th>
                          <th className="py-4 px-2">ผู้ใช้</th>
                          <th className="py-4 px-2">สินค้า</th>
                          <th className="py-4 px-2">ราคา</th>
                          <th className="py-4 px-2">สถานะ</th>
                          <th className="py-4 px-2 text-right">การจัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {adminOrders.map(order => (
                          <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                            <td className="py-4 px-2 font-mono text-xs">#{order.id}</td>
                            <td className="py-4 px-2">{order.username}</td>
                            <td className="py-4 px-2">
                              <p className="font-bold">{order.product_name}</p>
                              {order.addons && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {JSON.parse(order.addons).map((a: any, i: number) => (
                                    <span key={i} className="text-[8px] bg-white/5 px-1 rounded border border-white/10 text-neutral-400">+{a.name}</span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-2 font-mono text-emerald-400">{order.total_price.toFixed(2)} P</td>
                            <td className="py-4 px-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                order.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                order.status === 'Failed' ? 'bg-rose-500/20 text-rose-400' :
                                'bg-amber-500/20 text-amber-400'
                              }`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="py-4 px-2 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => updateOrderStatus(order.id, 'Completed')}
                                  className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-all"
                                  title="Mark as Completed"
                                >
                                  <CheckCircle2 size={16} />
                                </button>
                                <button 
                                  onClick={() => updateOrderStatus(order.id, 'Failed')}
                                  className="p-1.5 bg-rose-500/20 text-rose-400 rounded hover:bg-rose-500/30 transition-all"
                                  title="Mark as Failed"
                                >
                                  <XCircle size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {adminSubTab === "settings" && (
                <section className="glass p-6 rounded-2xl">
                  <h2 className="text-xl font-bold mb-6 thai-font">ตั้งค่าระบบ</h2>
                  <div className="space-y-6">
                    <AdminInput 
                      label="Facebook URL (สำหรับสั่งซื้อสินค้า)" 
                      value={settings.facebook_url} 
                      onChange={v => updateSetting("facebook_url", v)} 
                    />
                    <div className="border-t border-white/5 pt-6">
                      <h3 className="text-sm font-bold text-sky-400 mb-4 thai-font flex items-center gap-2">
                        <Bot size={18} /> Discord Webhook Notifications
                      </h3>
                      <div className="space-y-4">
                        <AdminInput 
                          label="Webhook: เช็คไอดี (Game IDs)" 
                          placeholder="https://discord.com/api/webhooks/..."
                          value={settings.webhook_check_id || ""} 
                          onChange={v => updateSetting("webhook_check_id", v)} 
                        />
                        <AdminInput 
                          label="Webhook: Auto Crop Kaitun" 
                          placeholder="https://discord.com/api/webhooks/..."
                          value={settings.webhook_kaitun || ""} 
                          onChange={v => updateSetting("webhook_kaitun", v)} 
                        />
                        <AdminInput 
                          label="Webhook: ID Service" 
                          placeholder="https://discord.com/api/webhooks/..."
                          value={settings.webhook_id_service || ""} 
                          onChange={v => updateSetting("webhook_id_service", v)} 
                        />
                        <AdminInput 
                          label="Webhook: Upgrade" 
                          placeholder="https://discord.com/api/webhooks/..."
                          value={settings.webhook_upgrade || ""} 
                          onChange={v => updateSetting("webhook_upgrade", v)} 
                        />
                        <AdminInput 
                          label="Webhook: Add-on" 
                          placeholder="https://discord.com/api/webhooks/..."
                          value={settings.webhook_addon || ""} 
                          onChange={v => updateSetting("webhook_addon", v)} 
                        />
                      </div>
                    </div>
                    <div className="border-t border-white/5 pt-6">
                      <h3 className="text-sm font-bold text-sky-400 mb-4 thai-font flex items-center gap-2">
                        <ImageIcon size={18} /> App Branding
                      </h3>
                      <div className="space-y-4">
                        <AdminInput 
                          label="App Logo URL" 
                          placeholder="https://..."
                          value={settings.app_logo || ""} 
                          onChange={v => updateSetting("app_logo", v)} 
                        />
                        <AdminInput 
                          label="Bot Logo URL" 
                          placeholder="https://..."
                          value={settings.bot_logo || ""} 
                          onChange={v => updateSetting("bot_logo", v)} 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-500 mb-2 thai-font">เปลี่ยนธีมแอพ (สีหลัก)</label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="color" 
                          className="w-12 h-12 bg-transparent border-none cursor-pointer"
                          value={settings.theme_color}
                          onChange={e => updateSetting("theme_color", e.target.value)}
                        />
                        <span className="text-sm font-mono uppercase">{settings.theme_color}</span>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {adminSubTab === "chat" && (
                <section className="glass p-6 rounded-2xl">
                  <h2 className="text-xl font-bold mb-6 thai-font flex items-center gap-2">
                    <MessageSquare size={24} className="text-sky-400" /> จัดการข้อมูลแชท
                  </h2>
                  <div className="p-8 bg-white/5 rounded-2xl border border-white/10 text-center space-y-4">
                    <p className="text-neutral-400 thai-font">ล้างข้อมูลประวัติการแชททั้งหมดของบอท (BB BOT)</p>
                    <button 
                      onClick={() => {
                        if (window.confirm("คุณแน่ใจหรือไม่ที่จะล้างข้อมูลแชททั้งหมด?")) {
                          setMessages([]);
                          localStorage.removeItem("bb_chat_messages");
                          alert("ล้างข้อมูลแชทเรียบร้อยแล้ว");
                        }
                      }}
                      className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-bold thai-font transition-all flex items-center gap-2 mx-auto"
                    >
                      <Trash2 size={20} /> ล้างข้อมูลแชททั้งหมด
                    </button>
                  </div>
                </section>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="p-12 text-center border-t border-white/5 mt-auto">
        <p className="text-neutral-600 text-[10px] thai-font tracking-widest uppercase">
          © 2024 <span className="brand-text text-sm">BB-DASH</span>. All rights reserved. <span className="text-sky-500/30">Professional Gaming Tools.</span>
        </p>
      </footer>

      {/* Floating Chat Button */}
      {user && (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4">
          <ChatWindow 
            isOpen={isChatOpen} 
            onClose={() => setIsChatOpen(false)} 
            messages={messages} 
            copyToClipboard={copyToClipboard}
            settings={settings}
          />

          {/* ID Service Confirmation Modal */}
          <AnimatePresence>
            {showConfirmModal && pendingOrder && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="w-full max-w-md glass p-8 rounded-3xl space-y-6 border border-sky-500/30"
                >
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-sky-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle size={32} className="text-sky-400" />
                    </div>
                    <h3 className="text-2xl font-bold thai-font">ยืนยันการทำรายการ</h3>
                    <p className="text-neutral-400 thai-font">กรุณาตรวจสอบรายละเอียดก่อนกดยืนยัน</p>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-6 space-y-4 border border-white/10">
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-400 thai-font">บริการ:</span>
                      <span className="font-bold text-sky-400 thai-font">{pendingOrder.name}</span>
                    </div>
                    {pendingOrder.sub && (
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-400 thai-font">ประเภท:</span>
                        <span className="font-bold thai-font">{pendingOrder.sub}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-400 thai-font">จำนวนทั้งหมด:</span>
                      <span className="font-bold thai-font">{pendingOrder.ids.length} ไอดี</span>
                    </div>
                    <div className="h-px bg-white/10" />
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-400 thai-font">ค่าบริการรวม:</span>
                      <span className="text-xl font-bold text-emerald-400 font-mono">{pendingOrder.cost.toFixed(2)} P</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => {
                        setShowConfirmModal(false);
                        setPendingOrder(null);
                      }}
                      className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all thai-font"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={startIDService}
                      className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 rounded-xl transition-all thai-font shadow-lg shadow-sky-500/20"
                    >
                      ยืนยัน
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="w-14 h-14 bg-sky-500 text-white rounded-full shadow-lg shadow-sky-500/40 flex items-center justify-center relative"
          >
            <MessageSquare size={24} />
            {messages.some(m => !m.isCompleted) && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full animate-ping" />
            )}
            {messages.some(m => !m.isCompleted) && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-[8px] font-bold">
                !
              </span>
            )}
          </motion.button>
        </div>
      )}
    </div>
  );
}

function IDServiceTab({ 
  input, 
  setInput, 
  onConfirm, 
  isProcessing, 
  progress, 
  showSuccess, 
  setShowSuccess,
  user
}: { 
  input: string, 
  setInput: (v: string) => void, 
  onConfirm: (type: string, sub?: string) => void,
  isProcessing: boolean,
  progress: number,
  showSuccess: boolean,
  setShowSuccess: (v: boolean) => void,
  user: UserProfile
}) {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);

  const services = [
    { 
      id: "get_email", 
      name: "บริการดึงอีเมล (Get E-mail)", 
      desc: "ไอดีร้านเท่านั้น 0.30 Point : ต่อ 1 ไอดี", 
      placeholder: "กรอก recovery", 
      icon: <Mail className="text-sky-400" />,
      color: "from-sky-500/20 to-blue-500/20"
    },
    { 
      id: "change_password", 
      name: "บริการเปลี่ยนรหัส (Change password)", 
      desc: "0.30 Point : ต่อ 1 ไอดี", 
      placeholder: "กรอก user:pass: cookie", 
      icon: <Lock className="text-emerald-400" />,
      color: "from-emerald-500/20 to-teal-500/20"
    },
    { 
      id: "delete_email", 
      name: "บริการลบอีเมล (Delete E-mail)", 
      desc: "ไอดีร้านเท่านั้น 0.30 Point : ต่อ 1 ไอดี", 
      placeholder: "กรอก recovery", 
      icon: <Trash className="text-rose-400" />,
      color: "from-rose-500/20 to-pink-500/20",
      subs: ["ลบอีเมลแบบปกติ", "ลบอีเมลเพื่อคืนช่องเบอร์"]
    },
    { 
      id: "recover_key", 
      name: "บริการกู้กุญแจ (Recover the key) 🔑", 
      desc: "ไอดีร้านเท่านั้น 0.30 Point : ต่อ 1 ไอดี", 
      placeholder: "กรอก recovery", 
      icon: <Key className="text-amber-400" />,
      color: "from-amber-500/20 to-orange-500/20"
    }
  ];

  const currentService = services.find(s => s.id === selectedService);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map(service => (
          <motion.button
            key={service.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setSelectedService(service.id);
              setSelectedSub(null);
            }}
            className={`p-6 rounded-2xl border transition-all text-left relative overflow-hidden group ${selectedService === service.id ? "border-sky-500 bg-sky-500/10" : "border-white/5 bg-white/5 hover:border-white/20"}`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-black/40 rounded-lg">{service.icon}</div>
                <h3 className="font-bold thai-font">{service.name}</h3>
              </div>
              <p className="text-xs text-neutral-400 thai-font">{service.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {selectedService && currentService && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="glass p-6 rounded-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2 thai-font">
                {currentService.icon} {currentService.name}
              </h3>
              <span className="text-xs text-neutral-500 thai-font">สูงสุด 500 ไอดี (1 ไอดี : 1 บรรทัด)</span>
            </div>

            {currentService.subs && (
              <div className="flex gap-2">
                {currentService.subs.map(sub => (
                  <button
                    key={sub}
                    onClick={() => setSelectedSub(sub)}
                    className={`px-4 py-2 rounded-xl text-sm thai-font transition-all ${selectedSub === sub ? "bg-sky-500 text-white" : "bg-white/5 text-neutral-400 hover:bg-white/10"}`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            )}

            <textarea
              className="w-full h-40 bg-black/40 border border-white/10 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-sky-500/50 font-mono text-sm transition-all"
              placeholder={currentService.placeholder}
              value={input}
              onChange={e => setInput(e.target.value)}
            />

            <button
              onClick={() => onConfirm(currentService.name, selectedSub || undefined)}
              disabled={isProcessing || (currentService.subs && !selectedSub)}
              className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 thai-font shadow-lg shadow-sky-500/20"
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
              ยืนยันการทำรายการ
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md text-center space-y-6">
              <div className="relative w-32 h-32 mx-auto">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="60"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-white/10"
                  />
                  <motion.circle
                    cx="64"
                    cy="64"
                    r="60"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray="377"
                    strokeDashoffset={377 - (377 * progress) / 100}
                    className="text-sky-500"
                    transition={{ duration: 0.1 }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold font-mono">{Math.round(progress)}%</span>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold thai-font">กำลังดำเนินการ...</h3>
                <p className="text-neutral-400 text-sm thai-font">กรุณารอสักครู่ ระบบกำลังประมวลผลข้อมูลของคุณ</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md glass p-8 rounded-3xl text-center space-y-6 border border-sky-500/30"
            >
              <div className="w-20 h-20 bg-sky-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={40} className="text-sky-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold thai-font">ทำรายการสำเร็จ</h3>
                <p className="text-neutral-400 thai-font">
                  ได้รับออเดอร์ของคุณ <span className="text-sky-400 font-bold">{user.username}</span> แล้ว<br />
                  ตรวจความเรียบร้อยที่ DM ค่ะ
                </p>
              </div>
              <button
                onClick={() => setShowSuccess(false)}
                className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 rounded-xl transition-all thai-font"
              >
                ตกลง
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChatWindow({ 
  isOpen, 
  onClose, 
  messages,
  copyToClipboard,
  settings
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  messages: ChatMessage[],
  copyToClipboard: (text: string) => void,
  settings: Settings
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.9 }}
          className="fixed bottom-24 right-6 w-96 h-[500px] glass-dark rounded-3xl shadow-2xl z-[90] flex flex-col border border-white/10 overflow-hidden"
        >
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-sky-500/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-sky-500 shadow-lg shadow-sky-500/20">
                <img 
                  src={settings.bot_logo || "https://cdn.discordapp.com/attachments/1464815681420660788/1477969312416534528/file_00000000c4b872088c92127820c322e7-removebg-preview.png?ex=69a6b1af&is=69a5602f&hm=effe26b53b8229830129744632f54f2f869e67e8498c9c64427efe8b6e7c0553&"} 
                  alt="BB BOT" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h3 className="font-bold text-sky-400">BB BOT</h3>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-emerald-500 uppercase font-bold tracking-widest">Online</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all">
              <XCircle size={20} className="text-neutral-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-600 space-y-2">
                <MessageSquare size={40} opacity={0.2} />
                <p className="text-sm thai-font">ยังไม่มีข้อความในขณะนี้</p>
              </div>
            ) : (
              messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden border border-sky-500/50">
                      <img 
                        src="https://cdn.discordapp.com/attachments/1464815681420660788/1477969312416534528/file_00000000c4b872088c92127820c322e7-removebg-preview.png?ex=69a6b1af&is=69a5602f&hm=effe26b53b8229830129744632f54f2f869e67e8498c9c64427efe8b6e7c0553&" 
                        alt="Bot" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-sky-400">BB BOT</span>
                    <span className="text-[8px] text-neutral-600">{msg.timestamp}</span>
                  </div>
                  
                  <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-none space-y-3 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Bot size={40} />
                    </div>
                    
                    <div className="flex items-center gap-2 text-sky-400 font-bold thai-font border-b border-white/5 pb-2">
                      <Zap size={14} /> {msg.serviceName}
                    </div>

                    {!msg.isCompleted ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs thai-font">
                          <span className="text-neutral-400">กำลังดำเนินการ:</span>
                          <span className="text-sky-400 font-mono">{msg.current}/{msg.total}</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-sky-500"
                            animate={{ width: `${(msg.current / msg.total) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] thai-font">
                          <span className="text-neutral-500">ยอดเงินที่หัก:</span>
                          <span className="text-rose-400">-{msg.amount.toFixed(2)} P</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl text-center">
                            <div className="text-[10px] text-emerald-500 thai-font">สำเร็จ</div>
                            <motion.div 
                              initial={{ scale: 0.5 }}
                              animate={{ scale: 1 }}
                              className="text-lg font-bold text-emerald-400 font-mono"
                            >
                              {msg.success}
                            </motion.div>
                          </div>
                          <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl text-center">
                            <div className="text-[10px] text-rose-500 thai-font">ไม่สำเร็จ</div>
                            <motion.div 
                              initial={{ scale: 0.5 }}
                              animate={{ scale: 1 }}
                              className="text-lg font-bold text-rose-400 font-mono"
                            >
                              {msg.failed}
                            </motion.div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl">
                            <span className="text-[10px] text-neutral-400 thai-font">Success Rate:</span>
                            <span className="text-xs font-bold text-sky-400 font-mono">
                              {((msg.success! / msg.total) * 100).toFixed(1)}%
                            </span>
                          </div>
                          {msg.refundAmount && msg.refundAmount > 0 && (
                            <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/10 p-2 rounded-xl">
                              <span className="text-[10px] text-emerald-500 thai-font">คืนเงินทั้งหมด:</span>
                              <span className="text-xs font-bold text-emerald-400 font-mono">+{msg.refundAmount.toFixed(2)} P</span>
                            </div>
                          )}
                        </div>
                        {msg.failedIds && msg.failedIds.length > 0 && (
                          <button 
                            onClick={() => copyToClipboard(msg.failedIds!.join("\n"))}
                            className="w-full py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-[10px] rounded-xl thai-font transition-all flex items-center justify-center gap-2"
                          >
                            <Copy size={12} /> คัดลอกไอดีที่ไม่สำเร็จ
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AdminTabBtn({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm thai-font transition-all relative overflow-hidden ${active ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" : "text-neutral-400 hover:text-white hover:bg-white/5"}`}
    >
      {active && <motion.div layoutId="adminTab" className="absolute inset-0 bg-sky-500 -z-10" />}
      {label}
    </button>
  );
}

function MenuBtn({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all thai-font group ${active ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" : "text-neutral-400 hover:text-white hover:bg-white/5"}`}
    >
      <span className={`transition-transform duration-300 ${active ? "scale-110" : "group-hover:scale-110"}`}>{icon}</span>
      <span className="font-medium">{label}</span>
      {active && <ChevronRight size={16} className="ml-auto" />}
    </button>
  );
}

function UpgradeTab({ 
  products, 
  user, 
  onOrderSuccess 
}: { 
  products: Product[], 
  user: UserProfile,
  onOrderSuccess: () => void
}) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreements, setAgreements] = useState({ terms: false, noRefund: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const UPGRADE_PRODUCTS = products.filter(p => p.category === 'upgrade' || !p.category);
  const ADDONS_LIST = products.filter(p => p.category === 'addon');

  const totalPrice = (selectedProduct?.price || 0) + selectedAddons.reduce((sum, a) => sum + a.price, 0);

  const handleConfirm = async () => {
    if (!selectedProduct || !agreements.terms || !agreements.noRefund) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user.username,
          productName: selectedProduct.name,
          addons: selectedAddons.map(a => ({ name: a.name, price: a.price })),
          totalPrice
        })
      });
      const data = await res.json();
      if (data.success) {
        onOrderSuccess();
      } else {
        alert(data.error || "Order failed");
      }
    } catch (e) {
      alert("Connection error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-display font-bold neon-text thai-font">Upgrade & Add-on</h2>
        <p className="text-neutral-400 thai-font mt-2">อัปเกรดไอดีของคุณด้วยบริการเสริมพิเศษ</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Step 1: Select Product */}
        <div className="glass p-6 rounded-2xl space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2 thai-font">
            <ShoppingCart className="text-sky-400" /> (1) เลือกรายการสินค้า
          </h3>
          <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
            {UPGRADE_PRODUCTS.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                className={`p-4 rounded-xl border transition-all flex items-center gap-4 text-left ${selectedProduct?.id === p.id ? "bg-sky-500/10 border-sky-500 shadow-lg shadow-sky-500/10" : "bg-white/5 border-white/10 hover:border-white/20"}`}
              >
                <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded-lg object-cover" referrerPolicy="no-referrer" />
                <div className="flex-1">
                  <p className="font-bold text-sm thai-font">{p.name}</p>
                  <p className="text-sky-400 font-mono text-xs">{p.price.toFixed(2)} P</p>
                </div>
                {selectedProduct?.id === p.id && <CheckCircle2 size={20} className="text-sky-500" />}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Select Add-ons */}
        <div className="glass p-6 rounded-2xl space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2 thai-font">
            <Plus className="text-sky-400" /> (2) Add on
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
            {ADDONS_LIST.map(addon => {
              const isSelected = selectedAddons.some(a => a.id === addon.id);
              return (
                <button
                  key={addon.id}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedAddons(selectedAddons.filter(a => a.id !== addon.id));
                    } else {
                      setSelectedAddons([...selectedAddons, addon]);
                    }
                  }}
                  className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-2 text-center relative ${isSelected ? "bg-sky-500/10 border-sky-500 shadow-lg shadow-sky-500/10" : "bg-white/5 border-white/10 hover:border-white/20"}`}
                >
                  <img src={addon.image_url} alt={addon.name} className="w-10 h-10 rounded-lg object-contain" referrerPolicy="no-referrer" />
                  <div>
                    <p className="font-bold text-[10px] thai-font">{addon.name}</p>
                    <p className="text-sky-400 font-mono text-[10px]">{addon.price.toFixed(2)} P</p>
                  </div>
                  {isSelected && (
                    <div className="absolute top-1 right-1">
                      <CheckCircle2 size={14} className="text-sky-500" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary Bar */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="glass p-6 rounded-2xl border-sky-500/30 flex flex-col md:flex-row items-center justify-between gap-6"
      >
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-[10px] text-neutral-500 uppercase thai-font">สินค้าที่เลือก</p>
            <p className="font-bold text-sky-400 thai-font">{selectedProduct?.name || "ยังไม่ได้เลือก"}</p>
          </div>
          <div>
            <p className="text-[10px] text-neutral-500 uppercase thai-font">Add-ons</p>
            <p className="font-bold text-sky-400 thai-font">{selectedAddons.length} รายการ</p>
          </div>
          <div>
            <p className="text-[10px] text-neutral-500 uppercase thai-font">ราคารวมทั้งหมด</p>
            <p className="text-2xl font-bold text-emerald-400 font-mono">{totalPrice.toFixed(2)} P</p>
          </div>
        </div>
        <button
          disabled={!selectedProduct}
          onClick={() => setShowConfirm(true)}
          className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg shadow-sky-500/20 thai-font"
        >
          Confirm Order
        </button>
      </motion.div>

      {/* Upgrade Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg glass p-8 rounded-3xl space-y-6 border border-sky-500/30"
            >
              <h3 className="text-2xl font-bold thai-font text-center">ยืนยันการสั่งซื้อ</h3>
              
              <div className="space-y-4 bg-white/5 p-6 rounded-2xl border border-white/10">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-400 thai-font">ราคาไอดีที่เลือก ({selectedProduct.name}):</span>
                  <span className="font-mono text-sky-400">{selectedProduct.price.toFixed(2)} P</span>
                </div>
                
                {selectedAddons.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-neutral-500 thai-font">รายการ Add-ons:</p>
                    {selectedAddons.map(a => (
                      <div key={a.id} className="flex justify-between items-center text-xs pl-4">
                        <span className="text-neutral-300 thai-font">- {a.name}</span>
                        <span className="font-mono text-sky-400">{a.price.toFixed(2)} P</span>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="h-px bg-white/10 my-2" />
                
                <div className="flex justify-between items-center">
                  <span className="font-bold thai-font">ราคารวมทั้งหมด:</span>
                  <span className="text-2xl font-bold text-emerald-400 font-mono">{totalPrice.toFixed(2)} P</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded border-white/10 bg-white/5 checked:bg-sky-500 transition-all"
                    checked={agreements.terms}
                    onChange={e => setAgreements({ ...agreements, terms: e.target.checked })}
                  />
                  <span className="text-sm text-neutral-400 group-hover:text-white transition-all thai-font">ยินยอมที่จะแอดออนและอัพเกรดไอดีดังนี้</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded border-white/10 bg-white/5 checked:bg-sky-500 transition-all"
                    checked={agreements.noRefund}
                    onChange={e => setAgreements({ ...agreements, noRefund: e.target.checked })}
                  />
                  <span className="text-sm text-neutral-400 group-hover:text-white transition-all thai-font">ยินยอมว่ายอมรับข้อตกลงและไม่มีการคืนเงินภายหลัง</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all thai-font"
                >
                  ยกเลิก
                </button>
                <button
                  disabled={!agreements.terms || !agreements.noRefund || isSubmitting}
                  onClick={handleConfirm}
                  className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-sky-500/20 thai-font flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                  ยืนยันการทำรายการ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileTab({ 
  user, 
  onLogout, 
  onUpdateUsername,
  refreshTrigger
}: { 
  user: UserProfile, 
  onLogout: () => void,
  onUpdateUsername: (newName: string) => Promise<void>,
  refreshTrigger: number
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(user.username);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`/api/orders/${user.username}`);
      const data = await res.json();
      setOrders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user.username, refreshTrigger]);

  const handleUpdateName = async () => {
    if (newName === user.username) {
      setIsEditing(false);
      return;
    }
    await onUpdateUsername(newName);
    setIsEditing(false);
  };

  return (
    <div className="space-y-8">
      <div className="glass p-8 rounded-3xl border-sky-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <User size={120} />
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="w-24 h-24 bg-sky-500 rounded-full flex items-center justify-center shadow-lg shadow-sky-500/20">
            <User size={48} className="text-white" />
          </div>
          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-3">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input 
                    type="text"
                    className="bg-black/40 border border-white/10 rounded-lg px-3 py-1 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    autoFocus
                  />
                  <button onClick={handleUpdateName} className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-all">
                    <CheckCircle2 size={20} />
                  </button>
                  <button onClick={() => { setIsEditing(false); setNewName(user.username); }} className="p-2 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/30 transition-all">
                    <XCircle size={20} />
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-3xl font-bold">{user.username}</h2>
                  <button onClick={() => setIsEditing(true)} className="p-2 text-neutral-500 hover:text-white transition-all">
                    <Plus size={16} />
                  </button>
                </>
              )}
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${user.role === "admin" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-sky-500/20 text-sky-400 border border-sky-500/30"}`}>
                {user.role}
              </span>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-4 text-neutral-400">
              <div className="flex items-center gap-1">
                <Coins size={16} className="text-sky-400" />
                <span className="font-bold text-sky-400">{user.points.toFixed(2)} <span className="text-[10px] thai-font">Point</span></span>
              </div>
              <div className="w-1 h-1 bg-neutral-700 rounded-full" />
              <span className="text-sm thai-font">สมาชิกของ BB-DASH</span>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="px-6 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-all flex items-center gap-2 thai-font border border-rose-500/20"
          >
            <LogOut size={18} /> ออกจากระบบ
          </button>
        </div>
      </div>

      <div className="glass p-8 rounded-3xl space-y-6">
        <h3 className="text-xl font-bold flex items-center gap-2 thai-font">
          <History className="text-sky-400" /> ประวัติการสั่งออเดอร์
        </h3>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-sky-500" size={32} />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-neutral-500 space-y-2">
            <Clock size={48} className="mx-auto opacity-20" />
            <p className="thai-font">ยังไม่มีประวัติการสั่งซื้อ</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {orders.map(order => (
              <div key={order.id} className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col md:flex-row justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sky-400 font-bold thai-font">{order.product_name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      order.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' :
                      order.status === 'Failed' ? 'bg-rose-500/20 text-rose-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {order.status === 'Pending' ? 'รอดำเนินการ' : order.status}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-500 thai-font">
                    {order.status === 'Pending' && <span className="flex items-center gap-1"><Clock size={12} /> รอดำเนินการ 15 - 1 ชั่วโมง</span>}
                    <p className="mt-1">วันที่สั่ง: {new Date(order.created_at).toLocaleString('th-TH')}</p>
                  </div>
                  {order.addons && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {JSON.parse(order.addons).map((a: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded border border-white/10 text-neutral-400">
                          {a.image_url && <img src={a.image_url} className="w-4 h-4 rounded object-cover" referrerPolicy="no-referrer" />}
                          <span className="text-[10px]">
                            {a.username ? `${a.username}: ${a.details}` : `+ ${a.name}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right flex flex-col justify-center">
                  <p className="text-xl font-bold text-emerald-400 font-mono">{order.total_price.toFixed(2)} P</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NavBtn({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all thai-font group relative overflow-hidden ${active ? "bg-sky-500/10 text-sky-400 font-bold" : "text-neutral-400 hover:text-white hover:bg-white/5"}`}
    >
      <span className={`transition-transform duration-300 ${active ? "scale-110" : "group-hover:scale-110"}`}>{icon}</span>
      <span className="relative z-10">{label}</span>
    </button>
  );
}

function DetailItem({ label, value, isMono }: { label: string, value: string | number, isMono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1 thai-font">{label}</p>
      <p className={`text-sm font-medium ${isMono ? "font-mono text-sky-400" : ""}`}>{value || "-"}</p>
    </div>
  );
}

function AdminInput({ label, value, onChange, type = "text", placeholder }: { label: string, value: string, onChange: (v: string) => void, type?: string, placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs text-neutral-500 mb-1 thai-font">{label}</label>
      <input 
        type={type}
        placeholder={placeholder}
        className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-500"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}
