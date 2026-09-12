import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

type SiteSearchProps = {
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  onSearch?: () => void;
};

export function SiteSearch({
  className = "",
  inputClassName = "",
  placeholder = "Search for A2 milk, ghee, paneer…",
  onSearch,
}: SiteSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const submit = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`/products?q=${encodeURIComponent(trimmed)}`);
    onSearch?.();
  }, [navigate, onSearch, query]);

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        className={inputClassName}
        aria-label="Search products"
      />
    </div>
  );
}

export function useSyncSearchQuery(searchQuery?: string) {
  const [query, setQuery] = useState(searchQuery ?? "");

  useEffect(() => {
    setQuery(searchQuery ?? "");
  }, [searchQuery]);

  return query;
}
