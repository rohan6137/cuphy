import { BRAND } from "@/lib/brand";

type Props = {
  tone?: "dark" | "light";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizes = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
  xl: "h-20 w-20",
};

export default function BrandLogo({
  tone = "light",
  size = "md",
  className = "",
}: Props) {
  const src =
    tone === "dark"
      ? "/brand/cuphy-symbol-dark.svg"
      : "/brand/cuphy-symbol-light.svg";

  return (
    <img
      src={src}
      alt="CUPHY"
      className={`${sizes[size]} object-contain ${className}`}
      draggable={false}
    />
  );
}