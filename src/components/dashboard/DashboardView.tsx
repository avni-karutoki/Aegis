import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  ArrowLeft,
  Cpu,
  History,
  LayoutDashboard,
  Menu,
  Network,
  Play,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useSimulation } from '../../context/SimulationContext';
import { useBackend } from '../../context/BackendContext';
import { TRUST_DISTRIBUTION } from '../../data/mockData';
import { ThreatEvent, VerificationStatus } from '../../types/sentinel';
import { PruneConsole } from './PruneConsole';
import { MaritimePanel } from './MaritimePanel';

type DashboardTab =
  | 'overview'
  | 'agents'
  | 'threats'
  | 'trust'
  | 'timeline'
  | 'ai-usage';

interface DashboardViewProps {
  onBackToShowcase: () => void;
}

const NAV_ITEMS: { id: DashboardTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'agents', label: 'Agent Network', icon: Network },
  { id: 'threats', label: 'Threat Intelligence', icon: ShieldAlert },
  { id: 'trust', label: 'Trust & Verification', icon: ShieldCheck },
  { id: 'timeline', label: 'Incident Timeline', icon: History },
  { id: 'ai-usage', label: 'AI Usage', icon: Cpu },
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  onBackToShowcase,
}) => {
  const {
    agents,
    events,
    timeline,
    aiUsage,
    selectedAgentId,
    setSelectedAgentId,
    statusMessage,
    averageNetworkTrust,
    verifiedThreatCount,
    pendingCount,
    totalAiRequests,
    blockedAiRequests,
    illustrativeCostUsd,
    simulateThreat,
    simulateUnreliableReport,
    resetSimulation,
  } = useSimulation();

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | VerificationStatus>('All');
  const [selectedEvent, setSelectedEvent] = useState<ThreatEvent | null>(events[0] ?? null);
  const { online: backendOnline, stats: backendStats, layers: backendLayers } = useBackend();

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchesStatus =
        statusFilter === 'All' || ev.verificationStatus === statusFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        ev.title.toLowerCase().includes(q) ||
        ev.id.toLowerCase().includes(q) ||
        ev.sourceName.toLowerCase().includes(q) ||
        ev.category.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [events, statusFilter, searchQuery]);

  const reliabilityChartData = useMemo(
    () =>
      agents.map((a) => ({
        name: `Agent ${a.id}`,
        trustScore: a.trustScore,
        accuracy: a.historicalAccuracy,
        completeness: a.evidenceCompleteness,
      })),
    [agents]
  );

  const activeNavTitle =
    NAV_ITEMS.find((n) => n.id === activeTab)?.label ?? 'Overview';

  const statusTone = (status: string) => {
    switch (status) {
      case 'Verified':
      case 'Active':
        return 'text-[#34D399]';
      case 'Verifying':
      case 'Pending':
        return 'text-[#B8FF2E]';
      case 'Alert':
        return 'text-[#F59E0B]';
      case 'Flagged Unreliable':
      case 'Caution':
        return 'text-[#EF4444]';
      default:
        return 'text-[#9FB2A5]';
    }
  };

  return (
    <div className="min-h-screen bg-[#050A07] text-[#F4F7F4] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[256px] shrink-0 flex-col justify-between border-r border-white/10 bg-[#060D09] p-5">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBackToShowcase}
              className="font-display text-base font-extrabold tracking-[0.12em] uppercase text-[#F4F7F4] hover:text-[#B8FF2E] transition-colors cursor-pointer whitespace-nowrap"
            >
              AEGIS
            </button>
          </div>

          <nav aria-label="Dashboard navigation" className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm rounded-lg transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#0F2418] text-[#B8FF2E] font-semibold border border-[#B8FF2E]/25'
                      : 'text-[#9FB2A5] hover:text-[#F4F7F4] hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3 pt-6 border-t border-white/10">
          <div className="text-[11px] font-mono-tabular uppercase tracking-[0.14em] text-[#6E8275]">
            Simulated Console
          </div>
          <p className="text-xs text-[#9FB2A5] leading-relaxed">
            Interactive mock data powered by client-side React state. No live
            network telemetry.
          </p>
          <button
            type="button"
            onClick={onBackToShowcase}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold border border-white/15 rounded-md text-[#F4F7F4] hover:border-[#B8FF2E] hover:text-[#B8FF2E] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to Showcase</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 lg:hidden flex"
          >
            <div
              className="fixed inset-0 bg-black/70"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-[260px] bg-[#060D09] border-r border-white/10 p-5 flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="font-display text-base font-extrabold tracking-[0.12em] uppercase">
                    AEGIS
                  </span>
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close sidebar"
                    className="p-1.5 text-[#9FB2A5]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <nav className="space-y-1">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(item.id);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm rounded-lg cursor-pointer ${
                          isActive
                            ? 'bg-[#0F2418] text-[#B8FF2E] font-semibold'
                            : 'text-[#9FB2A5]'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
              <button
                type="button"
                onClick={onBackToShowcase}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold border border-white/15 rounded-md text-[#F4F7F4]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Showcase</span>
              </button>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Dashboard Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Dashboard Top Bar */}
        <header className="sticky top-0 z-30 bg-[#050A07]/95 border-b border-white/10 px-5 md:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="lg:hidden p-2 rounded-md border border-white/15 text-[#F4F7F4]"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#6E8275] truncate">
              <button
                type="button"
                onClick={onBackToShowcase}
                className="hover:text-[#F4F7F4] cursor-pointer hidden sm:inline"
              >
                Aegis
              </button>
              <span className="hidden sm:inline">/</span>
              <span>Console</span>
              <span>/</span>
              <span className="text-[#F4F7F4] font-semibold">{activeNavTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={simulateThreat}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold tracking-[0.08em] uppercase bg-[#B8FF2E] text-[#050A07] rounded-md hover:bg-[#d2ff6e] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Simulate Threat</span>
            </button>

            <button
              type="button"
              onClick={simulateUnreliableReport}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold tracking-[0.06em] uppercase border border-[#F59E0B]/45 bg-[#1B1406] text-[#FCD34D] rounded-md hover:bg-[#F59E0B] hover:text-[#050A07] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Unreliable Report</span>
            </button>

            <button
              type="button"
              onClick={resetSimulation}
              aria-label="Reset simulation state"
              className="inline-flex items-center justify-center w-9 h-9 border border-white/15 rounded-md text-[#9FB2A5] hover:text-[#F4F7F4] hover:border-white/30 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Live Simulation Banner */}
        <div className="bg-[#08120C] border-b border-white/[0.08] px-5 md:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2.5 text-[#D4DFD7]">
            <Activity className="w-3.5 h-3.5 text-[#B8FF2E] shrink-0" aria-hidden="true" />
            <span>{statusMessage}</span>
          </div>
          <span className="font-mono-tabular text-[11px] text-[#6E8275]">
            Simulated Frontend State
          </span>
        </div>

        {/* Viewport Body */}
        <main className="flex-1 p-5 md:p-8 max-w-[1320px] w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8"
            >
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
            <>
              {/* 4-Column KPI Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-xl border border-white/10 bg-[#08120C] p-5">
                  <div className="text-xs text-[#9FB2A5]">Active Agents</div>
                  <div className="font-mono-tabular text-3xl font-bold text-[#F4F7F4] mt-2">
                    {agents.length} / 4
                  </div>
                  <div className="text-xs font-mono-tabular text-[#34D399] mt-2">
                    100% Mesh Reachable
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#08120C] p-5">
                  <div className="text-xs text-[#9FB2A5]">Verified Threats</div>
                  <div className="font-mono-tabular text-3xl font-bold text-[#B8FF2E] mt-2">
                    {verifiedThreatCount}
                  </div>
                  <div className="text-xs font-mono-tabular text-[#9FB2A5] mt-2">
                    Multi-agent corroborated
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#08120C] p-5">
                  <div className="text-xs text-[#9FB2A5]">Pending Verification</div>
                  <div className="font-mono-tabular text-3xl font-bold text-[#F59E0B] mt-2">
                    {pendingCount}
                  </div>
                  <div className="text-xs font-mono-tabular text-[#9FB2A5] mt-2">
                    In peer evaluation
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#08120C] p-5">
                  <div className="text-xs text-[#9FB2A5]">Average Network Trust</div>
                  <div className="font-mono-tabular text-3xl font-bold text-[#F4F7F4] mt-2">
                    {averageNetworkTrust.toFixed(1)}%
                  </div>
                  <div className="text-xs font-mono-tabular text-[#34D399] mt-2">
                    Historical reliability index
                  </div>
                </div>
              </div>

              {/* Overview Split: Agent Reliability Chart + Latest Timeline */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-7 rounded-xl border border-white/10 bg-[#08120C] p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-display text-lg font-bold text-[#F4F7F4]">
                        Agent Reliability Comparison
                      </h2>
                      <p className="text-xs text-[#9FB2A5]">
                        Trust score vs. historical accuracy across active servers
                      </p>
                    </div>
                  </div>
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reliabilityChartData}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis
                          dataKey="name"
                          stroke="#6E8275"
                          fontSize={12}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[65, 100]}
                          stroke="#6E8275"
                          fontSize={12}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#07110B',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Bar
                          dataKey="trustScore"
                          name="Trust Score %"
                          fill="#B8FF2E"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="accuracy"
                          name="Historical Accuracy %"
                          fill="#10B981"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="xl:col-span-5 rounded-xl border border-white/10 bg-[#08120C] p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-lg font-bold text-[#F4F7F4]">
                      Recent Incident Steps
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('timeline')}
                      className="text-xs text-[#B8FF2E] hover:underline cursor-pointer"
                    >
                      View full timeline
                    </button>
                  </div>
                  <div className="divide-y divide-white/10">
                    {timeline.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="py-3 space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono-tabular">
                          <span className="text-[#B8FF2E]">{entry.stage}</span>
                          <span className="text-[#6E8275]">{entry.timestamp}</span>
                        </div>
                        <p className="text-xs text-[#D4DFD7] leading-relaxed">
                          {entry.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: AGENT NETWORK */}
          {activeTab === 'agents' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold text-[#F4F7F4]">
                  Agent Network
                </h1>
                <p className="text-sm text-[#9FB2A5] mt-1">
                  Independent monitoring nodes deployed across infrastructure layers.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {agents.map((agent) => {
                  const isSelected = selectedAgentId === agent.id;
                  return (
                    <div
                      key={agent.id}
                      onClick={() => setSelectedAgentId(agent.id)}
                      className={`rounded-xl border p-6 transition-colors cursor-pointer space-y-4 ${
                        isSelected
                          ? 'border-[#B8FF2E]/60 bg-[#0B1C12]'
                          : 'border-white/10 bg-[#08120C] hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-mono-tabular text-xs text-[#6E8275]">
                            {agent.code} · {agent.host}
                          </div>
                          <h2 className="font-display text-xl font-bold text-[#F4F7F4] mt-1">
                            {agent.name}
                          </h2>
                          <p className="text-xs text-[#9FB2A5] mt-0.5">
                            {agent.role}
                          </p>
                        </div>
                        <span
                          className={`font-mono-tabular text-xs font-semibold uppercase ${statusTone(
                            agent.status
                          )}`}
                        >
                          {agent.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-4 py-3 border-t border-b border-white/10">
                        <div>
                          <div className="text-[11px] text-[#6E8275]">Trust Score</div>
                          <div className="font-mono-tabular text-xl font-bold text-[#B8FF2E]">
                            {agent.trustScore.toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-[#6E8275]">Reports</div>
                          <div className="font-mono-tabular text-xl font-bold text-[#F4F7F4]">
                            {agent.reportsSubmitted}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-[#6E8275]">Last Active</div>
                          <div className="font-mono-tabular text-sm font-semibold text-[#D4DFD7] mt-1.5">
                            {agent.lastActive}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] uppercase tracking-[0.1em] text-[#6E8275]">
                          Current Activity
                        </div>
                        <p className="text-xs text-[#D4DFD7] mt-1 leading-relaxed">
                          {agent.currentActivity}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: THREAT INTELLIGENCE */}
          {activeTab === 'threats' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-bold text-[#F4F7F4]">
                    Threat Intelligence
                  </h1>
                  <p className="text-sm text-[#9FB2A5] mt-1">
                    Simulated intelligence reports and peer verification outcomes.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search
                      className="w-4 h-4 text-[#6E8275] absolute left-3 top-1/2 -translate-y-1/2"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search events or agents..."
                      className="pl-9 pr-3 py-2 text-xs bg-[#08120C] border border-white/15 rounded-md text-[#F4F7F4] placeholder:text-[#6E8275] focus:outline-none focus:border-[#B8FF2E]"
                    />
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-[#08120C] border border-white/10 rounded-lg">
                    {(['All', 'Verified', 'Verifying', 'Flagged Unreliable'] as const).map(
                      (st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setStatusFilter(st)}
                          className={`px-3 py-1.5 text-xs rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            statusFilter === st
                              ? 'bg-[#B8FF2E] text-[#050A07] font-semibold'
                              : 'text-[#9FB2A5] hover:text-[#F4F7F4]'
                          }`}
                        >
                          {st}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#08120C] overflow-hidden">
                {filteredEvents.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <p className="text-sm text-[#9FB2A5]">
                      No intelligence records match your current search or filter.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('All');
                      }}
                      className="px-4 py-2 text-xs font-semibold bg-[#B8FF2E] text-[#050A07] rounded-md cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-[11px] font-mono-tabular uppercase tracking-[0.12em] text-[#6E8275]">
                          <th className="py-3.5 px-4">ID</th>
                          <th className="py-3.5 px-4">Event</th>
                          <th className="py-3.5 px-4">Source</th>
                          <th className="py-3.5 px-4">Timestamp</th>
                          <th className="py-3.5 px-4">Severity</th>
                          <th className="py-3.5 px-4 text-right">Confidence</th>
                          <th className="py-3.5 px-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06] text-xs">
                        {filteredEvents.map((ev) => (
                          <tr
                            key={ev.id}
                            onClick={() => setSelectedEvent(ev)}
                            className={`cursor-pointer transition-colors ${
                              selectedEvent?.id === ev.id
                                ? 'bg-[#0F2418]'
                                : 'hover:bg-white/[0.03]'
                            }`}
                          >
                            <td className="py-3.5 px-4 font-mono-tabular text-[#9FB2A5]">
                              {ev.id}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-[#F4F7F4]">
                              {ev.title}
                            </td>
                            <td className="py-3.5 px-4 text-[#9FB2A5]">
                              {ev.sourceName}
                            </td>
                            <td className="py-3.5 px-4 font-mono-tabular text-[#6E8275]">
                              {ev.timestamp}
                            </td>
                            <td className="py-3.5 px-4 font-mono-tabular text-[#F4F7F4]">
                              {ev.severity}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold text-[#F4F7F4]">
                              {ev.confidence.toFixed(1)}%
                            </td>
                            <td
                              className={`py-3.5 px-4 text-right font-mono-tabular font-semibold ${statusTone(
                                ev.verificationStatus
                              )}`}
                            >
                              {ev.verificationStatus}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {selectedEvent && (
                <div className="rounded-xl border border-white/10 bg-[#08120C] p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="font-mono-tabular text-[11px] uppercase text-[#6E8275]">
                      Selected Event · {selectedEvent.id}
                    </div>
                    <div className="font-display text-lg font-bold text-[#F4F7F4] mt-1">
                      {selectedEvent.title}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono-tabular text-[11px] uppercase text-[#6E8275]">
                      Telemetry Summary
                    </div>
                    <p className="text-xs text-[#D4DFD7] mt-1 leading-relaxed">
                      {selectedEvent.summary}
                    </p>
                  </div>
                  <div>
                    <div className="font-mono-tabular text-[11px] uppercase text-[#6E8275]">
                      Consensus Recommendation
                    </div>
                    <p className="text-xs text-[#B8FF2E] mt-1 leading-relaxed">
                      {selectedEvent.recommendation}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TRUST & VERIFICATION */}
          {activeTab === 'trust' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold text-[#F4F7F4]">
                  Trust &amp; Verification Analytics
                </h1>
                <p className="text-sm text-[#9FB2A5] mt-1">
                  Comparison of agent reliability weights and trust score distribution.
                </p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="rounded-xl border border-white/10 bg-[#08120C] p-6 space-y-4">
                  <h2 className="font-display text-lg font-bold text-[#F4F7F4]">
                    Agent Reliability Breakdown
                  </h2>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reliabilityChartData}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="name" stroke="#6E8275" fontSize={12} tickLine={false} />
                        <YAxis domain={[65, 100]} stroke="#6E8275" fontSize={12} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#07110B',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="trustScore" name="Trust Score" fill="#B8FF2E" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="accuracy" name="Accuracy" fill="#10B981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="completeness" name="Evidence" fill="#64748B" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#08120C] p-6 space-y-4">
                  <h2 className="font-display text-lg font-bold text-[#F4F7F4]">
                    Trust Score Distribution
                  </h2>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={TRUST_DISTRIBUTION}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="band" stroke="#6E8275" fontSize={12} tickLine={false} />
                        <YAxis stroke="#6E8275" fontSize={12} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#07110B',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="confidenceAvg"
                          name="Avg Threat Confidence %"
                          stroke="#B8FF2E"
                          fill="#10B981"
                          fillOpacity={0.25}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: INCIDENT TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-bold text-[#F4F7F4]">
                    Incident Timeline
                  </h1>
                  <p className="text-sm text-[#9FB2A5] mt-1">
                    Chronological verification stages across detection, sharing, and recommendation.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#08120C] divide-y divide-white/10">
                {timeline.map((item) => {
                  const stageColor =
                    item.outcome === 'verified'
                      ? 'text-[#34D399]'
                      : item.outcome === 'flagged'
                      ? 'text-[#EF4444]'
                      : item.outcome === 'warning'
                      ? 'text-[#F59E0B]'
                      : 'text-[#B8FF2E]';
                  return (
                    <div
                      key={item.id}
                      className="p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
                    >
                      <div className="md:col-span-3 space-y-1">
                        <div className={`font-mono-tabular text-xs font-semibold ${stageColor}`}>
                          {item.stage}
                        </div>
                        <div className="font-mono-tabular text-xs text-[#6E8275]">
                          {item.eventId} · {item.timestamp}
                        </div>
                      </div>
                      <div className="md:col-span-3 font-medium text-sm text-[#F4F7F4]">
                        {item.agentLabel}
                      </div>
                      <div className="md:col-span-6 text-xs text-[#D4DFD7] leading-relaxed">
                        {item.detail}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: AI USAGE (PRUNE GATEWAY SIMULATION) */}
          {activeTab === 'ai-usage' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="font-display text-2xl font-bold text-[#F4F7F4]">
                    AI Usage &amp; Prune Gateway
                  </h1>
                  <p className="text-sm text-[#9FB2A5] mt-1">
                    {backendOnline
                      ? 'LIVE — figures below are real gateway telemetry from the backend.'
                      : 'Simulation mode — backend offline, figures are illustrative frontend data.'}
                  </p>
                </div>
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-[11px] font-mono-tabular uppercase tracking-[0.1em] ${
                    backendOnline
                      ? 'border-[#34D399]/40 bg-[#34D399]/10 text-[#34D399]'
                      : 'border-white/15 bg-white/5 text-[#9FB2A5]'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      backendOnline ? 'bg-[#34D399] animate-pulse' : 'bg-[#9FB2A5]'
                    }`}
                  />
                  {backendOnline
                    ? `Backend live · Gemini ${backendLayers?.gemini ?? 'unknown'}`
                    : 'Simulation mode'}
                </div>
              </div>

              {backendOnline && backendStats ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-white/10 bg-[#08120C] p-5">
                    <div className="text-xs text-[#9FB2A5]">Total Gateway Calls</div>
                    <div className="font-mono-tabular text-3xl font-bold text-[#F4F7F4] mt-2">
                      {backendStats.totalRequests.toLocaleString()}
                    </div>
                    <div className="text-xs text-[#34D399] mt-2">
                      {backendStats.allowedRequests} allowed ·{' '}
                      {backendStats.blockedRequests} blocked
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#08120C] p-5">
                    <div className="text-xs text-[#9FB2A5]">Redactions Applied</div>
                    <div className="font-mono-tabular text-3xl font-bold text-[#F59E0B] mt-2">
                      {backendStats.redactionsTotal}
                    </div>
                    <div className="text-xs text-[#9FB2A5] mt-2">
                      PII &amp; secrets stripped before the model
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#08120C] p-5">
                    <div className="text-xs text-[#9FB2A5]">Gateway Spend</div>
                    <div className="font-mono-tabular text-3xl font-bold text-[#B8FF2E] mt-2">
                      ${backendStats.estimatedCostUsd.toFixed(4)}
                    </div>
                    <div className="text-xs text-[#9FB2A5] mt-2">
                      ${backendStats.spendRemainingUsd.toFixed(2)} left of $
                      {backendStats.spendCeilingUsd.toFixed(0)} ceiling ·{' '}
                      {backendStats.tokensTotal.toLocaleString()} tokens
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-white/10 bg-[#08120C] p-5">
                    <div className="text-xs text-[#9FB2A5]">Total Request Count</div>
                    <div className="font-mono-tabular text-3xl font-bold text-[#F4F7F4] mt-2">
                      {totalAiRequests.toLocaleString()}
                    </div>
                    <div className="text-xs text-[#34D399] mt-2">
                      Routed through Prune Gateway (simulated)
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#08120C] p-5">
                    <div className="text-xs text-[#9FB2A5]">Blocked Requests</div>
                    <div className="font-mono-tabular text-3xl font-bold text-[#F59E0B] mt-2">
                      {blockedAiRequests}
                    </div>
                    <div className="text-xs text-[#9FB2A5] mt-2">
                      Policy &amp; PII redaction triggers (simulated)
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#08120C] p-5">
                    <div className="text-xs text-[#9FB2A5]">Illustrative Usage Cost</div>
                    <div className="font-mono-tabular text-3xl font-bold text-[#B8FF2E] mt-2">
                      ${illustrativeCostUsd.toFixed(2)}
                    </div>
                    <div className="text-xs text-[#9FB2A5] mt-2">
                      Simulated token optimization
                    </div>
                  </div>
                </div>
              )}

              <PruneConsole />

              <MaritimePanel />

              <div className="rounded-xl border border-white/10 bg-[#08120C] p-6 space-y-4">
                <h2 className="font-display text-lg font-bold text-[#F4F7F4]">
                  Simulated Request &amp; Block Volume
                </h2>
                <p className="text-xs text-[#9FB2A5] -mt-2">
                  Historical synthetic traffic shape for context — live governance
                  figures above come from the Prune gateway.
                </p>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={aiUsage}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="window" stroke="#6E8275" fontSize={12} tickLine={false} />
                      <YAxis stroke="#6E8275" fontSize={12} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#07110B',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="requests"
                        name="AI Requests"
                        stroke="#B8FF2E"
                        fill="#B8FF2E"
                        fillOpacity={0.18}
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="blocked"
                        name="Blocked"
                        stroke="#EF4444"
                        fill="#EF4444"
                        fillOpacity={0.22}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
