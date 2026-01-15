import { useEffect, useId, useMemo, useRef, useState } from 'react';

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

  const { options, value, onChange, allowCustomValue, customValueLabel } = props;

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
  };

  const open = () => {
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

    const el = document.getElementById(`${id}__opt__${activeIndex}`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, id, isOpen]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current) return;
      if (e.target instanceof Node && rootRef.current.contains(e.target)) return;
      close();
    };

    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, []);

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
          onFocus={() => open()}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
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

      {isOpen ? (
        <div
          ref={listRef}
          id={`${id}__listbox`}
          className={props.listClassName}
          role="listbox"
          aria-label="options"
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
        </div>
      ) : null}
    </div>
  );
}
