import { ReactNode } from "react";

export interface SegmentedControlItem<T = string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedControlProps<T = string> {
  items: SegmentedControlItem<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}

export function SegmentedControl<T = string>({
  items,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      className="segmented-control"
      style={
        {
          "--segment-count": items.length,
        } as React.CSSProperties
      }
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <button
          key={String(item.value)}
          type="button"
          className={`segmented-control__item${
            value === item.value ? " segmented-control__item--active" : ""
          }`}
          onClick={() => onChange(item.value)}
          role="tab"
          aria-selected={value === item.value}
        >
          {item.icon && (
            <span className="segmented-control__icon" aria-hidden="true">
              {item.icon}
            </span>
          )}
          <span className="segmented-control__label">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
