import React, { useState } from 'react';
import { ThumbsDown, CheckCheck, MessageSquare, AlertOctagon, Send } from 'lucide-react';
import { api } from '../services/api';

const DEFECT_CATEGORIES = [
  'Thread Damage',
  'Scratch',
  'Dent / Nick',
  'Rust / Oxidation',
  'Contamination / Oil',
  'Surface Irregularity',
  'Other'
];

export default function FeedbackPanel({ currentResult, onFeedbackSubmitted }) {
  const [category, setCategory] = useState('Thread Damage');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState(null);

  if (!currentResult || currentResult.decision !== 'REJECT') {
    return null;
  }

  const handleConfirmDefect = async () => {
    setIsSubmitting(true);
    try {
      await api.confirmDefect({
        product_name: 'screw_v1',
        image_base64: currentResult.annotated_image_base64 || currentResult.heatmap_image_base64,
        anomaly_score: currentResult.anomaly_score,
        defect_category: category,
        defect_regions: currentResult.defect_regions || [],
        operator_notes: notes || undefined
      });
      setFeedbackStatus({ type: 'success', message: 'Confirmed defect archived in benchmark repo.' });
      onFeedbackSubmitted?.();
    } catch (err) {
      setFeedbackStatus({ type: 'error', message: 'Failed to submit defect feedback.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkFalseAlarm = async () => {
    setIsSubmitting(true);
    try {
      await api.markFalseAlarm({
        product_name: 'screw_v1',
        image_base64: currentResult.annotated_image_base64 || currentResult.heatmap_image_base64,
        anomaly_score: currentResult.anomaly_score,
        operator_notes: notes || undefined
      });
      setFeedbackStatus({ type: 'success', message: 'False alarm staged. Patches queued for memory bank update.' });
      onFeedbackSubmitted?.();
    } catch (err) {
      setFeedbackStatus({ type: 'error', message: 'Failed to stage false alarm.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-rose-900/40 rounded-xl p-4 shadow-xl flex flex-col gap-3">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <AlertOctagon className="w-4 h-4 text-rose-400" />
        <h3 className="text-xs font-semibold text-rose-300 uppercase tracking-wider">Operator Action & Loop Feedback</h3>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[11px] text-slate-400 font-medium">Defect Classification</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          {DEFECT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] text-slate-400 font-medium">Operator Notes (Optional)</label>
        <input
          type="text"
          placeholder="e.g. Minor burr on second thread pitch"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={handleConfirmDefect}
          disabled={isSubmitting}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
        >
          <ThumbsDown className="w-3.5 h-3.5" />
          Confirm Defect
        </button>

        <button
          onClick={handleMarkFalseAlarm}
          disabled={isSubmitting}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          Mark False Alarm
        </button>
      </div>

      {feedbackStatus && (
        <div className={`p-2 rounded text-[11px] ${
          feedbackStatus.type === 'success' 
            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800' 
            : 'bg-rose-950/60 text-rose-300 border border-rose-800'
        }`}>
          {feedbackStatus.message}
        </div>
      )}
    </div>
  );
}
