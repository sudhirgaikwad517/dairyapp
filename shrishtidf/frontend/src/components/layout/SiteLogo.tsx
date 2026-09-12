import { Link } from "react-router-dom";

const logo = "/assets/logo.webp";

export function SiteLogo({ className = "h-16 w-auto" }: { className?: string }) {
  return (
    <Link to="/">
      <img
        src={logo}
        alt="Shrishti Dairy Farm"
        className={className}
        width={200}
        height={200}
      />
    </Link>
  );
}
