import { forwardRef } from "react";
import { IMaskInput } from "react-imask";
import { Input } from "@/components/ui/input";

interface MaskedInputProps {
  mask: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
}

export const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, value, onChange, onBlur, placeholder, className }, ref) => {
    return (
      <IMaskInput
        mask={mask}
        value={value}
        onAccept={(value: string) => onChange(value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={className}
        inputRef={ref as unknown as React.Ref<HTMLElement>}
        {...({ as: Input } as unknown as Record<string, unknown>)}
      />
    );
  }
);

MaskedInput.displayName = "MaskedInput";



























