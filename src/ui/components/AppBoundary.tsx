import { Component, Suspense, type PropsWithChildren, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { PageState } from "./PageState";

interface ErrorBoundaryProps extends PropsWithChildren {
  resetKey: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <PageState
          title="Something went wrong"
          description="This screen hit an unexpected error. You can retry this route or move back to a stable section."
          tone="error"
          action={{ label: "Reload route", onClick: () => window.location.reload(), variant: "primary" }}
        />
      );
    }

    return this.props.children;
  }
}

export function AppBoundary({ children }: PropsWithChildren) {
  const location = useLocation();

  return (
    <AppErrorBoundary resetKey={location.pathname}>
      <Suspense
        fallback={
          <PageState
            title="Loading workspace"
            description="Preparing the next Prompt Studio surface."
          />
        }
      >
        {children}
      </Suspense>
    </AppErrorBoundary>
  );
}
