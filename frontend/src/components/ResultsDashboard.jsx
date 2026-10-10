import React, { useState, useEffect } from 'react';
import { BarChart3, Download, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { api } from '../services/api';

export default function ResultsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.getHistory();
      setData(res);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const downloadCSV = () => {
    if (!data?.history?.length) return;
    const headers = ['ID', 'Timestamp', 'Filename', 'Decision', 'Anomaly Score', 'Defects Count', 'Latency (ms)', 'Status'];
    const rows = data.history.map(item => [
      item.id,
      new Date(item.timestamp * 1000).toISOString(),
      item.filename,
      item.decision,
      item.anomaly_score,
      item.defects_count,
      item.latency_ms,
      item.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inspection_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = data?.summary || {
    total_inspections: 0,
    pass_count: 0,
    reject_count: 0,
    low_quality_count: 0,
    yield_percentage: 100,
    avg_latency_ms: 0
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            Inspection Yield & Telemetry Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time optical throughput, quality yield, and statistical inference telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={downloadCSV}
            disabled={!data?.history?.length}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800 flex flex-col">
          <span className="text-[11px] text-slate-400 font-medium">Total Inspected</span>
          <span className="text-xl font-bold font-mono text-slate-100 mt-1">{summary.total_inspections}</span>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800 flex flex-col">
          <span className="text-[11px] text-slate-400 font-medium">PASS Count</span>
          <span className="text-xl font-bold font-mono text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> {summary.pass_count}
          </span>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800 flex flex-col">
          <span className="text-[11px] text-slate-400 font-medium">REJECT Count</span>
          <span className="text-xl font-bold font-mono text-rose-400 mt-1 flex items-center gap-1">
            <XCircle className="w-4 h-4" /> {summary.reject_count}
          </span>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800 flex flex-col">
          <span className="text-[11px] text-slate-400 font-medium">Low Quality Gated</span>
          <span className="text-xl font-bold font-mono text-amber-400 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" /> {summary.low_quality_count}
          </span>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800 flex flex-col">
          <span className="text-[11px] text-slate-400 font-medium">Yield Percentage</span>
          <span className="text-xl font-bold font-mono text-cyan-400 mt-1">{summary.yield_percentage}%</span>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800 flex flex-col">
          <span className="text-[11px] text-slate-400 font-medium">Mean Latency</span>
          <span className="text-xl font-bold font-mono text-slate-200 mt-1 flex items-center gap-1">
            <Clock className="w-4 h-4 text-slate-500" /> {summary.avg_latency_ms}ms
          </span>
        </div>
      </div>

      {/* History Table */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recent Inspection Log</span>
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/40 max-h-72">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0">
              <tr>
                <th className="py-2.5 px-3">Record ID</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Decision</th>
                <th className="py-2.5 px-3">Anomaly Score</th>
                <th className="py-2.5 px-3">Defects Localized</th>
                <th className="py-2.5 px-3">Latency</th>
                <th className="py-2.5 px-3">Quality Gate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300 font-mono text-[11px]">
              {data?.history?.length ? (
                data.history.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2 px-3 text-slate-400">{row.id}</td>
                    <td className="py-2 px-3">{new Date(row.timestamp * 1000).toLocaleTimeString()}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.decision === 'PASS' 
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}>
                        {row.decision}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-bold">{row.anomaly_score.toFixed(3)}</td>
                    <td className="py-2 px-3">{row.defects_count} regions</td>
                    <td className="py-2 px-3 text-cyan-400">{row.latency_ms}ms</td>
                    <td className="py-2 px-3 text-slate-400">{row.status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-6 text-center text-slate-500 font-sans">
                    No inspection events recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
