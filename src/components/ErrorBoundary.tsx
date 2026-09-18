import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('WatchIt ErrorBoundary caught an unexpected error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-canvas,#0c0e12)] text-[var(--text-primary,#f1f5f9)]">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[var(--bg-card,#14171f)] border border-[var(--border-strong,#272b38)] shadow-2xl space-y-5 text-center">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold">Đã xảy ra lỗi giao diện</h2>
              <p className="text-xs text-[var(--text-secondary,#94a3b8)]">
                Một thành phần hiển thị gặp sự cố ngoài dự kiến. Dữ liệu dịch vụ của bạn vẫn an toàn.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-lg bg-[var(--bg-canvas,#0c0e12)] border border-[var(--border-subtle,#1e2330)] text-left font-mono text-[11px] text-rose-300 overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center gap-3 justify-center pt-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-lg bg-[var(--bg-elevated,#1b202c)] hover:bg-[var(--bg-card-hover,#242b3b)] text-xs font-medium text-[var(--text-secondary,#cbd5e1)] border border-[var(--border-subtle,#1e2330)] transition-colors cursor-pointer"
              >
                Thử lại
              </button>
              <button
                onClick={this.handleReload}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent,#22c55e)] hover:opacity-90 text-xs font-semibold text-white transition-opacity cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Tải lại trang</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
