import React from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '../ui';
import { captureClientError } from '../../services/sentry';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary captured runtime error:', error, errorInfo);
    captureClientError(error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-slate-100">
                Щось пішло не так
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Виникла неочікувана помилка при відображенні календаря. Спробуйте оновити застосунок.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-left text-xs text-rose-300 font-mono overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                variant="primary"
                onClick={this.handleReload}
                icon={<RefreshCw className="w-4 h-4" />}
                className="flex-1 text-xs font-semibold"
              >
                Оновити застосунок
              </Button>
              <Button
                variant="ghost"
                onClick={this.handleResetAndReload}
                icon={<Trash2 className="w-4 h-4" />}
                className="text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-950/20"
                title="Очистити локальний кеш і перезавантажити"
              >
                Очистити кеш
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
