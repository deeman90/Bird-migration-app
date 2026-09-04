import React from 'react';
import { ShieldAlert, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('BMA Uncaught ErrorBoundary Exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCacheAndReload = () => {
    try {
      localStorage.removeItem('aerotrack_user');
      localStorage.removeItem('aerotrack_sightings');
      localStorage.removeItem('aerotrack_rewards');
      sessionStorage.clear();
    } catch (e) {
      console.warn('Could not clear storage:', e);
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0b0c0d] text-[#edeeef] flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-[#111214] border border-rose-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <span className="font-mono-code text-[11px] text-rose-400 font-bold uppercase tracking-wider">
                  Application Recovery
                </span>
                <h1 className="font-syne font-extrabold text-xl sm:text-2xl text-[#edeeef] tracking-tight">
                  Something went wrong
                </h1>
              </div>
            </div>

            <p className="font-mono-code text-xs text-[#edeeef]/70 leading-relaxed">
              An unexpected runtime error occurred while rendering the interface. You can reload the application or reset cached state to restore normal operation.
            </p>

            {this.state.error && (
              <div className="bg-[#0b0c0d] border border-[rgba(237,238,239,0.1)] rounded-lg p-3 font-mono-code text-xs text-rose-300 max-h-40 overflow-y-auto break-words">
                <p className="font-bold text-rose-200">Error: {this.state.error.message || 'Unknown error'}</p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-[10px] text-[#edeeef]/50 mt-2 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack.slice(0, 300)}...
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded bg-[#00ffaa] hover:bg-[#00ffaa]/90 text-[#0b0c0d] font-syne font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-[#00ffaa]/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload App</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetCacheAndReload}
                className="min-h-[44px] px-4 py-2.5 rounded bg-[rgba(237,238,239,0.05)] hover:bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono-code text-xs uppercase font-bold tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Reset Cache</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
