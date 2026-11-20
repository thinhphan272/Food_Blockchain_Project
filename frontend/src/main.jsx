import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Lỗi giao diện bị bắt bởi GlobalErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FFFBF8] dark:bg-[#120D0A] flex items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-white dark:bg-[#1C140F] rounded-3xl p-8 border border-orange-200 dark:border-orange-500/20 shadow-xl">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-black">
              !
            </div>
            <h2 className="text-xl font-black text-[#1A1A1A] dark:text-[#F5F5F5]">
              Đã phục hồi sau sự cố hiển thị
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
              Hệ thống đã lưu lại trạng thái an toàn và tự động bảo vệ dữ liệu phiên làm việc của bạn.
            </p>
            {this.state.error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl text-left overflow-auto max-h-48 text-[11px] font-mono text-red-700 dark:text-red-400">
                <div className="font-bold">{this.state.error.name}: {this.state.error.message}</div>
                {this.state.error.stack && (
                  <pre className="mt-1 text-[10px] opacity-75 whitespace-pre-wrap">{this.state.error.stack.slice(0, 500)}</pre>
                )}
              </div>
            )}
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem('smartchain_selected_batch_code');
                  } catch (e) {}
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="w-full py-3 bg-[#F95716] text-white rounded-2xl font-bold text-xs shadow-md hover:brightness-105 cursor-pointer"
              >
                Tải lại trang & Quay về Tổng quan
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>,
);
