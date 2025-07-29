interface ErrorAlertProps {
  title: string;
  message: string;
  onRetry?: () => void;
  type?: "error" | "warning" | "info";
}

const ErrorAlert = ({
  title,
  message,
  onRetry,
  type = "error",
}: ErrorAlertProps) => {
  const alertClass = {
    error: "alert-error",
    warning: "alert-warning",
    info: "alert-info",
  }[type];

  const iconClass = {
    error: "text-error-content",
    warning: "text-warning-content",
    info: "text-info-content",
  }[type];

  return (
    <div className={`alert ${alertClass} mb-4`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`stroke-current shrink-0 h-6 w-6 ${iconClass}`}
        fill="none"
        viewBox="0 0 24 24"
      >
        {type === "error" && (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        )}
        {type === "warning" && (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        )}
        {type === "info" && (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        )}
      </svg>
      <div>
        <h3 className="font-bold">{title}</h3>
        <div className="text-xs">{message}</div>
      </div>
      {onRetry && (
        <button className="btn btn-sm btn-outline" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
};

export default ErrorAlert;
