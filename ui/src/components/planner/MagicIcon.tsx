import React from 'react';
import { Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface MagicIconProps {
  /**
   * Handler za klik na ikonu
   */
  onClick: () => void;
  
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
 * Badge/Button stil s ikonom i tekstom "AI ko-autor" koji se prikazuje pored input polja u Planner modu.
 * Koristi Sparkles ikonu iz Lucide React biblioteke.
 */
export function MagicIcon({ 
  onClick, 
  className, 
  tooltip = "AI ko-autor",
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
        "bg-primary/10 text-primary",
        "rounded-full",
        "hover:bg-primary/20",
        "transition-colors",
        "cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary/10",
        className
      )}
      aria-label={tooltip}
    >
      <Sparkles className="size-3.5" />
      <span>AI ko-autor</span>
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

