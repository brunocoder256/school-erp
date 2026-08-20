import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface EntityToolbarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearch?: (value: string) => void;
  createLabel?: string;
  onCreate?: () => void;
  createDisabled?: boolean;
  extraActions?: React.ReactNode;
}

export function EntityToolbar({
  searchPlaceholder = "Search…",
  searchValue = "",
  onSearch,
  createLabel = "New",
  onCreate,
  createDisabled,
  extraActions,
}: EntityToolbarProps) {
  const searchId = useId();
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:w-64">
        <Input
          id={searchId}
          value={searchValue}
          onChange={(e) => onSearch?.(e.target.value)}
          placeholder={searchPlaceholder}
          className="peer ps-9"
          aria-label="Search"
        />
        <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex items-center gap-2">
        {extraActions}
        {onCreate ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={createDisabled}
            onClick={onCreate}
          >
            {createLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

// Inline search icon to avoid a hard dependency on an icon library.
function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="2" y2="2" />
    </svg>
  );
}
