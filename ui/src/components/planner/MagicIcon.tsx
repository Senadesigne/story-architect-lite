import { Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface MagicIconProps {
  /**
   * Handler za klik na ikonu
   */
  onClick: (e?: React.MouseEvent<HTMLButtonElement>) => void;

  /**
   * Dodatne CSS klase za pozicioniranje i stiliziranje
   */
  className?: string;

  /**
   * Opcionalni tooltip tekst koji se prikazuje na hover
   */
  tooltip?: string;

  /**
   * Da li je ikona onemogućena
   */
  disabled?: boolean;
}

/**
 * MagicIcon - Komponenta za otvaranje AI asistenta
 * 
 * Badge/Button stil s ikonom i tekstom "AI koautor" koji se prikazuje pored input polja u Planner modu.
 * Koristi Sparkles ikonu iz Lucide React biblioteke.
 */
export function MagicIcon({
  onClick,
  className,
  tooltip = "AI Co-author",
  disabled = false
}: MagicIconProps) {
  const iconButton = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5",
        "px-3 py-1.5",
        "text-xs font-medium",
        "bg-gradient-to-br from-primary/25 via-primary/18 to-primary/12",
        "text-primary",
        "rounded-md",
        "border border-primary/30",
        "hover:from-primary/35 hover:via-primary/28 hover:to-primary/22 hover:border-primary/40",
        "transition-all duration-300 ease-out",
        "cursor-pointer",
        "shadow-sm shadow-primary/10",
        "backdrop-blur-[0.5px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-primary/25 disabled:hover:via-primary/18 disabled:hover:to-primary/12",
        className
      )}
      aria-label={tooltip}
    >
      <Sparkles className="size-3.5" />
      <span>AI Co-author</span>
    </button>
  );

  // Ako postoji tooltip, wrap-aj button u Tooltip
  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {iconButton}
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return iconButton;
}
