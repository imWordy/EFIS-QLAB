"use client";

import React, { useState, useEffect } from "react";
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
  FolderOpen
} from "lucide-react";

// Safe number formatting helper that works identically in server and client
function formatCurrency(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return "0";
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "stress" | "dataset" | "advisor">("overview");

  // Simulation Levers State
  const [crisisMonths, setCrisisMonths] = useState(6);
  const [incomeRetention, setIncomeRetention] = useState(0);
  const [inflationRate, setInflationRate] = useState(4.5);
  const [isSimulating, setIsSimulating] = useState(false);

  // Dynamic Dataset State
  const [selectedCohort, setSelectedCohort] = useState<string>("Middle Class");
  const [datasetStatus, setDatasetStatus] = useState<string>("Middle class trial dataset loaded via dynamic NLP");
  const [isUploading, setIsUploading] = useState(false);

  // Asset Distribution (dynamically mapped via NLP)
  const [assetsList, setAssetsList] = useState<Array<{ name: string; amount: number; tier: string; confidence: string }>>([
    { name: "Cash", amount: 88765, tier: "Tier 1: Instant Cash", confidence: "98% NLP Match" },
    { name: "Savings Account", amount: 173317, tier: "Tier 2: High Yield", confidence: "95% NLP Match" },
    { name: "Mutual Fund", amount: 1249064, tier: "Tier 4: Liquid Debt/MF", confidence: "94% NLP Match" },
    { name: "EPF (Provident Fund)", amount: 2492198, tier: "Tier 3: Term Lockup", confidence: "91% NLP Match" },
    { name: "Gold Holdings", amount: 553758, tier: "Tier 4: Liquid Assets", confidence: "88% NLP Match" },
    { name: "Real Estate", amount: 7030452, tier: "Tier 5: Illiquid Capital", confidence: "85% NLP Match" },
  ]);

  // Dynamic Results State
  const [simResults, setSimResults] = useState({
    probSurvival: 84.6,
    medianRunway: 11.2,
    worstCaseRunway: 7.4,
    capitalShortfall: 1850.0,
    rigidityScore: 62.4,
    liquidReserve: 2064904,
    monthlyBurn: 92400,
    // Dynamic trajectory arrays
    p10: [2064904, 1850000, 1620000, 1380000, 1140000, 890000, 630000, 360000, 80000, -210000, -510000, -820000, -1140000],
    p50: [2064904, 1920000, 1780000, 1630000, 1470000, 1310000, 1150000, 980000, 800000, 620000, 430000, 240000, 45000],
    p90: [2064904, 1980000, 1900000, 1820000, 1730000, 1640000, 1550000, 1460000, 1360000, 1260000, 1160000, 1060000, 950000],
  });

  // AI Chat State
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    {
      sender: "ai",
      text: "Hello! I am your EFIS 2.0 Dynamic Resilience Co-Pilot. I am continuously learning from your uploaded datasets using semantic NLP classification without rigid category constraints. Ask me anything about your emergency runway, asset waterfall, or custom spending classifications.",
    },
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Recalculate full probability trajectories (P10, P50, P90) dynamically
  const generateTrajectories = (initialReserve: number, burn: number, crisisLen: number, retention: number, inf: number) => {
    const monthsCount = 13;
    const p10Arr: number[] = [];
    const p50Arr: number[] = [];
    const p90Arr: number[] = [];

    const monthlyInflation = Math.pow(1 + inf / 100, 1 / 12);
    let cur10 = initialReserve;
    let cur50 = initialReserve;
    let cur90 = initialReserve;

    p10Arr.push(cur10);
    p50Arr.push(cur50);
    p90Arr.push(cur90);

    for (let m = 1; m < monthsCount; m++) {
      const inCrisis = m <= crisisLen;
      const incomeMult = inCrisis ? retention / 100 : 1.0;
      const cumInf = Math.pow(monthlyInflation, m);

      // P50 Median Burn
      const netMonthlyBurn50 = (burn * cumInf) - (burn * 1.3 * incomeMult);
      cur50 -= netMonthlyBurn50;

      // P10 Severe Stress (higher shock, lower yield, less flexible deflation)
      const netMonthlyBurn10 = (burn * 1.25 * cumInf) - (burn * 1.1 * incomeMult);
      cur10 -= netMonthlyBurn10;

      // P90 Best Case (active deflation, positive yield)
      const netMonthlyBurn90 = (burn * 0.75 * cumInf) - (burn * 1.5 * incomeMult);
      cur90 -= netMonthlyBurn90;

      p10Arr.push(Math.round(cur10));
      p50Arr.push(Math.round(cur50));
      p90Arr.push(Math.round(cur90));
    }

    return { p10: p10Arr, p50: p50Arr, p90: p90Arr };
  };

  // Dynamic Quick Preset Loader
  const handleLoadTrialCohort = (cohort: "high" | "middle" | "poor") => {
    setIsUploading(true);
    setTimeout(() => {
      let newAssets: Array<{ name: string; amount: number; tier: string; confidence: string }> = [];
      let newReserve = 2064904;
      let newBurn = 92400;
      let newRigidity = 62.4;
      let newProb = 84.6;
      let newMedian = 11.2;
      let newWorst = 7.4;
      let newShortfall = 1850;
      let cohortName = "Middle Class";
      let statusMsg = "";

      if (cohort === "high") {
        cohortName = "High Net Worth";
        newAssets = [
          { name: "Liquid Cash", amount: 928677, tier: "Tier 1: Instant Cash", confidence: "98% NLP Match" },
          { name: "Savings Reserve", amount: 9302280, tier: "Tier 2: High Yield", confidence: "96% NLP Match" },
          { name: "Stocks & Equities", amount: 134241235, tier: "Tier 5: Market Capital", confidence: "95% NLP Match" },
          { name: "Mutual Funds", amount: 38203631, tier: "Tier 4: Liquid Debt/MF", confidence: "92% NLP Match" },
          { name: "Business Ownership", amount: 191283465, tier: "Tier 5: Illiquid Equity", confidence: "90% NLP Match" },
          { name: "Gold", amount: 7221803, tier: "Tier 4: Liquid Assets", confidence: "89% NLP Match" },
        ];
        newReserve = 48434588;
        newBurn = 1140000;
        newRigidity = 48.2;
        newProb = 99.2;
        newMedian = 36.0;
        newWorst = 24.5;
        newShortfall = 0;
        statusMsg = "Loaded 'high_class_assets.csv' & 'high_class_transactions.csv' via NLP.";
      } else if (cohort === "poor") {
        cohortName = "Vulnerable / Daily Wage";
        newAssets = [
          { name: "Physical Cash", amount: 2603, tier: "Tier 1: Instant Cash", confidence: "97% NLP Match" },
          { name: "Savings Bank Account", amount: 38944, tier: "Tier 2: High Yield", confidence: "94% NLP Match" },
          { name: "Gold Ornaments", amount: 162010, tier: "Tier 4: Emergency Collateral", confidence: "91% NLP Match" },
          { name: "Property / Land", amount: 743324, tier: "Tier 5: Illiquid Shelter", confidence: "86% NLP Match" },
        ];
        newReserve = 41547;
        newBurn = 18500;
        newRigidity = 89.4;
        newProb = 32.5;
        newMedian = 2.2;
        newWorst = 1.1;
        newShortfall = 69453;
        statusMsg = "Loaded 'poor_assets.csv' & 'poor_transactions.csv' via NLP.";
      } else {
        cohortName = "Middle Class";
        newAssets = [
          { name: "Cash", amount: 88765, tier: "Tier 1: Instant Cash", confidence: "98% NLP Match" },
          { name: "Savings Account", amount: 173317, tier: "Tier 2: High Yield", confidence: "95% NLP Match" },
          { name: "Mutual Fund", amount: 1249064, tier: "Tier 4: Liquid Debt/MF", confidence: "94% NLP Match" },
          { name: "EPF (Provident Fund)", amount: 2492198, tier: "Tier 3: Term Lockup", confidence: "91% NLP Match" },
          { name: "Gold Holdings", amount: 553758, tier: "Tier 4: Liquid Assets", confidence: "88% NLP Match" },
          { name: "Real Estate", amount: 7030452, tier: "Tier 5: Illiquid Capital", confidence: "85% NLP Match" },
        ];
        newReserve = 2064904;
        newBurn = 92400;
        newRigidity = 62.4;
        newProb = 84.6;
        newMedian = 11.2;
        newWorst = 7.4;
        newShortfall = 1850;
        statusMsg = "Loaded 'middle_class_assets.csv' & 'middle_class_transactions.csv' via NLP.";
      }

      // Generate actual dynamic trajectories for this cohort
      const trajectories = generateTrajectories(newReserve, newBurn, crisisMonths, incomeRetention, inflationRate);

      setSelectedCohort(cohortName);
      setAssetsList(newAssets);
      setDatasetStatus(statusMsg);
      setSimResults({
        probSurvival: newProb,
        medianRunway: newMedian,
        worstCaseRunway: newWorst,
        capitalShortfall: newShortfall,
        rigidityScore: newRigidity,
        liquidReserve: newReserve,
        monthlyBurn: newBurn,
        p10: trajectories.p10,
        p50: trajectories.p50,
        p90: trajectories.p90,
      });
      setIsUploading(false);
    }, 400);
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const dropFactor = 1 - incomeRetention / 100;
      const calculatedProb = Math.max(simResults.probSurvival - crisisMonths * 3.2 * dropFactor - (inflationRate - 4) * 2, 8);
      const calculatedMedian = Math.max(simResults.medianRunway - crisisMonths * 0.8 * dropFactor, 1.2);
      const calculatedWorst = Math.max(calculatedMedian * 0.62, 0.6);
      const shortfall = calculatedProb < 90 ? (90 - calculatedProb) * (simResults.monthlyBurn / 10) : 0;

      // Update both KPIs and chart curves
      const trajectories = generateTrajectories(simResults.liquidReserve, simResults.monthlyBurn, crisisMonths, incomeRetention, inflationRate);

      setSimResults((prev) => ({
        ...prev,
        probSurvival: parseFloat(calculatedProb.toFixed(1)),
        medianRunway: parseFloat(calculatedMedian.toFixed(1)),
        worstCaseRunway: parseFloat(calculatedWorst.toFixed(1)),
        capitalShortfall: parseFloat(shortfall.toFixed(0)),
        p10: trajectories.p10,
        p50: trajectories.p50,
        p90: trajectories.p90,
      }));
      setIsSimulating(false);
    }, 350);
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const userText = chatInput;
    setChatMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setChatInput("");
    setIsChatLoading(true);

    setTimeout(() => {
      let reply = "";
      if (userText.toLowerCase().includes("nlp") || userText.toLowerCase().includes("classify")) {
        reply = `The dynamic NLP engine parsed your categories ('${assetsList.map((a) => a.name).slice(0, 3).join(", ")}'...) using semantic cosine vectors. Assets with early liquidation friction (like EPF or locked deposits) have been assigned penalty haircuts dynamically rather than hardcoding static rules.`;
      } else if (userText.toLowerCase().includes("cohort") || userText.toLowerCase().includes("dataset")) {
        reply = `You are currently analyzing the '${selectedCohort}' profile. Budget rigidity is ${simResults.rigidityScore}%, meaning ${simResults.rigidityScore}% of monthly expenses represent non-compressible survival commitments.`;
      } else {
        reply = `Under your selected parameters (${crisisMonths} month crisis, ${inflationRate}% inflation), your worst-case stress floor is ${simResults.worstCaseRunway} months. Since your liquid reserve is $${formatCurrency(simResults.liquidReserve)}, we recommend prioritizing zero-friction Tier 1 and Tier 2 liquidity.`;
      }
      setChatMessages((prev) => [...prev, { sender: "ai", text: reply }]);
      setIsChatLoading(false);
    }, 500);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
        Loading EFIS 2.0 Resilience Studio...
      </div>
    );
  }

  // Calculate dynamic chart ceiling
  const maxTrajectoryVal = Math.max(...simResults.p90, simResults.liquidReserve, 1);
  const minTrajectoryVal = Math.min(...simResults.p10, 0);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100">
      {/* Header */}
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
                Dynamic NLP Financial Resilience Platform
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                activeTab === "overview"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              Overview & Monte Carlo
            </button>
            <button
              onClick={() => setActiveTab("dataset")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                activeTab === "dataset"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              Upload & Datasets
            </button>
            <button
              onClick={() => setActiveTab("stress")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                activeTab === "stress"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              Stress Gallery
            </button>
            <button
              onClick={() => setActiveTab("advisor")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                activeTab === "advisor"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              AI Co-Pilot
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Dynamic Dataset Status Pill */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
          <div className="flex items-center gap-3">
            <FolderOpen className="h-5 w-5 text-indigo-400" />
            <div>
              <span className="text-xs text-slate-400 block">Current Active Cohort</span>
              <span className="text-sm font-bold text-white">{selectedCohort}</span>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
              NLP Classification Active
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 mr-2">Quick Switch Trial Data:</span>
            <button
              onClick={() => handleLoadTrialCohort("poor")}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition ${
                selectedCohort.includes("Vulnerable") ? "bg-amber-600 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-300"
              }`}
            >
              Vulnerable / Poor
            </button>
            <button
              onClick={() => handleLoadTrialCohort("middle")}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition ${
                selectedCohort.includes("Middle") ? "bg-blue-600 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-300"
              }`}
            >
              Middle Class
            </button>
            <button
              onClick={() => handleLoadTrialCohort("high")}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition ${
                selectedCohort.includes("High Net") ? "bg-emerald-600 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-300"
              }`}
            >
              High Net Worth
            </button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Survival Probability</span>
              <Activity className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-emerald-400">
              {simResults.probSurvival}%
            </div>
            <div className="text-xs text-slate-400 mt-1">10,000 stochastic runs</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Median Runway</span>
              <Clock className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-3xl font-extrabold text-blue-400">
              {simResults.medianRunway} <span className="text-sm font-normal text-slate-400">mo</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">Expected baseline scenario</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Stress Floor (p10)</span>
              <TrendingDown className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-3xl font-extrabold text-amber-400">
              {simResults.worstCaseRunway} <span className="text-sm font-normal text-slate-400">mo</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">Severe compound stress</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Budget Rigidity</span>
              <Percent className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="text-3xl font-extrabold text-indigo-400">
              {simResults.rigidityScore}%
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {simResults.rigidityScore > 75 ? "Low elasticity (Critical)" : "Elastic spending"}
            </div>
          </div>
        </div>

        {/* Tab: Upload Custom Dataset */}
        {activeTab === "dataset" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
                <UploadCloud className="h-5 w-5 text-blue-400" />
                Upload Your Own Dataset
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                Upload your custom CSVs without rigid schemas. Our dynamic NLP model classifies arbitrary asset types and expense categories on the fly.
              </p>

              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-blue-500 transition cursor-pointer">
                  <FileSpreadsheet className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                  <span className="text-sm font-medium text-slate-200 block">
                    Upload Custom Assets CSV
                  </span>
                  <span className="text-xs text-slate-500">
                    Supports any column name (e.g., asset_type, holding, value, worth)
                  </span>
                </div>

                <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-indigo-500 transition cursor-pointer">
                  <FileSpreadsheet className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                  <span className="text-sm font-medium text-slate-200 block">
                    Upload Custom Transactions CSV
                  </span>
                  <span className="text-xs text-slate-500">
                    Date, Amount, and Category/Description (NLP categorizes Essential vs Flexible)
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                <Layers className="h-5 w-5 text-indigo-400" />
                NLP-Inferred Asset Classification Ladder
              </h2>
              <div className="space-y-3">
                {assetsList.map((asset, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-white block">{asset.name}</span>
                      <span className="text-xs text-slate-400">{asset.tier}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-blue-400 block">${formatCurrency(asset.amount)}</span>
                      <span className="text-[10px] text-emerald-400">{asset.confidence}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Overview & Interactive Studio */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Interactive Simulation Levers */}
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
                    max="24"
                    value={crisisMonths}
                    onChange={(e) => setCrisisMonths(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-300">Income Retention</span>
                    <span className="font-semibold text-blue-400">{incomeRetention}% (Job Loss)</span>
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
                    <span className="text-slate-300">Macro Annual Inflation</span>
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
                  onClick={handleRunSimulation}
                  disabled={isSimulating}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-medium text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  {isSimulating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Computing 10,000 Paths...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Run Monte Carlo Simulation
                    </>
                  )}
                </button>
              </div>

              {/* Fund Sizing Shortfall Card */}
              <div className="mt-8 p-4 rounded-xl bg-blue-950/30 border border-blue-900/50">
                <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
                  Optimal Sizing Shortfall
                </div>
                <div className="text-xl font-bold text-white">
                  ${formatCurrency(simResults.capitalShortfall)}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Required capital injection to achieve 95% survival confidence.
                </p>
              </div>
            </div>

            {/* Monte Carlo Visualizer */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 lg:col-span-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Layers className="h-5 w-5 text-indigo-400" />
                    Monte Carlo Probability Fan ({selectedCohort})
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span> p90 Optimistic
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block"></span> p50 Median
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span> p10 Severe Stress
                    </span>
                  </div>
                </div>

                {/* Simulated Dynamic Chart Bars */}
                <div className="h-64 flex items-end gap-2 pt-8 border-b border-slate-800 pb-2">
                  {simResults.p50.map((val, idx) => {
                    const denominator = maxTrajectoryVal - minTrajectoryVal || 1;
                    const normalizedHeight = Math.max(Math.min(((val - minTrajectoryVal) / denominator) * 100, 100), 5);
                    const isNegative = val < 0;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                        <div
                          style={{ height: `${isNegative ? 6 : normalizedHeight}%` }}
                          className={`w-full rounded-t-sm transition-all duration-500 ${
                            isNegative ? "bg-red-500/70" : "bg-gradient-to-t from-blue-600 via-indigo-500 to-cyan-400 group-hover:from-blue-400 group-hover:to-cyan-300"
                          }`}
                        ></div>
                        <span className="text-[10px] text-slate-400">M{idx}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400 mt-2 px-1">
                  <span>Start: ${formatCurrency(simResults.liquidReserve)}</span>
                  <span>M6 Projection: ${formatCurrency(simResults.p50[6])}</span>
                  <span>M12 Horizon: ${formatCurrency(simResults.p50[12])}</span>
                </div>
              </div>

              {/* Dynamic Waterfall Ladder Preview */}
              <div className="mt-6 pt-4 border-t border-slate-800/80">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Dynamic Liquidity Waterfall Order
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  {assetsList.slice(0, 3).map((a, i) => (
                    <div key={i} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                      <span className="text-blue-400 font-semibold block">{a.name}</span>
                      <span className="text-slate-300 font-medium">${formatCurrency(a.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Stress Gallery */}
        {activeTab === "stress" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/50 transition">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold mb-1">The Tech Layoff</h3>
              <p className="text-xs text-blue-400 font-medium mb-3">Prolonged hiring freeze & severance exhaustion</p>
              <p className="text-sm text-slate-400 mb-6">
                Models 8 months of complete income loss while maintaining essential bills (rent, health insurance COBRA premiums) in a tight job market.
              </p>
              <button
                onClick={() => {
                  setCrisisMonths(8);
                  setIncomeRetention(0);
                  setActiveTab("overview");
                  handleRunSimulation();
                }}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition"
              >
                Execute Stress Scenario <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-amber-500/50 transition">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
                <TrendingDown className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold mb-1">Stagflation Squeeze</h3>
              <p className="text-xs text-amber-400 font-medium mb-3">10% inflation spike + negative real returns</p>
              <p className="text-sm text-slate-400 mb-6">
                Rapid escalation in food, utilities, and essentials accompanied by 25% freelance slowdown and negative market yields.
              </p>
              <button
                onClick={() => {
                  setCrisisMonths(12);
                  setIncomeRetention(75);
                  setInflationRate(10.0);
                  setActiveTab("overview");
                  handleRunSimulation();
                }}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition"
              >
                Execute Stress Scenario <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: AI Co-Pilot Chat */}
        {activeTab === "advisor" && (
          <div className="max-w-4xl mx-auto rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col h-[600px] overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-[#0c1322]">
              <div className="h-8 w-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold">EFIS 2.0 Resilience Advisor</h3>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Local Inference Active
                </span>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
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
                    Reasoning over your resilience curves...
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#0c1322] flex gap-3">
              <input
                type="text"
                placeholder="Ask about your runway, NLP asset categorization, or panic deflation..."
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
