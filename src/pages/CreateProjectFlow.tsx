import { Component, type ReactNode } from 'react';
import AIChatFlow from '@/components/AIChatFlow';
import { AppLayout } from '@/components/app/AppLayout';

// Error boundary to catch and display render crashes
class ChatErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AIChatFlow crash]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <h2 className="text-xl font-serif font-bold text-[#1B2432] mb-3">
              Something went wrong
            </h2>
            <p className="text-[#4A5568] mb-4">
              The project creator encountered an error. Please try refreshing.
            </p>
            <pre className="text-xs text-left bg-gray-100 p-3 rounded-lg overflow-auto max-h-40 mb-4">
              {this.state.error.message}
            </pre>
            <button
              onClick={() => {
                // Clear any stale session data that might cause the crash
                try { localStorage.removeItem('dexo_chat_session'); } catch {}
                window.location.reload();
              }}
              className="px-4 py-2 bg-[#C05621] text-white rounded-lg hover:bg-[#A84A1C] transition-colors"
            >
              Refresh & Clear Cache
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const CreateProjectFlow = () => {
  return (
    <AppLayout>
      <ChatErrorBoundary>
        <AIChatFlow />
      </ChatErrorBoundary>
    </AppLayout>
  );
};

export default CreateProjectFlow;
