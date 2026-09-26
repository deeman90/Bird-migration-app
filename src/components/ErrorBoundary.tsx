import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[ErrorBoundary caught]', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleClearCacheAndReset = () => {
    try {
      localStorage.removeItem('aerotrack_sightings');
      localStorage.removeItem('aerotrack_user');
      localStorage.removeItem('aerotrack_rewards');
    } catch (e) {
      console.warn('Could not clear localStorage:', e);
    }
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0b0c0d] text-[#edeeef] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold font-syne mb-2">Display Reset Required</h1>
          <p className="text-sm text-slate-400 max-w-md mb-4 leading-relaxed">
            The avian map or flyway observation view encountered a minor render refresh notice. Click reload below to restore the dashboard.
          </p>
          {this.state.error?.message && (
            <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg max-w-md text-xs font-mono-code text-rose-300 text-left overflow-auto max-h-32">
              {this.state.error.message}
            </div>
          )}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center space-x-2 transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload AeroTrack</span>
            </button>
            <button
              onClick={this.handleClearCacheAndReset}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-[#edeeef] font-mono-code text-xs flex items-center space-x-2 transition-colors cursor-pointer"
            >
              <span>Reset Local Cache</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
