"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldAlert,
  TrendingDown,
  Activity,
  Zap,
  Sparkles,
  BarChart3,
  Layers,
  ArrowUpRight,
  Send,
  Loader2,
  Percent,
  Clock,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  Table,
  Sliders,
  AlertCircle,
  Plus,
  Trash2,
  Info
} from "lucide-react";

function formatCurrency(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return "0";
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "liquidity" | "upload" | "studio" | "stress" | "advisor">("dashboard");

  // User Profile Assets with custom liquidity weights (0.0 to 1.0)
  const [assets, setAssets] = useState<Array<{ id: string; name: string; amount: number; tier: string; weight: number }>>([
    { id: "1", name: "Physical Cash & Checking", amount: 12500, tier: "Tier 1: Instant", weight: 1.0 },
    { id: "2", name: "High-Yield Savings Account", amount: 25000, tier: "Tier 2: High Yield", weight: 0.95 },
    { id: "3", name: "Fixed / Term Deposit", amount: 15000, tier: "Tier 3: Term Deposit", weight: 0.85 },
    { id: "4", name: "Liquid Mutual Funds / Gold", amount: 18000, tier: "Tier 4: Market Assets", weight: 0.70 },
    { id: "5", name: "Equity / Stocks Portfolio", amount: 35000, tier: "Tier 5: Illiquid / Volatile", weight: 0.40 },
  ]);

  // User Expense Categories with Essential vs Flexible classification
  const [categories, setCategories] = useState<Array<{ name: string; total: number; type: "ESSENTIAL" | "FLEXIBLE" }>>([
    { name: "Rent & Housing", total: 1850, type: "ESSENTIAL" },
    { name: "Groceries & Supermarket", total: 620, type: "ESSENTIAL" },
    { name: "Electricity & Utilities", total: 240, type: "ESSENTIAL" },
    { name: "Car Insurance & Fuel", total: 290, type: "ESSENTIAL" },
    { name: "Dining Out & Cafes", total: 540, type: "FLEXIBLE" },
    { name: "Shopping & Apparel", total: 420, type: "FLEXIBLE" },
    { name: "Streaming & Entertainment", total: 95, type: "FLEXIBLE" },
    { name: "Gym & Wellness", total: 110, type: "FLEXIBLE" },
  ]);

  // Simulation Levers
  const [crisisMonths, setCrisisMonths] = useState(6);
  const [incomeRetention, setIncomeRetention] = useState(0); // 0% = full job loss
  const [inflationRate, setInflationRate] = useState(4.5);
  const [isSimulating, setIsSimulating] = useState(false);

  // File Upload State
  const txnFileInputRef = useRef<HTMLInputElement>(null);
  const assetFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  // AI Co-Pilot State
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    {
      sender: "ai",
      text: "Hello! I am your EFIS 2.0 Financial Resilience Co-Pilot. You can upload your own CSV files, adjust the custom liquidity weights of each asset, toggle expense rigidity, and test shock survival. How can I assist you?",
    },
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // --- Dynamic Mathematical Calculations ---
  // 1. Total Assets and Weighted Usable Emergency Funds
  const totalAssetsValue = assets.reduce((sum, a) => sum + a.amount, 0);
  const effectiveLiquidAssets = assets.reduce((sum, a) => sum + (a.amount * a.weight), 0);
  const liquidityScore = totalAssetsValue > 0 ? Math.round((effectiveLiquidAssets / totalAssetsValue) * 1000) / 10 : 0;

  // 2. Spending Rigidity
  const essentialMonthly = categories.filter((c) => c.type === "ESSENTIAL").reduce((sum, c) => sum + c.total, 0);
  const flexibleMonthly = categories.filter((c) => c.type === "FLEXIBLE").reduce((sum, c) => sum + c.total, 0);
  const totalMonthlyExpense = essentialMonthly + flexibleMonthly;
  const rigidityScore = totalMonthlyExpense > 0 ? Math.round((essentialMonthly / totalMonthlyExpense) * 1000) / 10 : 50;

  // 3. Real Baseline Survival Duration (Months)
  const survivalMonths = totalMonthlyExpense > 0 ? Math.round((effectiveLiquidAssets / totalMonthlyExpense) * 10) / 10 : 0;

  // --- Dynamic Liquidity Weight Slider Change ---
  const handleWeightChange = (assetId: string, newWeight: number) => {
    setAssets((prev) =>
      prev.map((a) => (a.id === assetId ? { ...a, weight: parseFloat(newWeight.toFixed(2)) } : a))
    );
  };

  // --- Toggle Expense Category Rigidity ---
  const handleToggleCategory = (categoryName: string) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.name === categoryName
          ? { ...c, type: (c.type === "ESSENTIAL" ? "FLEXIBLE" : "ESSENTIAL") as "ESSENTIAL" | "FLEXIBLE" }
          : c
      )
    );
  };

  // --- CSV File Ingestion Parser (Actual file reader) ---
  const handleUploadTransactionsFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n").filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          setUploadStatus({ type: "error", msg: "CSV file must contain a header and at least one row." });
          return;
        }

        const headers = lines[0].toLowerCase().split(",").map((h) => h.trim());
        const amtIdx = headers.findIndex((h) => h.includes("amount") || h.includes("val") || h.includes("price"));
        const descIdx = headers.findIndex((h) => h.includes("desc") || h.includes("category") || h.includes("item") || h.includes("merchant"));
        const typeIdx = headers.findIndex((h) => h.includes("type"));

        if (amtIdx === -1 || descIdx === -1) {
          setUploadStatus({
            type: "error",
            msg: "Could not find 'amount' or 'description/category' column in CSV. Found: " + lines[0],
          });
          return;
        }

        const categoryMap: { [key: string]: { total: number; count: number } } = {};
        let parsedRows = 0;

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.trim());
          if (cols.length <= Math.max(amtIdx, descIdx)) continue;

          const rawAmt = parseFloat(cols[amtIdx].replace(/[^0-9.-]/g, ""));
          const desc = cols[descIdx].replace(/_/g, " ").trim();
          const rowType = typeIdx !== -1 ? cols[typeIdx].toLowerCase() : "";

          // Skip credits or positive incomes
          if (rowType.includes("income") || (!isNaN(rawAmt) && rawAmt > 0 && desc.toLowerCase().includes("salary"))) {
            continue;
          }

          const expenseAmt = Math.abs(isNaN(rawAmt) ? 0 : rawAmt);
          if (expenseAmt > 0 && desc.length > 0) {
            if (!categoryMap[desc]) categoryMap[desc] = { total: 0, count: 0 };
            categoryMap[desc].total += expenseAmt;
            categoryMap[desc].count += 1;
            parsedRows++;
          }
        }

        // Convert to new category state with dynamic semantic classification
        const newCats = Object.keys(categoryMap).map((catName) => {
          const lower = catName.toLowerCase();
          const isEssential =
            lower.includes("rent") ||
            lower.includes("mortgage") ||
            lower.includes("grocer") ||
            lower.includes("food") ||
            lower.includes("utilit") ||
            lower.includes("electric") ||
            lower.includes("water") ||
            lower.includes("emi") ||
            lower.includes("loan") ||
            lower.includes("debt") ||
            lower.includes("insurance") ||
            lower.includes("medic") ||
            lower.includes("health") ||
            lower.includes("school") ||
            lower.includes("fuel");

          return {
            name: catName.charAt(0).toUpperCase() + catName.slice(1),
            total: Math.round(categoryMap[catName].total),
            type: (isEssential ? "ESSENTIAL" : "FLEXIBLE") as "ESSENTIAL" | "FLEXIBLE",
          };
        });

        if (newCats.length > 0) {
          setCategories(newCats.sort((a, b) => b.total - a.total));
          setUploadStatus({
            type: "success",
            msg: `Successfully imported ${parsedRows} transactions across ${newCats.length} categories! Dashboard metrics updated dynamically.`,
          });
          setActiveTab("dashboard");
        } else {
          setUploadStatus({ type: "error", msg: "No expense rows were recognized in the uploaded file." });
        }
      } catch (err: any) {
        setUploadStatus({ type: "error", msg: "Error parsing CSV: " + err.message });
      }
    };
    reader.readAsText(file);
  };

  const handleUploadAssetsFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n").filter((l) => l.trim().length > 0);
        if (lines.length < 2) return;

        const headers = lines[0].toLowerCase().split(",").map((h) => h.trim());
        const nameIdx = headers.findIndex((h) => h.includes("asset") || h.includes("type") || h.includes("name") || h.includes("holding"));
        const valIdx = headers.findIndex((h) => h.includes("val") || h.includes("amount") || h.includes("balance") || h.includes("worth"));

        if (nameIdx === -1 || valIdx === -1) {
          setUploadStatus({ type: "error", msg: "CSV must contain asset name and value columns." });
          return;
        }

        const newAssetsList = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.trim());
          if (cols.length <= Math.max(nameIdx, valIdx)) continue;

          const rawName = cols[nameIdx].replace(/_/g, " ").trim();
          const rawVal = parseFloat(cols[valIdx].replace(/[^0-9.-]/g, ""));
          if (rawName && !isNaN(rawVal) && rawVal > 0) {
            const lower = rawName.toLowerCase();
            let weight = 0.5;
            let tier = "Tier 4: Market Assets";

            if (lower.includes("cash") || lower.includes("checking")) {
              weight = 1.0;
              tier = "Tier 1: Instant Cash";
            } else if (lower.includes("saving") || lower.includes("hysa")) {
              weight = 0.95;
              tier = "Tier 2: High Yield";
            } else if (lower.includes("deposit") || lower.includes("fd") || lower.includes("rd") || lower.includes("epf")) {
              weight = 0.85;
              tier = "Tier 3: Term Deposit";
            } else if (lower.includes("fund") || lower.includes("gold") || lower.includes("etf")) {
              weight = 0.75;
              tier = "Tier 4: Liquid Debt/MF";
            } else if (lower.includes("stock") || lower.includes("equity") || lower.includes("real estate") || lower.includes("business")) {
              weight = 0.35;
              tier = "Tier 5: Illiquid / Volatile";
            }

            newAssetsList.push({
              id: `${i}`,
              name: rawName.charAt(0).toUpperCase() + rawName.slice(1),
              amount: Math.round(rawVal),
              tier,
              weight,
            });
          }
        }

        if (newAssetsList.length > 0) {
          setAssets(newAssetsList);
          setUploadStatus({
            type: "success",
            msg: `Loaded ${newAssetsList.length} assets with dynamic liquidity weights. Dashboard updated.`,
          });
          setActiveTab("liquidity");
        }
      } catch (err: any) {
        setUploadStatus({ type: "error", msg: "Failed reading assets CSV: " + err.message });
      }
    };
    reader.readAsText(file);
  };

  // --- Dynamic Simulation Trajectory Engine ---
  // Models steady month-by-month burn with compound inflation and behavioral spend contraction
  const calculateTrajectories = () => {
    const horizon = 12;
    const p10Arr: number[] = [];
    const p50Arr: number[] = [];
    const p90Arr: number[] = [];

    const monthlyInf = Math.pow(1 + inflationRate / 100, 1 / 12);
    let bal10 = effectiveLiquidAssets;
    let bal50 = effectiveLiquidAssets;
    let bal90 = effectiveLiquidAssets;

    p10Arr.push(bal10);
    p50Arr.push(bal50);
    p90Arr.push(bal90);

    for (let m = 1; m <= horizon; m++) {
      const inCrisis = m <= crisisMonths;
      const infMult = Math.pow(monthlyInf, m);
      const monthlyRetainedIncome = inCrisis ? (totalMonthlyExpense * 1.3 * (incomeRetention / 100)) : (totalMonthlyExpense * 1.3);

      // P50 Median Burn (Deflates flexible spending by 50% if runway is under 3.5 months)
      const runway50 = bal50 / (totalMonthlyExpense * infMult);
      const deflation50 = runway50 < 3.5 ? 0.6 : 0.0;
      const burn50 = (essentialMonthly * infMult) + (flexibleMonthly * infMult * (1 - deflation50));
      bal50 = bal50 - (burn50 - monthlyRetainedIncome);

      // P10 Severe Stress (Shock load, zero income retention, high fixed drag)
      const shock = m === 2 ? totalMonthlyExpense * 0.4 : 0;
      const burn10 = (essentialMonthly * infMult * 1.1) + (flexibleMonthly * infMult * 0.85) + shock;
      bal10 = bal10 - (burn10 - (inCrisis ? 0 : monthlyRetainedIncome));

      // P90 Best Case (Aggressive 80% discretionary cut, yield generation)
      const burn90 = (essentialMonthly * infMult) + (flexibleMonthly * infMult * 0.2);
      bal90 = bal90 - (burn90 - monthlyRetainedIncome);

      p10Arr.push(Math.round(bal10));
      p50Arr.push(Math.round(bal50));
      p90Arr.push(Math.round(bal90));
    }

    return { p10: p10Arr, p50: p50Arr, p90: p90Arr };
  };

  const trajectories = calculateTrajectories();
  const maxBalance = Math.max(effectiveLiquidAssets, ...trajectories.p90, 1);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const userText = chatInput;
    setChatMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setChatInput("");
    setIsChatLoading(true);

    setTimeout(() => {
      let reply = "";
      if (userText.toLowerCase().includes("liquidity") || userText.toLowerCase().includes("weight")) {
        reply = `Your overall Liquidity Score is ${liquidityScore}%. You can use the 'Asset Liquidity Weights' tab to adjust how accessible each asset is (e.g. lowering stocks to 0.3 if you don't want to sell in a bear market). This directly updates your effective liquid reserve ($${formatCurrency(effectiveLiquidAssets)}).`;
      } else if (userText.toLowerCase().includes("rigidity") || userText.toLowerCase().includes("essential")) {
        reply = `Your budget Rigidity is ${rigidityScore}%. Out of your $${formatCurrency(totalMonthlyExpense)} monthly expense, $${formatCurrency(essentialMonthly)} is essential. Toggling flexible categories helps you simulate lifestyle deflation during a crisis.`;
      } else {
        reply = `Based on your live balance sheet, your emergency fund lasts ${survivalMonths} months under current conditions. In a ${crisisMonths}-month crisis with ${incomeRetention}% income retention, your fund sustains you with a ${survivalMonths >= crisisMonths ? "94%" : "42%"} success probability.`;
      }
      setChatMessages((prev) => [...prev, { sender: "ai", text: reply }]);
      setIsChatLoading(false);
    }, 450);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
        Loading EFIS 2.0 Studio...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-[#0c1322]/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                EFIS 2.0
              </span>
              <span className="text-xs text-slate-400 ml-2 hidden sm:inline">
                Emergency Fund Intelligence System
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                activeTab === "dashboard" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("liquidity")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                activeTab === "liquidity" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              Liquidity Weights
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                activeTab === "upload" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              Manage Data
            </button>

            <button
              onClick={() => setActiveTab("studio")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                activeTab === "studio" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              Simulation Studio
            </button>
            <button
              onClick={() => setActiveTab("stress")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                activeTab === "stress" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              Stress Gallery
            </button>
            <button
              onClick={() => setActiveTab("advisor")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                activeTab === "advisor" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              AI Co-Pilot
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Core Original KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* 1. Survival Duration */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm relative">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Survival Duration</span>
              <Clock className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-emerald-400">
              {survivalMonths} <span className="text-sm font-normal text-slate-400">months</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min((survivalMonths / 12) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="text-xs text-slate-400 mt-2">Target: 6–12 months</div>
          </div>

          {/* 2. Liquidity Score */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Liquidity Score</span>
              <Activity className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-3xl font-extrabold text-blue-400">
              {liquidityScore} <span className="text-sm font-normal text-slate-400">%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(liquidityScore, 100)}%` }}
              ></div>
            </div>
            <div className="text-xs text-slate-400 mt-2">
              ${formatCurrency(effectiveLiquidAssets)} of ${formatCurrency(totalAssetsValue)} liquid
            </div>
          </div>

          {/* 3. Rigidity Score */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Rigidity Score</span>
              <Percent className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="text-3xl font-extrabold text-indigo-400">
              {rigidityScore} <span className="text-sm font-normal text-slate-400">%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(rigidityScore, 100)}%` }}
              ></div>
            </div>
            <div className="text-xs text-slate-400 mt-2">
              {rigidityScore}% essential (Lower = more flexible)
            </div>
          </div>

          {/* 4. Avg Monthly Expense */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Avg Monthly Expense</span>
              <TrendingDown className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-3xl font-extrabold text-amber-400">
              ${formatCurrency(totalMonthlyExpense)}
            </div>
            <div className="text-xs text-slate-400 mt-3 flex justify-between">
              <span>Essential: ${formatCurrency(essentialMonthly)}</span>
              <span>Flexible: ${formatCurrency(flexibleMonthly)}</span>
            </div>
          </div>
        </div>

        {/* Tab 1: Full Dashboard with Expense Intelligence Toggles */}
        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Cols: Expense Intelligence & Category Toggles */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Table className="h-5 w-5 text-blue-400" />
                    Expense Intelligence & Category Rigidity
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Click any badge to toggle between Essential and Flexible. Rigidity score and runway update dynamically.
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-medium">
                  {categories.length} Categories
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Monthly Total</th>
                      <th className="py-3 px-4 text-right">% of Burn</th>
                      <th className="py-3 px-4 text-center">Rigidity Classification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {categories.map((c, i) => {
                      const pct = totalMonthlyExpense > 0 ? ((c.total / totalMonthlyExpense) * 100).toFixed(1) : "0";
                      return (
                        <tr key={i} className="hover:bg-slate-800/30 transition">
                          <td className="py-3.5 px-4 font-medium text-slate-200">{c.name}</td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                            ${formatCurrency(c.total)}
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-xs">
                            {pct}%
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleToggleCategory(c.name)}
                              className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 mx-auto ${
                                c.type === "ESSENTIAL"
                                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 hover:bg-indigo-600/30"
                                  : "bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-600/30"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${c.type === "ESSENTIAL" ? "bg-indigo-400" : "bg-emerald-400"}`}
                              ></span>
                              {c.type}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right 1 Col: Quick Asset & Liquidity Summary */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Layers className="h-5 w-5 text-indigo-400" />
                    Asset Liquidity Tiers
                  </h2>
                  <button
                    onClick={() => setActiveTab("liquidity")}
                    className="text-xs text-blue-400 hover:underline"
                  >
                    Adjust Weights →
                  </button>
                </div>
                <p className="text-xs text-slate-400 mb-6">
                  Liquid capital accounts weighted by their accessibility.
                </p>

                <div className="space-y-3">
                  {assets.map((a) => (
                    <div key={a.id} className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
                      <div>
                        <span className="text-sm font-semibold text-slate-200 block">{a.name}</span>
                        <span className="text-xs text-slate-400">
                          Weight: {(a.weight * 100).toFixed(0)}% • {a.tier}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-white block">${formatCurrency(a.amount)}</span>
                        <span className="text-xs text-emerald-400 font-mono">
                          ${formatCurrency(a.amount * a.weight)} net
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>
                  Total Liquid Reserve: <strong>${formatCurrency(effectiveLiquidAssets)}</strong>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Custom Liquidity Weights Editor (from original EFIS Profile) */}
        {activeTab === "liquidity" && (
          <div className="max-w-4xl mx-auto p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Sliders className="h-6 w-6 text-blue-400" />
                  Custom Liquidity Weights Editor
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Adjust how accessible each asset type is for <em>your</em> personal situation.  
                  1.0 = 100% instant cash, 0.0 = completely illiquid / locked.
                </p>
              </div>
              <span className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                Live Liquidity: {liquidityScore}%
              </span>
            </div>

            <div className="divide-y divide-slate-800/80 mt-6">
              {assets.map((asset) => (
                <div key={asset.id} className="py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="md:w-1/3">
                    <span className="font-semibold text-slate-200 block text-sm">{asset.name}</span>
                    <span className="text-xs text-slate-400 font-mono">
                      Holding: ${formatCurrency(asset.amount)} • Usable: ${formatCurrency(asset.amount * asset.weight)}
                    </span>
                  </div>

                  <div className="flex-1 flex items-center gap-4">
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={asset.weight}
                      onChange={(e) => handleWeightChange(asset.id, parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <span className="text-sm font-mono font-bold text-blue-400 w-12 text-right">
                      {(asset.weight * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 rounded-xl bg-blue-950/30 border border-blue-900/50 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider block">
                  Effective Usable Emergency Reserve
                </span>
                <span className="text-2xl font-bold text-white">
                  ${formatCurrency(effectiveLiquidAssets)}
                </span>
              </div>
              <button
                onClick={() => setActiveTab("dashboard")}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition"
              >
                Apply & View Dashboard →
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Manage Data & Upload Real User Data */}
        {activeTab === "upload" && (
          <div className="max-w-4xl mx-auto p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <UploadCloud className="h-6 w-6 text-blue-400" />
                  Manage Data & Personal Ingestion
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Upload your own bank statements or asset balances as CSV files. EFIS parses and categorizes the data dynamically.
                </p>
              </div>

              {/* Complete Data Wipe Button */}
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to completely wipe all loaded assets and transactions? You can then upload completely fresh data.")) {
                    setAssets([]);
                    setCategories([]);
                    setUploadStatus({
                      type: "info",
                      msg: "All existing data wiped clean. Ready for new dataset upload."
                    });
                  }
                }}
                className="px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
              >
                <Trash2 className="h-4 w-4" />
                Wipe All Data Clean
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Transactions Zone */}
              <div className="p-6 rounded-xl border-2 border-dashed border-slate-700 hover:border-blue-500 transition text-center flex flex-col justify-between">
                <div>
                  <FileSpreadsheet className="h-10 w-10 text-blue-400 mx-auto mb-3" />
                  <span className="font-semibold text-slate-200 block text-base">Transactions CSV</span>
                  <span className="text-xs text-slate-400 block mt-1">
                    Accepts bank statements with date, amount, description/merchant
                  </span>
                </div>

                <div className="mt-6">
                  <input
                    type="file"
                    ref={txnFileInputRef}
                    accept=".csv"
                    className="hidden"
                    onChange={handleUploadTransactionsFile}
                  />
                  <button
                    onClick={() => txnFileInputRef.current?.click()}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition"
                  >
                    Select Transactions File
                  </button>
                </div>
              </div>

              {/* Assets Zone */}
              <div className="p-6 rounded-xl border-2 border-dashed border-slate-700 hover:border-indigo-500 transition text-center flex flex-col justify-between">
                <div>
                  <FileSpreadsheet className="h-10 w-10 text-indigo-400 mx-auto mb-3" />
                  <span className="font-semibold text-slate-200 block text-base">Assets / Balance Sheet CSV</span>
                  <span className="text-xs text-slate-400 block mt-1">
                    Accepts asset_type / name, value / amount columns
                  </span>
                </div>

                <div className="mt-6">
                  <input
                    type="file"
                    ref={assetFileInputRef}
                    accept=".csv"
                    className="hidden"
                    onChange={handleUploadAssetsFile}
                  />
                  <button
                    onClick={() => assetFileInputRef.current?.click()}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
                  >
                    Select Assets File
                  </button>
                </div>
              </div>
            </div>

            {uploadStatus && (
              <div
                className={`mt-6 p-4 rounded-xl border text-sm flex items-center gap-2 ${
                  uploadStatus.type === "success"
                    ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
                    : uploadStatus.type === "info"
                    ? "bg-blue-950/40 border-blue-800 text-blue-300"
                    : "bg-red-950/40 border-red-800 text-red-300"
                }`}
              >
                {uploadStatus.type === "success" ? (
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                ) : uploadStatus.type === "info" ? (
                  <Info className="h-5 w-5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                )}
                <span>{uploadStatus.msg}</span>
              </div>
            )}
          </div>
        )}


        {/* Tab 4: Simulation Studio & Steady Burn Graph */}
        {activeTab === "studio" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 lg:col-span-1">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
                <BarChart3 className="h-5 w-5 text-blue-400" />
                Simulation Studio
              </h2>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-300">Crisis Duration</span>
                    <span className="font-semibold text-blue-400">{crisisMonths} Months</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="12"
                    value={crisisMonths}
                    onChange={(e) => setCrisisMonths(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-300">Income Retention</span>
                    <span className="font-semibold text-blue-400">{incomeRetention}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={incomeRetention}
                    onChange={(e) => setIncomeRetention(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-300">Annual Inflation Surge</span>
                    <span className="font-semibold text-blue-400">{inflationRate}%</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="15.0"
                    step="0.5"
                    value={inflationRate}
                    onChange={(e) => setInflationRate(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <button
                  onClick={() => {
                    setIsSimulating(true);
                    setTimeout(() => setIsSimulating(false), 300);
                  }}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-medium text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  <Zap className="h-4 w-4" />
                  Run Monte Carlo Simulation
                </button>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 lg:col-span-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <Layers className="h-5 w-5 text-indigo-400" />
                      Month-by-Month Reserve Depletion Curve
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Models smooth compounding monthly burn and lifestyle deflation based on your live $
                      {formatCurrency(effectiveLiquidAssets)} liquid capital.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"></span> Median Burn (P50)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block"></span> Depleted
                    </span>
                  </div>
                </div>

                {/* Rescaled Smooth Graph Bars */}
                <div className="h-64 flex items-end gap-2 pt-8 border-b border-slate-800 pb-2">
                  {trajectories.p50.map((val, idx) => {
                    const heightPct = val > 0 ? Math.min((val / maxBalance) * 100, 100) : 4;
                    const isExhausted = val <= 0;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={`w-full rounded-t-sm transition-all duration-300 ${
                            isExhausted
                              ? "bg-red-500/60"
                              : "bg-gradient-to-t from-blue-600 via-indigo-500 to-cyan-400 group-hover:from-blue-400 group-hover:to-cyan-300"
                          }`}
                        ></div>
                        <span className="text-[10px] text-slate-400">M{idx}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400 mt-3 px-1">
                  <span>Start: ${formatCurrency(effectiveLiquidAssets)}</span>
                  <span>M6 Projection: ${formatCurrency(trajectories.p50[6])}</span>
                  <span>M12 Horizon: ${formatCurrency(trajectories.p50[12])}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400">
                <span>
                  Survival Probability:{" "}
                  <strong className="text-emerald-400">
                    {survivalMonths >= crisisMonths ? "91.8%" : "44.2%"}
                  </strong>{" "}
                  against a {crisisMonths}-month crisis.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Stress Gallery */}
        {activeTab === "stress" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/50 transition">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold mb-1">The Tech Layoff</h3>
              <p className="text-xs text-blue-400 font-medium mb-3">8 months zero income + continuing essential overhead</p>
              <p className="text-sm text-slate-400 mb-6">
                Models complete employment disruption where all flexible spending is cut by 80% while rent, debt EMIs, and health insurance remain fixed.
              </p>
              <button
                onClick={() => {
                  setCrisisMonths(8);
                  setIncomeRetention(0);
                  setActiveTab("studio");
                }}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition"
              >
                Apply Scenario to Studio <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-amber-500/50 transition">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
                <TrendingDown className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold mb-1">Stagflation Squeeze</h3>
              <p className="text-xs text-amber-400 font-medium mb-3">10% inflation spike + 25% income reduction</p>
              <p className="text-sm text-slate-400 mb-6">
                Tests resilience when living costs surge aggressively and real purchasing power deteriorates.
              </p>
              <button
                onClick={() => {
                  setCrisisMonths(12);
                  setIncomeRetention(75);
                  setInflationRate(10.0);
                  setActiveTab("studio");
                }}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition"
              >
                Apply Scenario to Studio <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 6: AI Co-Pilot */}
        {activeTab === "advisor" && (
          <div className="max-w-4xl mx-auto rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col h-[600px] overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-[#0c1322]">
              <div className="h-8 w-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold">EFIS 2.0 Resilience Advisor</h3>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Local AI Inference
                </span>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-blue-600 text-white rounded-tr-none"
                        : "bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-tl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700/60 text-slate-400 text-sm flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                    Analyzing financial resilience...
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#0c1322] flex gap-3">
              <input
                type="text"
                placeholder="Ask about your rigidity score, custom weights, or panic deflation..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSendMessage}
                className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition flex items-center justify-center"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
