import { memo, type ReactNode } from "react";
import { Link } from "react-router-dom";

type Action =
  | {
      label: string;
      to: string;
      variant?: "primary" | "secondary";
    }
  | {
      label: string;
      onClick: () => void;
      variant?: "primary" | "secondary";
    };

interface PageStateProps {
  title: string;
  description: string;
  tone?: "default" | "warning" | "error";
  action?: Action;
  children?: ReactNode;
}

export const PageState = memo(function PageState({
  title,
  description,
  tone = "default",
  action,
  children
}: PageStateProps) {
  const actionClassName = action?.variant === "primary" ? "primary-button" : "secondary-button";

  return (
    <section className={`page-state page-state-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <div className="page-state-content">
        <p className="eyebrow">Prompt Studio</p>
        <h2>{title}</h2>
        <p className="page-copy">{description}</p>
        {action ? (
          "to" in action ? (
            <Link to={action.to} className={actionClassName}>
              {action.label}
            </Link>
          ) : (
            <button type="button" className={actionClassName} onClick={action.onClick}>
              {action.label}
            </button>
          )
        ) : null}
        {children}
      </div>
    </section>
  );
});
