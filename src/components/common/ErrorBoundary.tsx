import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onResetToDashboard?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

type ReactClassBase<P, S> = {
  props: P;
  state: S;
  setState: (state: Partial<S>) => void;
};

const ComponentBase = React.Component as unknown as new <P, S>(
  props: P
) => ReactClassBase<P, S>;

export class ErrorBoundary extends ComponentBase<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: "",
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || "An unexpected UI error occurred.",
    };
  }

  componentDidCatch(error: Error, errorInfo: unknown): void {
    console.error("[StudyPilot ErrorBoundary] Caught rendering error:", error, errorInfo);
  }

  handleRecover = () => {
    this.setState({ hasError: false, errorMessage: "" });
    if (this.props.onResetToDashboard) {
      this.props.onResetToDashboard();
    }
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="max-w-lg mx-auto my-12 p-6 rounded-xl bg-white dark:bg-[#21201C] border border-[#F3D2D2] dark:border-[#572B2B] shadow-xs text-center space-y-4">
          <div className="w-11 h-11 mx-auto rounded-xl bg-[#FDF2F2] dark:bg-[#3A1E1E] border border-[#F3D2D2] dark:border-[#572B2B] text-[#A83838] dark:text-[#E57373] flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-editorial text-lg font-bold text-[#22211F] dark:text-[#F5F3EE]">
              Something went wrong in this view
            </h3>
            <p className="text-xs text-[#78736A] dark:text-[#A6A096] leading-relaxed">
              StudyPilot caught a rendering error while preserving your saved study data.
            </p>
            {this.state.errorMessage && (
              <p className="text-[11px] font-mono text-[#A83838] dark:text-[#E57373] bg-[#FDF2F2] dark:bg-[#3A1E1E] p-2.5 rounded-lg break-words border border-[#F3D2D2] dark:border-[#572B2B]">
                {this.state.errorMessage}
              </p>
            )}
          </div>
          <div className="flex items-center justify-center gap-2.5 pt-1">
            <button
              onClick={() => this.setState({ hasError: false, errorMessage: "" })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E9E5DE] dark:border-[#32302B] hover:bg-[#FAF8F4] dark:hover:bg-[#2A2823] text-xs font-medium text-[#22211F] dark:text-[#F5F3EE] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry View</span>
            </button>
            {this.props.onResetToDashboard && (
              <button
                onClick={this.handleRecover}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#22211F] hover:bg-[#363430] dark:bg-[#F5F3EE] dark:hover:bg-[#E6E2DA] text-white dark:text-[#1C1B18] text-xs font-medium cursor-pointer"
              >
                <span>Return to Overview</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
