interface SkeletonProps {
  width?: string;
  height?: string;
  radius?: string;
  circle?: boolean;
  animated?: boolean;
  className?: string;
}

export function Skeleton({
  width,
  height,
  radius,
  circle = false,
  animated = true,
  className,
}: SkeletonProps) {
  const style: React.CSSProperties = {
    width: circle ? (width ?? "1rem") : (width ?? "100%"),
    height: circle ? (width ?? "1rem") : (height ?? "1rem"),
    borderRadius: circle ? "999px" : (radius ?? "var(--radius-button)"),
  };

  return (
    <div
      className={`skeleton${animated ? " skeleton--animated" : ""}${className ? ` ${className}` : ""}`}
      style={style}
      aria-hidden="true"
    />
  );
}
