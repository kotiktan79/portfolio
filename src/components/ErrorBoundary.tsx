import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md w-full text-center border border-red-200 dark:border-red-900">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="text-red-600 dark:text-red-400" size={48} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Bir şeyler ters gitti
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Üzgünüz, bir hata oluştu. Lütfen sayfayı yenileyin.
            </p>
            {this.state.error && (
              <div className="text-xs text-left p-3 bg-red-50 dark:bg-red-900/20 rounded-lg mb-4 font-mono text-red-800 dark:text-red-300 overflow-auto">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg hover:shadow-xl hover:scale-105"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
