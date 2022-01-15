import {
  createEffect,
  createRenderEffect,
  createSignal,
  mergeProps,
  on,
} from "solid-js";

type Option = any;

type Value = any;

type ValueType = Value | Value[];

type SelectProps = {
  options: Option[];
  initialValue?: ValueType;
  multiple?: boolean;
  optionToValue?: (option: Option) => Value;
  createNewOption?: (inputValue: string) => Option;
  onChange?: (value: ValueType) => void;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
};

const createSelect = (props: SelectProps) => {
  const config = mergeProps(
    {
      multiple: false,
      optionToValue: (option: Option): Value => option,
    },
    props
  );

  const parseValue = (value: ValueType) => {
    if (config.multiple && Array.isArray(value)) {
      return value;
    } else if (!config.multiple && !Array.isArray(value)) {
      return value !== null ? [value] : [];
    } else {
      throw new Error(
        `Incompatible value type for ${
          config.multiple ? "multple" : "single"
        } select.`
      );
    }
  };

  const [_value, _setValue] = createSignal(
    config.initialValue ? parseValue(config.initialValue) : []
  );

  const value = () => (config.multiple ? _value() : _value()[0] || null);
  const setValue = (value: ValueType) => _setValue(parseValue(value));
  const clearValue = () => _setValue([]);

  createEffect(on(_value, () => config.onChange?.(value()), { defer: true }));

  const options = () => config.options;
  const optionsCount = () => options().length;

  const pickOption = (option: Option) => {
    const value = config.optionToValue(option);
    if (config.multiple) {
      setValue([..._value(), value]);
    } else {
      setValue(value);
    }
    close();
    hideInput();
  };

  const [inputValue, setInputValue] = createSignal("");
  const clearInputValue = () => setInputValue("");
  const [inputIsHidden, setInputIsHidden] = createSignal(false);
  const showInput = () => setInputIsHidden(false);
  const hideInput = () => setInputIsHidden(true);

  const [isOpen, setIsOpen] = createSignal(false);
  const open = () => {
    if (!isOpen()) {
      setIsOpen(true);
      showInput();
      if (focusedOptionIndex() === -1) {
        focusOption("next");
      }
    }
  };
  const close = () => {
    if (isOpen()) {
      setIsOpen(false);
      clearInputValue();
      setFocusedOptionIndex(-1);
    }
  };

  const [focusedOptionIndex, setFocusedOptionIndex] = createSignal(-1);

  const focusedOption = () => options()[focusedOptionIndex()];
  const isOptionFocused = (option: Option) => option === focusedOption();

  const focusOption = (direction: "next" | "previous") => {
    if (!optionsCount()) setFocusedOptionIndex(-1);

    const max = optionsCount() - 1;
    const delta = direction === "next" ? 1 : -1;
    let index = focusedOptionIndex() + delta;
    if (index > max) {
      index = 0;
    }
    if (index < 0) {
      index = max;
    }
    setFocusedOptionIndex(index);
    open();
  };

  const focusPreviousOption = () => focusOption("previous");
  const focusNextOption = () => focusOption("next");

  const controlRef = (element: HTMLElement) => {
    element.addEventListener("focusin", () => {
      showInput();
    });

    element.addEventListener("focusout", (event: FocusEvent) => {
      if (!element.contains(event.relatedTarget as HTMLElement)) {
        close();
      }
    });

    element.addEventListener("pointerdown", () => {
      open();
    });

    element.addEventListener("keydown", (event) => {
      switch (event.key) {
        case "ArrowDown":
          focusNextOption();
          break;
        case "ArrowUp":
          focusPreviousOption();
          break;
        case "Enter":
          if (isOpen() && focusedOption()) {
            pickOption(focusedOption());
            break;
          }
          return;
        case "Escape":
          if (isOpen()) {
            close();
            break;
          }
          return;
        case "Delete":
        case "Backspace":
          if (inputValue()) {
            return;
          }
          if (config.multiple) {
            const currentValue = value() as Value[];
            setValue([...currentValue.slice(0, -1)]);
          } else {
            clearValue();
          }
          break;
        case " ":
          if (inputValue()) {
            return;
          }
          if (!isOpen()) {
            open();
          } else {
            if (focusedOption()) {
              pickOption(focusedOption());
            }
          }
          break;
        default:
          return;
      }
      event.preventDefault();
      event.stopPropagation();
    });
  };

  const inputRef = (element: HTMLInputElement) => {
    createRenderEffect(() => (element.value = inputValue()));
    element.addEventListener("input", (event: Event) => {
      setInputValue((event.target as HTMLInputElement).value);
      open();
    });

    createRenderEffect(() => {
      element.style.setProperty("opacity", inputIsHidden() ? "0" : "1");
    });

    element.addEventListener("focus", (event: FocusEvent) => {
      if (config.onFocus) {
        config.onFocus(event);
      }
    });
    element.addEventListener("blur", (event: FocusEvent) => {
      if (config.onBlur) {
        config.onBlur(event);
      }
    });
  };

  return {
    get value() {
      return value();
    },
    get options() {
      return options();
    },
    get inputValue() {
      return inputValue();
    },
    pickOption,
    isOptionFocused,
    isOpen,
    control: controlRef,
    input: inputRef,
  };
};

export { createSelect };