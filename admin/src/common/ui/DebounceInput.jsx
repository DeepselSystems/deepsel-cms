import {TextInput} from '@mantine/core';
import {faXmark} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useEffect, useRef, useState} from 'react';

export default function DebounceInput({
  value,
  onChange,
  twoWayBinding = false, // If true, the input value will sync with parent value changes. If false (default), only updates local value after debounce delay
  ms = 300,
  native = false,
  clearable = false,
  ...others
}) {
  const [localValue, setLocalValue] = useState(value);
  const timeoutId = useRef(null);
  const isFirstChange = useRef(false);

  useEffect(() => {
    if (!isFirstChange.current || twoWayBinding) {
      setLocalValue(value);
    }
  }, [value, twoWayBinding]);

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

  const textareaProps = {
    value: localValue,
    onChange: (e) => {
      isFirstChange.current = true;
      setLocalValue(e.target.value);
    },
  };

  if (native) {
    return <input {...textareaProps} {...others} />;
  }

  return (
    <TextInput
      {...textareaProps}
      {...others}
      rightSection={
        clearable && (
          <FontAwesomeIcon
            icon={faXmark}
            className="cursor-pointer h-6 w-6 hover:bg-gray-200 rounded-full p-1"
            onClick={() => setLocalValue('')}
          />
        )
      }
    />
  );
}
