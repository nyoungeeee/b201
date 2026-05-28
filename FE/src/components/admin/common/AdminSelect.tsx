import { useState, type ReactNode } from "react";

import { AdminChevronDownIcon } from "../icons";

export type AdminSelectOption<T extends string = string> = {
  value: T;
  label: string;
};

type AdminSelectProps<T extends string = string> = {
  value: T;
  options: AdminSelectOption<T>[];
  onChange: (value: T) => void;
  icon?: ReactNode;
  className?: string;
  disabled?: boolean;
};

const AdminSelect = <T extends string>({
  value,
  options,
  onChange,
  icon,
  className = "admin-select-chip",
  disabled = false,
}: AdminSelectProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];
  const handleSelect = (nextValue: T) => {
    setIsOpen(false);
    onChange(nextValue);
  };

  return (
    <div
      className={`${className} admin-custom-select${isOpen ? " is-open" : ""}${disabled ? " is-disabled" : ""}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false);
        }
      }}
    >
      <button
        className="admin-custom-select__button"
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        {icon}
        <span>{selectedOption?.label ?? ""}</span>
        <AdminChevronDownIcon size={22} />
      </button>
      {isOpen && !disabled && (
        <div className="admin-custom-select__menu" role="listbox">
          {options.map((option) => (
            <button
              className={option.value === value ? "is-selected" : ""}
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSelect;
