import {useTranslation} from 'react-i18next';
import {useState, useEffect, useMemo, useCallback} from 'react';
import {
  CheckIcon,
  Combobox,
  Group,
  Pill,
  PillsInput,
  useCombobox,
} from '@mantine/core';
import useModel from '../api/useModel.jsx';
import {useShallowEffect} from '@mantine/hooks';
import isEqualWith from 'lodash/isEqualWith';
import isEqual from 'lodash/isEqual';

export default function RecordSelectMulti(props) {
  const {t} = useTranslation();
  const {
    label,
    placeholder,
    required,
    model,
    value: initialValue,
    onChange,
    searchFields = ['name'],
    renderOption,
    displayField = 'name',
    pageSize = 5,
    filters = [],
    slots,
  } = props;
  const {data, searchTerm, setSearchTerm} = useModel(model, {
    autoFetch: true,
    pageSize,
    searchFields,
    filters,
  });
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex('active'),
  });
  const [value, setValue] = useState(initialValue || []);

  /**
   *  Set initial value when initialValue changes
   *  Only set whether current values is difference with new values (initialValue)
   */
  useEffect(() => {
    setValue((prevState) => {
      return isEqualWith(prevState, initialValue, (value, other) =>
        isEqual(value, other)
      )
        ? prevState
        : initialValue;
    });
  }, [initialValue]);

  /**
   * Shallow effect hook - emit new value
   */
  useShallowEffect(() => {
    onChange?.(value);
  }, [onChange, value]);

  /**
   * Handle value select
   * @type {(function(*): void)|*}
   */
  const handleValueSelect = useCallback((itemToAdd) => {
    setValue((prevState) => {
      const newValue = [...(prevState || [])];
      const existedItemIdx = newValue.findIndex(
        (o) => String(o.id) === String(itemToAdd.id)
      );
      if (newValue[existedItemIdx]) {
        newValue.splice(existedItemIdx, 1);
      } else {
        newValue.push(itemToAdd);
      }
      return newValue;
    });
  }, []);

  /**
   * Handle value remove
   * @type {(function(*): void)|*}
   */
  const handleValueRemove = useCallback((itemToRemove) => {
    setValue((prevState) => {
      return (prevState || []).filter(
        (item) => String(item.id) !== String(itemToRemove.id)
      );
    });
  }, []);

  /**
   * Memo state - Selected values
   * @type {Array<React.ReactNode>}
   */
  const selectedValues = useMemo(
    () =>
      value?.map((item) => (
        <Pill
          key={item.id}
          withRemoveButton
          onRemove={() => handleValueRemove(item)}
        >
          <div className="flex gap-2 items-center">
            {slots?.preOptionItem && slots.preOptionItem(item)}
            {item[displayField]}
          </div>
        </Pill>
      )),
    [displayField, handleValueRemove, slots, value]
  );

  const options = data.map((item) =>
    renderOption ? (
      renderOption(item, value)
    ) : (
      <Combobox.Option
        value={item}
        key={item.id}
        active={value?.includes(item)}
      >
        <Group gap="sm">
          {value?.find((v) => v.id === item.id) ? (
            <CheckIcon size={12} />
          ) : null}
          {slots?.preOptionItem && slots.preOptionItem(item)}
          <span>{item[displayField]}</span>
        </Group>
      </Combobox.Option>
    )
  );

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={handleValueSelect}
      withinPortal={false}
    >
      <Combobox.DropdownTarget>
        <PillsInput onClick={() => combobox.openDropdown()} label={label}>
          <Pill.Group>
            {selectedValues}

            <Combobox.EventsTarget>
              <PillsInput.Field
                onFocus={() => combobox.openDropdown()}
                onBlur={() => combobox.closeDropdown()}
                value={searchTerm}
                placeholder={placeholder}
                required={required}
                onChange={(event) => {
                  combobox.updateSelectedOptionIndex();
                  setSearchTerm(event.currentTarget.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Backspace' && searchTerm.length === 0) {
                    event.preventDefault();
                    handleValueRemove(value[value.length - 1]);
                  }
                }}
              />
            </Combobox.EventsTarget>
          </Pill.Group>
        </PillsInput>
      </Combobox.DropdownTarget>

      <Combobox.Dropdown>
        <Combobox.Options className="max-h-[200px] overflow-y-auto">
          {options.length > 0 ? (
            options
          ) : (
            <Combobox.Empty>{t('Nothing found...')}</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
