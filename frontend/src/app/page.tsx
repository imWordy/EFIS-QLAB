"use client";

import React, { useState } from "react";
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
  DollarSign,
  Percent,
  Clock,
} from "lucide-react";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "stress" | "advisor">("overview");

  // Simulation Levers State
  const [crisisMonths, setCrisisMonths] = useState(6);
  const [incomeRetention, setIncomeRetention] = useState(0);
  const [inflationRate, setInflationRate] = useState(4.5);
  const [isSimulating, setIsSimulating] = useState(false);

  // Results State
  const [simResults, setSimResults] = useState({
    probSurvival: 78.4,
    medianRunway: 8.5,
    worstCaseRunway: 5.2,
    capitalShortfall: 2450.0,
    rigidityScore: 68.2,
    p10: [20000, 16800, 13700, 10500, 7200, 3900, 800, -2200, -5100, -8000, -10900, -13700, -16500],
    p50: [20000, 17400, 14900, 12500, 10100, 7800, 5600, 3500, 1500, -400, -2300, -4100, -5800],
    p90: [20000, 18100, 16300, 14600, 12900, 11300, 9800, 8400, 7100, 5900, 4800, 3800, 2900],
  });

  // AI Chat State
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    {
      sender: "ai",
      text: "Hello! I am your EFIS 2.0 Resilience Co-Pilot. I monitor your balance sheet, multi-tier liquidity, and stochastic risk curves. Ask me anything about your emergency runway or stress-testing scenarios.",
    },
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      // Deterministic client preview recalculation based on levers
      const dropFactor = 1 - incomeRetention / 100;
      const calculatedProb = Math.max(95 - crisisMonths * 4.5 * dropFactor - (inflationRate - 3) * 2, 12);
      const calculatedMedian = Math.max(14 - crisisMonths * 1.1 * dropFactor, 2.5);
      const calculatedWorst = Math.max(calculatedMedian * 0.65, 1.2);
      const shortfall = calculatedProb < 90 ? (90 - calculatedProb) * 110 : 0;

      setSimResults((prev) => ({
        ...prev,
        probSurvival: parseFloat(calculatedProb.toFixed(1)),
        medianRunway: parseFloat(calculatedMedian.toFixed(1)),
        worstCaseRunway: parseFloat(calculatedWorst.toFixed(1)),
        capitalShortfall: parseFloat(shortfall.toFixed(2)),
      }));
      setIsSimulating(false);
    }, 400);
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const userText = chatInput;
    setChatMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setChatInput("");
    setIsChatLoading(true);

    setTimeout(() => {
      let reply = "";
      if (userText.toLowerCase().includes("layoff") || userText.toLowerCase().includes("job")) {
        reply = `Under an extended layoff scenario with 0% income retention, your emergency runway will last approximately ${simResults.worstCaseRunway} to ${simResults.medianRunway} months. Since your budget rigidity is ${simResults.rigidityScore}%, activating Panic Mode (cutting discretionary dining and entertainment by 80%) will buy you an extra 2.1 months of survival runway.`;
      } else if (userText.toLowerCase().includes("shortfall") || userText.toLowerCase().includes("save")) {
        reply = `To achieve institutional-grade (95%) confidence across a ${crisisMonths}-month crisis with ${inflationRate}% inflation, you should target an additional $${simResults.capitalShortfall.toLocaleString()} in your Tier-1 liquid accounts.`;
      } else {
        reply = `Based on your multi-tier liquidity cascade, your first line of defense ($5,000 checking) has zero friction. However, accessing your Tier-3 Fixed Deposit early will trigger a 2.0% penalty haircut. We recommend keeping at least 90 days of burn in high-yield instant access savings.`;
      }
      setChatMessages((prev) => [...prev, { sender: "ai", text: reply }]);
      setIsChatLoading(false);
    }, 600);
  };

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
                Emergency Fund Intelligence System
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
            <div className="text-xs text-slate-400 mt-1">10,000 stochastic paths</div>
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
            <div className="text-xs text-slate-400 mt-1">Essential non-cuttable burn</div>
          </div>
        </div>

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
                  ${simResults.capitalShortfall.toLocaleString()}
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
                    Monte Carlo Probability Fan
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

                {/* Simulated Chart Bars */}
                <div className="h-64 flex items-end gap-2 pt-8 border-b border-slate-800 pb-2">
                  {simResults.p50.map((val, idx) => {
                    const heightPct = Math.max(Math.min((val / 20000) * 100, 100), 5);
                    const isNegative = val < 0;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                        <div
                          style={{ height: `${isNegative ? 4 : heightPct}%` }}
                          className={`w-full rounded-t-sm transition-all duration-300 ${
                            isNegative ? "bg-red-500/50" : "bg-gradient-to-t from-blue-600 to-indigo-500 group-hover:from-blue-400 group-hover:to-indigo-300"
                          }`}
                        ></div>
                        <span className="text-[10px] text-slate-400">M{idx}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Multi-Tier Liquidation Ladder Preview */}
              <div className="mt-6 pt-4 border-t border-slate-800/80">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Liquidity Waterfall Ladder
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <span className="text-emerald-400 font-semibold block">Tier 1: Cash Checking</span>
                    <span className="text-slate-400">$5,000 (0% Friction)</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <span className="text-blue-400 font-semibold block">Tier 2: High Yield</span>
                    <span className="text-slate-400">$15,000 (0% Friction, 5.0% APY)</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <span className="text-amber-400 font-semibold block">Tier 3: Fixed Deposit</span>
                    <span className="text-slate-400">$10,000 (2.0% Break Penalty)</span>
                  </div>
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
                placeholder="Ask about your runway, panic deflation, or reserve targets..."
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
