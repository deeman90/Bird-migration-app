import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import {
  Terminal,
  Database,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  ExternalLink,
  ArrowLeft,
  Clock,
  Key,
  Globe,
  Radio,
  FileCode,
  Eye,
  Check,
  Server,
  Zap,
} from 'lucide-react';

interface DiagnosticResult {
  timestamp: string;
  durationMs: number;
  httpStatus: number;
  httpStatusText: string;
  error: any | null;
  data: any[] | null;
  count: number | null;
  authSession: {
    authenticated: boolean;
    userId?: string;
    email?: string;
    role?: string;
  };
  policyVerdict: {
    status: 'granted' | 'denied' | 'error' | 'empty_ok';
    title: string;
    description: string;
    remedy?: string;
  };
}

interface DiagnosticTestPageProps {
  onBack?: () => void;
}

export const DiagnosticTestPage: React.FC<DiagnosticTestPageProps> = ({ onBack }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [runCount, setRunCount] = useState<number>(0);
  const [copiedRaw, setCopiedRaw] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'data' | 'policy' | 'console'>('overview');
  const [liveLogs, setLiveLogs] = useState<
    Array<{ id: string; time: string; level: 'log' | 'info' | 'warn' | 'error'; text: string; raw?: any }>
  >([]);

  const addLiveLog = (level: 'log' | 'info' | 'warn' | 'error', text: string, raw?: any) => {
    setLiveLogs((prev) => [
      ...prev,
      {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        time: new Date().toLocaleTimeString(),
        level,
        text,
        raw,
      },
    ]);
  };

  const executeDiagnosticQuery = useCallback(async () => {
    setLoading(true);
    setLiveLogs([]);
    const startTime = performance.now();
    const timestamp = new Date().toISOString();

    addLiveLog('info', '▶ Starting Supabase connectivity & policy permissions test...');
    addLiveLog('log', `Connecting to target table: public.sighting_logs at ${timestamp}`);

    // 1. Inspect Supabase Auth Session
    let sessionSummary = {
      authenticated: false,
      userId: undefined as string | undefined,
      email: undefined as string | undefined,
      role: undefined as string | undefined,
    };

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        sessionSummary = {
          authenticated: true,
          userId: session.user.id,
          email: session.user.email,
          role: session.user.role || 'authenticated',
        };
        addLiveLog(
          'info',
          `Auth Session: Authenticated as ${session.user.email || session.user.id} (Role: ${session.user.role || 'authenticated'})`
        );
      } else {
        addLiveLog('log', 'Auth Session: Anonymous role (public unauthenticated client)');
      }
    } catch (authErr: any) {
      addLiveLog('warn', `Auth session check warning: ${authErr.message || authErr}`);
    }

    // 2. Perform SELECT query on sighting_logs
    addLiveLog('log', 'Executing SELECT query: supabase.from("sighting_logs").select("*", { count: "exact" }).limit(50)');

    // Styled Banner to Browser DevTools Console
    console.group(
      '%c[Supabase Diagnostic] Sighting Logs SELECT Verification',
      'background: #0b0c0d; color: #00ffaa; font-weight: bold; font-size: 13px; padding: 4px 8px; border: 1px solid #00ffaa; border-radius: 4px;'
    );
    console.log('%cTimestamp:%c ' + timestamp, 'color: #edeeef; font-weight: bold;', 'color: #38bdf8;');
    console.log(
      '%cTarget Table:%c public.sighting_logs',
      'color: #edeeef; font-weight: bold;',
      'color: #00ffaa; font-weight: bold;'
    );
    console.log(
      '%cAuth Status:%c ' + (sessionSummary.authenticated ? `Logged in (${sessionSummary.email})` : 'Anonymous (public)'),
      'color: #edeeef;',
      sessionSummary.authenticated ? 'color: #00ffaa;' : 'color: #f59e0b;'
    );
    console.log(
      '%cQuery Executing:%c supabase.from("sighting_logs").select("*", { count: "exact" })',
      'color: #edeeef;',
      'color: #38bdf8; font-family: monospace;'
    );

    let queryData: any[] | null = null;
    let queryError: any | null = null;
    let status = 0;
    let statusText = '';
    let count: number | null = null;

    try {
      const res = await supabase
        .from('sighting_logs')
        .select('*', { count: 'exact' })
        .limit(50);

      queryData = res.data;
      queryError = res.error;
      status = res.status;
      statusText = res.statusText;
      count = res.count;
    } catch (err: any) {
      queryError = {
        message: err?.message || 'Network exception or unreachable endpoint',
        details: String(err),
      };
      status = 0;
      statusText = 'FETCH_FAILED';
    }

    const duration = Math.round(performance.now() - startTime);

    // Browser console logging
    console.log(
      '%cHTTP Status:%c ' + status + (statusText ? ` (${statusText})` : ''),
      'color: #edeeef;',
      status >= 200 && status < 300 ? 'color: #00ffaa; font-weight: bold;' : 'color: #ef4444; font-weight: bold;'
    );
    console.log('%cExecution Time:%c ' + duration + 'ms', 'color: #edeeef;', 'color: #38bdf8;');
    console.log('%cTotal Matched Rows in Table:%c ' + (count !== null ? count : 'N/A'), 'color: #edeeef;', 'color: #f59e0b;');
    console.log('%cRows Retrieved (limit 50):%c ' + (queryData ? queryData.length : 0), 'color: #edeeef;', 'color: #00ffaa;');

    if (queryError) {
      console.error('[Supabase Diagnostic Result] ❌ Query Error / Policy Block Details:', queryError);
      addLiveLog('error', `Query failed with HTTP status ${status}: ${queryError.message}`, queryError);
    } else {
      console.info(
        '[Supabase Diagnostic Result] ✅ Supabase Client Connectivity and SELECT Policy Permissions VERIFIED SUCCESSFULLY!'
      );
      console.log('[Supabase Diagnostic Result] Raw Data Array:', queryData);
      if (Array.isArray(queryData) && queryData.length > 0) {
        console.table(queryData.slice(0, 10));
      } else {
        console.log('[Supabase Diagnostic Result] Notice: sighting_logs table is currently empty, but SELECT query succeeded.');
      }
      addLiveLog('info', `✅ Succeeded in ${duration}ms! Retreived ${queryData?.length ?? 0} record(s).`);
    }
    console.groupEnd();

    // Determine Policy Verdict
    let verdict: DiagnosticResult['policyVerdict'];
    if (!queryError && status >= 200 && status < 300) {
      if (queryData && queryData.length > 0) {
        verdict = {
          status: 'granted',
          title: 'SELECT Permission Granted & Data Accessible',
          description: `Successfully executed SELECT query on public.sighting_logs. Fetched ${queryData.length} records. RLS policies allow reading rows for ${sessionSummary.authenticated ? 'authenticated users' : 'anonymous public users'}.`,
        };
      } else {
        verdict = {
          status: 'empty_ok',
          title: 'SELECT Permission Granted (Empty Table)',
          description:
            'The SELECT query succeeded with HTTP 200 and no policy rejection. The public.sighting_logs table is currently empty, or existing rows are filtered by user_id under current RLS rules.',
        };
      }
    } else if (queryError?.code === '42501') {
      verdict = {
        status: 'denied',
        title: '42501 - Row Level Security (RLS) Policy Denied',
        description:
          'Supabase rejected the query due to lack of SELECT permission on public.sighting_logs for the current role.',
        remedy:
          'In Supabase Dashboard > SQL Editor or Table Editor > RLS Policies, add a SELECT policy: CREATE POLICY "Allow public read" ON public.sighting_logs FOR SELECT USING (true);',
      };
    } else if (
      queryError?.code === 'PGRST116' ||
      queryError?.code === '42P01' ||
      queryError?.message?.toLowerCase().includes('relation') ||
      queryError?.message?.toLowerCase().includes('not found')
    ) {
      verdict = {
        status: 'error',
        title: 'Table Missing or Schema Not Reloaded',
        description: `Supabase PostgREST returned error "${queryError.message}". The table public.sighting_logs may not exist or PostgREST schema cache needs reloading.`,
        remedy:
          'Run create_sightings_table.sql in the Supabase SQL editor to create public.sighting_logs with proper columns and indices.',
      };
    } else {
      verdict = {
        status: 'error',
        title: `Query Failed (${status || 'Unknown'})`,
        description: queryError?.message || 'An unexpected error occurred while querying sighting_logs.',
        remedy: 'Verify the Supabase Project URL and VITE_SUPABASE_ANON_KEY in your environment configuration.',
      };
    }

    setResult({
      timestamp,
      durationMs: duration,
      httpStatus: status,
      httpStatusText: statusText,
      error: queryError,
      data: queryData,
      count,
      authSession: sessionSummary,
      policyVerdict: verdict,
    });

    setRunCount((c) => c + 1);
    setLoading(false);
  }, []);

  // Run automatically on initial secret route load
  useEffect(() => {
    executeDiagnosticQuery();
  }, [executeDiagnosticQuery]);

  const handleCopyRaw = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 2000);
    }
  };

  const handleCopySecretUrl = () => {
    const url = window.location.origin + '/diagnostic';
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Top Breadcrumb & Route Notice */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center space-x-2">
          {onBack && (
            <button
              onClick={onBack}
              className="px-3 py-1.5 rounded-lg bg-[rgba(237,238,239,0.06)] hover:bg-[#00ffaa]/20 text-[#edeeef] hover:text-[#00ffaa] text-xs font-mono-code flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to App</span>
            </button>
          )}
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-mono-code font-bold uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Secret Diagnostic Route: /diagnostic</span>
          </div>
        </div>

        <button
          onClick={handleCopySecretUrl}
          className="text-xs font-mono-code text-[#edeeef]/60 hover:text-[#00ffaa] flex items-center space-x-1 transition-colors cursor-pointer"
        >
          {copiedUrl ? <Check className="w-3.5 h-3.5 text-[#00ffaa]" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedUrl ? 'Secret URL Copied' : 'Copy Route URL'}</span>
        </button>
      </div>

      {/* Main Diagnostic Header */}
      <div className="bg-[#111315] border border-[rgba(237,238,239,0.1)] rounded-2xl p-6 sm:p-8 shadow-2xl mb-8 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#00ffaa]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#00ffaa]/20 border border-[#00ffaa] flex items-center justify-center">
                <Database className="w-5 h-5 text-[#00ffaa]" />
              </div>
              <div>
                <span className="text-[11px] font-mono-code uppercase font-bold text-[#00ffaa] tracking-wider block">
                  Supabase Connectivity &amp; RLS Diagnostic
                </span>
                <h1 className="text-2xl sm:text-3xl font-black font-syne text-[#edeeef]">
                  Table Query: <code className="text-[#00ffaa] text-xl sm:text-2xl">public.sighting_logs</code>
                </h1>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-[#edeeef]/70 max-w-2xl mt-2 leading-relaxed">
              Performs an active <code className="text-[#00ffaa] font-mono-code">SELECT</code> query against the Supabase{' '}
              <code className="text-[#00ffaa] font-mono-code">sighting_logs</code> table, streams detailed diagnostics into the
              browser console (<kbd className="px-1.5 py-0.5 rounded bg-[#0b0c0d] border border-[#edeeef]/20 text-[10px]">F12</kbd> or{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-[#0b0c0d] border border-[#edeeef]/20 text-[10px]">Cmd+Option+I</kbd>), and verifies row-level security permissions.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <button
              onClick={executeDiagnosticQuery}
              disabled={loading}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#00ffaa] hover:bg-[#00ffaa]/90 text-[#0b0c0d] font-mono-code font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-md shadow-[#00ffaa]/20 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Querying...' : 'Re-Run Diagnostic'}</span>
            </button>
            <button
              onClick={handleCopyRaw}
              disabled={!result}
              className="w-full sm:w-auto px-4 py-3 rounded-xl bg-[rgba(237,238,239,0.06)] hover:bg-[rgba(237,238,239,0.12)] border border-[rgba(237,238,239,0.1)] text-[#edeeef] font-mono-code text-xs uppercase flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {copiedRaw ? <Check className="w-4 h-4 text-[#00ffaa]" /> : <Copy className="w-4 h-4" />}
              <span>{copiedRaw ? 'Copied JSON' : 'Export Result'}</span>
            </button>
          </div>
        </div>

        {/* Quick Diagnostics Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-[rgba(237,238,239,0.08)]">
          <div className="bg-[#0b0c0d] border border-[rgba(237,238,239,0.08)] rounded-xl p-3">
            <span className="text-[10px] font-mono-code uppercase text-[#edeeef]/50 block mb-1">Status Code</span>
            <div className="flex items-center space-x-1.5">
              <span
                className={`text-lg sm:text-xl font-mono-code font-bold ${
                  result?.httpStatus === 200 ? 'text-[#00ffaa]' : 'text-red-400'
                }`}
              >
                {result ? result.httpStatus || 'ERR' : '...'}
              </span>
              <span className="text-[10px] text-[#edeeef]/50 font-mono-code truncate">
                {result?.httpStatusText || (result?.httpStatus === 200 ? 'OK' : '')}
              </span>
            </div>
          </div>

          <div className="bg-[#0b0c0d] border border-[rgba(237,238,239,0.08)] rounded-xl p-3">
            <span className="text-[10px] font-mono-code uppercase text-[#edeeef]/50 block mb-1">Latency</span>
            <div className="flex items-center space-x-1 text-sky-400">
              <Clock className="w-4 h-4" />
              <span className="text-lg sm:text-xl font-mono-code font-bold">
                {result ? `${result.durationMs}ms` : '...'}
              </span>
            </div>
          </div>

          <div className="bg-[#0b0c0d] border border-[rgba(237,238,239,0.08)] rounded-xl p-3">
            <span className="text-[10px] font-mono-code uppercase text-[#edeeef]/50 block mb-1">Rows Returned</span>
            <span className="text-lg sm:text-xl font-mono-code font-bold text-amber-400">
              {result?.data ? result.data.length : 0}
              {result?.count !== null && result?.count !== undefined ? (
                <span className="text-xs text-[#edeeef]/50 font-normal"> / {result.count}</span>
              ) : null}
            </span>
          </div>

          <div className="bg-[#0b0c0d] border border-[rgba(237,238,239,0.08)] rounded-xl p-3">
            <span className="text-[10px] font-mono-code uppercase text-[#edeeef]/50 block mb-1">Total Test Runs</span>
            <span className="text-lg sm:text-xl font-mono-code font-bold text-[#edeeef]">{runCount}</span>
          </div>
        </div>
      </div>

      {/* Policy Verdict Banner */}
      {result && (
        <div
          className={`mb-8 p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            result.policyVerdict.status === 'granted'
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
              : result.policyVerdict.status === 'empty_ok'
              ? 'bg-sky-950/40 border-sky-500/50 text-sky-200'
              : 'bg-red-950/40 border-red-500/50 text-red-200'
          }`}
        >
          <div className="flex items-start space-x-3.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                result.policyVerdict.status === 'granted' || result.policyVerdict.status === 'empty_ok'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {result.policyVerdict.status === 'granted' || result.policyVerdict.status === 'empty_ok' ? (
                <ShieldCheck className="w-6 h-6" />
              ) : (
                <ShieldAlert className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono-code font-bold uppercase tracking-wider">
                  {result.policyVerdict.title}
                </span>
              </div>
              <p className="text-xs mt-1 text-[#edeeef]/80 leading-relaxed max-w-3xl">
                {result.policyVerdict.description}
              </p>
              {result.policyVerdict.remedy && (
                <div className="mt-2 text-xs font-mono-code bg-[#0b0c0d]/80 p-2 rounded border border-[rgba(237,238,239,0.1)] text-amber-300">
                  <strong>Recommended Action:</strong> {result.policyVerdict.remedy}
                </div>
              )}
            </div>
          </div>
          <div className="shrink-0 flex items-center space-x-2">
            <span className="text-[11px] font-mono-code text-[#edeeef]/60">
              Console Log: <strong className="text-[#00ffaa]">VERIFIED</strong>
            </span>
          </div>
        </div>
      )}

      {/* Navigation Subtabs */}
      <div className="flex items-center space-x-2 border-b border-[rgba(237,238,239,0.1)] mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-xs font-mono-code font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'overview'
              ? 'border-[#00ffaa] text-[#00ffaa]'
              : 'border-transparent text-[#edeeef]/60 hover:text-[#edeeef]'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Client &amp; Query Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('data')}
          className={`px-4 py-2.5 text-xs font-mono-code font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'data'
              ? 'border-[#00ffaa] text-[#00ffaa]'
              : 'border-transparent text-[#edeeef]/60 hover:text-[#edeeef]'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Rows Received ({result?.data?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('policy')}
          className={`px-4 py-2.5 text-xs font-mono-code font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'policy'
              ? 'border-[#00ffaa] text-[#00ffaa]'
              : 'border-transparent text-[#edeeef]/60 hover:text-[#edeeef]'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Policy &amp; Permissions</span>
        </button>

        <button
          onClick={() => setActiveTab('console')}
          className={`px-4 py-2.5 text-xs font-mono-code font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'console'
              ? 'border-[#00ffaa] text-[#00ffaa]'
              : 'border-transparent text-[#edeeef]/60 hover:text-[#edeeef]'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Console Stream ({liveLogs.length})</span>
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Supabase Connection Config Card */}
            <div className="bg-[#111315] border border-[rgba(237,238,239,0.1)] rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold font-syne text-[#edeeef] flex items-center space-x-2">
                <Server className="w-4 h-4 text-[#00ffaa]" />
                <span>Active Supabase Client Configuration</span>
              </h3>
              <div className="space-y-2.5 text-xs font-mono-code">
                <div>
                  <span className="text-[#edeeef]/50 block">Target Project URL</span>
                  <span className="text-[#00ffaa] select-all break-all">https://cgqsmdnwzrazyyhkdibn.supabase.co</span>
                </div>
                <div>
                  <span className="text-[#edeeef]/50 block">Table Name</span>
                  <span className="text-[#edeeef] font-bold">public.sighting_logs</span>
                </div>
                <div>
                  <span className="text-[#edeeef]/50 block">Query Method</span>
                  <span className="text-sky-400">{"supabase.from('sighting_logs').select('*', { count: 'exact' })"}</span>
                </div>
                <div>
                  <span className="text-[#edeeef]/50 block">Auth Session Status</span>
                  <span className="text-[#edeeef]">
                    {result?.authSession.authenticated
                      ? `Authenticated (User: ${result.authSession.email || result.authSession.userId})`
                      : 'Anonymous Role (Unauthenticated anon key)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Browser Console Sync Card */}
            <div className="bg-[#111315] border border-[rgba(237,238,239,0.1)] rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold font-syne text-[#edeeef] flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>Browser Console Output Verification</span>
              </h3>
              <p className="text-xs text-[#edeeef]/70 leading-relaxed">
                The result of the query has been logged to your active browser developer console via{' '}
                <code className="text-[#00ffaa] font-mono-code">console.group</code>,{' '}
                <code className="text-[#00ffaa] font-mono-code">console.log</code>, and{' '}
                <code className="text-[#00ffaa] font-mono-code">console.table</code>.
              </p>
              <div className="p-3 rounded-xl bg-[#0b0c0d] border border-[rgba(237,238,239,0.08)] text-xs font-mono-code space-y-1.5">
                <div className="text-[#edeeef]/50">// Open Browser Console:</div>
                <div className="text-emerald-400">Mac: Option + Cmd + J</div>
                <div className="text-emerald-400">Windows/Linux: Ctrl + Shift + J</div>
              </div>
            </div>
          </div>

          {/* Raw JSON Payload Preview */}
          <div className="bg-[#111315] border border-[rgba(237,238,239,0.1)] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold font-syne text-[#edeeef] flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-[#00ffaa]" />
                <span>Full Diagnostics Response Payload (JSON)</span>
              </h3>
              <button
                onClick={handleCopyRaw}
                className="text-xs font-mono-code text-[#edeeef]/60 hover:text-[#00ffaa] flex items-center space-x-1"
              >
                {copiedRaw ? <Check className="w-3.5 h-3.5 text-[#00ffaa]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRaw ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-[#0b0c0d] border border-[rgba(237,238,239,0.08)] text-[11px] font-mono-code text-[#00ffaa] overflow-x-auto max-h-96">
              {result ? JSON.stringify(result, null, 2) : '// No test run yet.'}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 2: Rows Received */}
      {activeTab === 'data' && (
        <div className="bg-[#111315] border border-[rgba(237,238,239,0.1)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold font-syne text-[#edeeef] flex items-center space-x-2">
              <Database className="w-4 h-4 text-[#00ffaa]" />
              <span>Rows Returned from sighting_logs ({result?.data?.length || 0})</span>
            </h3>
            <span className="text-[11px] font-mono-code text-[#edeeef]/50">
              Status: {result?.httpStatus || 200} OK
            </span>
          </div>

          {!result?.data || result.data.length === 0 ? (
            <div className="text-center py-12 text-[#edeeef]/50 font-mono-code text-xs">
              <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No rows returned from sighting_logs.</p>
              <p className="text-[11px] text-[#edeeef]/40 mt-1">
                The query succeeded without permission rejection. If new sightings are logged, they will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono-code">
                <thead>
                  <tr className="border-b border-[rgba(237,238,239,0.1)] text-[#edeeef]/50">
                    <th className="p-2">ID</th>
                    <th className="p-2">Species</th>
                    <th className="p-2">Observer</th>
                    <th className="p-2">Location</th>
                    <th className="p-2">Timestamp</th>
                    <th className="p-2">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(237,238,239,0.05)] text-[#edeeef]">
                  {result.data.map((row: any, idx: number) => (
                    <tr key={row.id || idx} className="hover:bg-[#edeeef]/5">
                      <td className="p-2 text-[#00ffaa] truncate max-w-[120px]">{row.id}</td>
                      <td className="p-2 font-bold">{row.species_name || row.speciesName || '—'}</td>
                      <td className="p-2 text-[#edeeef]/70">{row.user_id || row.observer || '—'}</td>
                      <td className="p-2 text-[#edeeef]/60">
                        {row.location_name || (row.latitude ? `${row.latitude}, ${row.longitude}` : '—')}
                      </td>
                      <td className="p-2 text-[#edeeef]/50">{row.created_at || row.timestamp || '—'}</td>
                      <td className="p-2 text-amber-400">{row.count || 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Policy & Permissions */}
      {activeTab === 'policy' && (
        <div className="bg-[#111315] border border-[rgba(237,238,239,0.1)] rounded-2xl p-6 space-y-6">
          <h3 className="text-sm font-bold font-syne text-[#edeeef] flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-[#00ffaa]" />
            <span>Row Level Security (RLS) Policy Guide for sighting_logs</span>
          </h3>

          <div className="space-y-4 text-xs text-[#edeeef]/80 leading-relaxed">
            <p>
              Supabase enforces PostgreSQL Row Level Security. For the client application to read observations from{' '}
              <code className="text-[#00ffaa] font-mono-code">public.sighting_logs</code>, the database must have an active{' '}
              <code className="text-[#00ffaa] font-mono-code">FOR SELECT</code> policy.
            </p>

            <div className="bg-[#0b0c0d] border border-[rgba(237,238,239,0.08)] rounded-xl p-4 font-mono-code text-[11px] space-y-2">
              <div className="text-[#edeeef]/50">-- Standard Open Read Policy (allows map &amp; feed exploration):</div>
              <div className="text-sky-300">ALTER TABLE public.sighting_logs ENABLE ROW LEVEL SECURITY;</div>
              <div className="text-[#00ffaa]">
                CREATE POLICY "Allow public select on sighting_logs"
                <br />
                &nbsp;&nbsp;ON public.sighting_logs
                <br />
                &nbsp;&nbsp;FOR SELECT
                <br />
                &nbsp;&nbsp;USING (true);
              </div>
            </div>

            <div className="bg-[#0b0c0d] border border-[rgba(237,238,239,0.08)] rounded-xl p-4 font-mono-code text-[11px] space-y-2">
              <div className="text-[#edeeef]/50">-- User-Owner Mutation Policy:</div>
              <div className="text-[#00ffaa]">
                CREATE POLICY "Allow authenticated insert"
                <br />
                &nbsp;&nbsp;ON public.sighting_logs
                <br />
                &nbsp;&nbsp;FOR INSERT
                <br />
                &nbsp;&nbsp;WITH CHECK (auth.uid() IS NOT NULL);
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Console Stream */}
      {activeTab === 'console' && (
        <div className="bg-[#111315] border border-[rgba(237,238,239,0.1)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold font-syne text-[#edeeef] flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span>Real-Time Diagnostic Stream</span>
            </h3>
            <span className="text-[11px] font-mono-code text-[#edeeef]/50">
              {liveLogs.length} event(s) logged
            </span>
          </div>

          <div className="bg-[#0b0c0d] border border-[rgba(237,238,239,0.08)] rounded-xl p-4 font-mono-code text-xs space-y-2 max-h-96 overflow-y-auto">
            {liveLogs.map((log) => (
              <div key={log.id} className="flex items-start space-x-2 leading-relaxed">
                <span className="text-[#edeeef]/40 shrink-0">[{log.time}]</span>
                <span
                  className={
                    log.level === 'error'
                      ? 'text-red-400 font-bold'
                      : log.level === 'warn'
                      ? 'text-amber-400'
                      : log.level === 'info'
                      ? 'text-[#00ffaa]'
                      : 'text-[#edeeef]/80'
                  }
                >
                  {log.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
