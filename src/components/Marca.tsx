import logo from "@/assets/solar-agraco-logo.png.asset.json";

export function Marca({ className = "h-8" }: { className?: string }) {
  return (
    <img
      src={logo.url}
      alt="Solar Agraço"
      className={`${className} w-auto shrink-0 object-contain`}
      loading="eager"
      decoding="async"
    />
  );
}
