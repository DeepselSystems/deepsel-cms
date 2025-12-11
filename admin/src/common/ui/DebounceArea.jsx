import {Textarea} from '@mantine/core';
import {useEffect, useRef, useState} from 'react';

export default function DebounceArea({
  value,
  onChange,
  ms = 300,
  native = false,
  ...others
}) {
  const [localValue, setLocalValue] = useState(value);
  const timeoutId = useRef(null);
  const isFirstChange = useRef(false);

  useEffect(() => {
    if (!isFirstChange.current) {
      setLocalValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (!isFirstChange.current) {
      return;
    }
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }
    timeoutId.current = setTimeout(() => {
      onChange(localValue);
    }, ms);

    return () => {
      clearTimeout(timeoutId.current);
    };
  }, [localValue]);

  const handleFocus = (e) => {
    const length = e.target.value.length;
    e.target.setSelectionRange(length, length);
  };

  const textareaProps = {
    value: localValue,
    onChange: (e) => {
      isFirstChange.current = true;
      setLocalValue(e.target.value);
    },
    onFocus: handleFocus,
  };

  if (native) {
    return <textarea {...textareaProps} {...others} />;
  }

  return <Textarea {...textareaProps} {...others} />;
}
