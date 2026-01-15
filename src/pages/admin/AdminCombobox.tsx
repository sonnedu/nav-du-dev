import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type ComboboxOption = {
  value: string;
  label: string;
};

type AdminComboboxProps = {
  id?: string;
  className?: string;
  inputClassName?: string;
  listClassName?: string;
  placeholder?: string;
  ariaLabel?: string;

  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;

  allowCustomValue?: boolean;
  customValueLabel?: (value: string) => string;

  // New prop to control drop direction
  placement?: 'top' | 'bottom' | 'auto';
};

function normalize(input: string): string {
  return input.trim().toLowerCase();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function AdminCombobox(props: AdminComboboxProps) {
  const internalId = useId();
  const id = props.id ?? internalId;

  const { options, value, onChange, allowCustomValue, customValueLabel, placement = 'bottom' } = props;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const selectedLabel = useMemo(() => {
    return options.find((o) => o.value === value)?.label ?? '';
  }, [options, value]);

  const selectedIndexInOptions = useMemo(() => {
    return options.findIndex((o) => o.value === value);
  }, [options, value]);

  const [isOpen, setIsOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; maxHeight?: number; transform?: string } | null>(null);

  const filtered = useMemo(() => {
    const q = isDirty ? normalize(query) : '';
    if (!q) return options;
    return options.filter((o) => normalize(o.label).includes(q));
  }, [isDirty, options, query]);

  const customValue = query.trim();
  const showCustom =
    allowCustomValue === true &&
    isDirty &&
    normalize(customValue).length > 0 &&
    !options.some((o) => normalize(o.label) === normalize(customValue));

  const visibleOptions = useMemo(() => {
    if (!showCustom) return filtered;

    return [
      ...filtered,
      {
        value: customValue,
        label: customValueLabel ? customValueLabel(customValue) : customValue,
      },
    ];
  }, [customValue, filtered, customValueLabel, showCustom]);

  const activeOptionId = activeIndex >= 0 ? `${id}__opt__${activeIndex}` : undefined;

  const close = () => {
    setIsOpen(false);
    setIsDirty(false);
    setActiveIndex(-1);
    setQuery('');
    setCoords(null);
  };

  const calculateCoords = () => {
    if (rootRef.current && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;

      // Determine placement
      let finalPlacement = placement;
      if (placement === 'auto') {
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        // If less than 200px below and more space above, flip to top
        if (spaceBelow < 200 && spaceAbove > spaceBelow) {
          finalPlacement = 'top';
        } else {
          finalPlacement = 'bottom';
        }
      }

      if (finalPlacement === 'top') {
        setCoords({
          top: rect.top + scrollY - 4,
          left: rect.left + scrollX,
          width: rect.width,
          transform: 'translateY(-100%)', // Move up by 100% of its own height
          maxHeight: rect.top - 20, // Limit height to space above
        });
      } else {
        setCoords({
          top: rect.bottom + scrollY + 4,
          left: rect.left + scrollX,
          width: rect.width,
          maxHeight: window.innerHeight - rect.bottom - 20, // Limit height to space below
        });
      }
    }
  };

  const open = () => {
    calculateCoords();
    setIsOpen(true);
    setIsDirty(false);
    setQuery(selectedLabel);
    setActiveIndex(selectedIndexInOptions >= 0 ? selectedIndexInOptions : options.length > 0 ? 0 : -1);
  };

  const handlePick = (value: string) => {
    onChange(value);
    close();
  };

  useEffect(() => {
    if (!isOpen) return;
    if (activeIndex < 0) return;
    // Delay scroll slightly to ensure portal is rendered
    requestAnimationFrame(() => {
      const el = document.getElementById(`${id}__opt__${activeIndex}`);
      if (el) el.scrollIntoView({ block: 'nearest' });
    });
  }, [activeIndex, id, isOpen]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      // Check if click is inside input/toggle (rootRef)
      if (rootRef.current && rootRef.current.contains(e.target as Node)) return;
      // Check if click is inside portal list (listRef)
      if (listRef.current && listRef.current.contains(e.target as Node)) return;

      close();
    };

    const onResizeOrScroll = () => {
      if (isOpen) {
        // Simple strategy: close on scroll/resize to avoid complex positioning logic
        // or recalculate. For now, closing is safer for mobile/dnd contexts.
        // Actually, recalculating is better UX but requires debounce.
        // Let's just recalculate immediately.
        calculateCoords();
      }
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', onResizeOrScroll);
    window.addEventListener('scroll', onResizeOrScroll, { capture: true }); // capture needed for scrolling internal divs

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', onResizeOrScroll);
      window.removeEventListener('scroll', onResizeOrScroll, { capture: true });
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className={props.className}>
      <div className="admin-combobox-inputWrap">
        <input
          ref={inputRef}
          id={id}
          className={props.inputClassName}
          value={isOpen ? query : selectedLabel}
          placeholder={props.placeholder}
          aria-label={props.ariaLabel}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? `${id}__listbox` : undefined}
          aria-activedescendant={activeOptionId}
          autoComplete="off"
          onFocus={() => {
            if (!isOpen) open();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) {
              setIsOpen(true);
              calculateCoords();
            }
            setIsDirty(true);
            setActiveIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              close();
              inputRef.current?.blur();
              return;
            }

            if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (!isOpen) {
                open();
                return;
              }

              const max = Math.max(visibleOptions.length - 1, 0);
              setActiveIndex((v) => clamp(v + 1, 0, max));
              return;
            }

            if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (!isOpen) {
                open();
                return;
              }

              const max = Math.max(visibleOptions.length - 1, 0);
              setActiveIndex((v) => clamp(v - 1, 0, max));
              return;
            }

            if (e.key === 'Home' && isOpen) {
              e.preventDefault();
              if (visibleOptions.length > 0) setActiveIndex(0);
              return;
            }

            if (e.key === 'End' && isOpen) {
              e.preventDefault();
              if (visibleOptions.length > 0) setActiveIndex(visibleOptions.length - 1);
              return;
            }

            if (e.key === 'Enter' && isOpen) {
              e.preventDefault();
              const option = visibleOptions[activeIndex];
              if (option) handlePick(option.value);
              return;
            }

            if (e.key === 'Tab') {
              close();
            }
          }}
        />

        <button
          type="button"
          className="admin-combobox-toggle"
          aria-label="toggle"
          aria-expanded={isOpen}
          tabIndex={-1}
          onClick={() => {
            if (isOpen) {
              close();
            } else {
              open();
              inputRef.current?.focus();
            }
          }}
        >
          ▾
        </button>
      </div>

      {isOpen && coords
        ? createPortal(
            <div
              ref={listRef}
              id={`${id}__listbox`}
              className={props.listClassName}
              role="listbox"
              aria-label="options"
              style={{
                position: 'absolute',
                top: coords.top,
                left: coords.left,
                width: coords.width,
                marginTop: 0,
                maxHeight: coords.maxHeight ? `${coords.maxHeight}px` : undefined,
                transform: coords.transform,
              }}
            >
              {visibleOptions.map((o, index) => (
                <button
                  key={`${o.value}:${index}`}
                  id={`${id}__opt__${index}`}
                  type="button"
                  className={`admin-combobox-option ${index === activeIndex ? 'is-active' : ''} ${o.value === value ? 'is-selected' : ''}`}
                  role="option"
                  aria-selected={o.value === value}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => handlePick(o.value)}
                >
                  {o.label}
                </button>
              ))}

              {visibleOptions.length === 0 ? <div className="admin-combobox-empty">No matches</div> : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
