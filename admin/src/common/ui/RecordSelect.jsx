import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { InputBase, Combobox, useCombobox, CloseButton, Modal, ScrollArea } from '@mantine/core';
import useModel from '../api/useModel.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

export default function RecordSelect(props) {
  const { t } = useTranslation();
  const {
    label,
    description,
    placeholder,
    required,
    model,
    value: initialValue,
    onChange,
    searchFields = ['name'],
    renderOption,
    renderValue,
    displayField = 'name',
    createView,
    pageSize = 5,
    filters = [],
    size = 'md',
    radius = 'md',
    ...otherProps
  } = props;
  const CreateView = createView;
  const { data, searchTerm, setSearchTerm } = useModel(model, {
    autoFetch: true,
    pageSize,
    searchFields,
    filters,
  });
  const initialRecordQuery = !isNaN(initialValue) // integer id
    ? useModel(model, {
        id: initialValue,
        autoFetch: true,
      })
    : typeof initialValue === 'string' && initialValue.includes('/') // string_id
      ? useModel(model, {
          // string_id
          filters: [
            {
              field: 'string_id',
              operator: '=',
              value: initialValue.split('/')[1],
            },
          ],
          autoFetch: true,
        })
      : null;

  const [value, setValue] = useState(initialValue || null);
  const [showModal, setShowModal] = useState(false);
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const options = data.map((item) => (
    <Combobox.Option value={item.id} key={item.id}>
      {renderOption ? renderOption(item) : item[displayField]}
    </Combobox.Option>
  ));

  // run once on mount, set searchTerm to display name of initial value
  useEffect(() => {
    if (
      initialValue &&
      initialRecordQuery &&
      (initialRecordQuery.record || initialRecordQuery.data)
    ) {
      let initialRecord;
      // check if integer
      if (!isNaN(initialValue)) {
        initialRecord = initialRecordQuery.record;
      } else if (typeof initialValue === 'string' && initialValue.includes('/')) {
        // this is a string_id
        initialRecord = initialRecordQuery.data[0];
      }
      if (initialRecord) {
        const displayText = renderValue ? renderValue(initialRecord) : initialRecord[displayField];
        setSearchTerm(displayText);
      }
    }
  }, [initialValue, initialRecordQuery, displayField, renderValue, setSearchTerm]);

  // Sync internal value with prop changes
  useEffect(() => {
    setValue(initialValue || null);
  }, [initialValue]);

  function clear() {
    setValue(null);
    setSearchTerm('');
    onChange(null);
  }

  return (
    <>
      <Combobox
        {...otherProps}
        store={combobox}
        onOptionSubmit={(val) => {
          // on select an option
          // set value to its id, and searchTerm to its display name
          onChange(val);
          setValue(val);
          const selectedItem = data.find((item) => item.id === val);
          const displayText = renderValue ? renderValue(selectedItem) : selectedItem[displayField];
          setSearchTerm(displayText);
          combobox.closeDropdown();
        }}
      >
        <Combobox.Target>
          <InputBase
            onClick={() => combobox.openDropdown()}
            onFocus={() => combobox.openDropdown()}
            onBlur={() => {
              combobox.closeDropdown();
              // when focus away
              // if value is in data, set searchTerm to its display name, else clear searchTerm
              if (data?.length > 0) {
                const item = data.find((item) => item.id === value);
                setSearchTerm(item ? item[displayField] : '');
              }
            }}
            label={label}
            description={description}
            placeholder={placeholder}
            value={searchTerm}
            required={required}
            onChange={(event) => {
              // when user types
              // set searchTerm to input value
              combobox.updateSelectedOptionIndex();
              setSearchTerm(event.currentTarget.value);
            }}
            rightSection={
              value && value !== '' ? (
                <CloseButton
                  size="sm"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={clear}
                  aria-label="Clear value"
                />
              ) : (
                <Combobox.Chevron />
              )
            }
            rightSectionPointerEvents={value && value !== '' ? 'all' : 'none'}
            size={size}
            radius={radius}
          />
        </Combobox.Target>

        <Combobox.Dropdown>
          <Combobox.Options>
            <ScrollArea.Autosize type="scroll" mah={300}>
              {options.length > 0 ? options : <Combobox.Empty>{t('Nothing found')}</Combobox.Empty>}
              {createView && (
                <button
                  className={`w-full border-t border-gray-border text-primary-main text-left p-2 hover:bg-primary-main hover:text-primary-contrastText rounded-b text-xs font-semibold`}
                  onClick={() => setShowModal(true)}
                >
                  <FontAwesomeIcon icon={faPlus} className={`mr-1`} />
                  {t('Create')}
                </button>
              )}
            </ScrollArea.Autosize>
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>

      <Modal
        opened={showModal}
        title={<div className={`text-lg font-semibold`}>{t('Create')}</div>}
        onClose={() => setShowModal(false)}
        size={`2xl`}
      >
        {createView && (
          <CreateView
            modalMode={true}
            onSuccess={(record) => {
              setValue(record.id);
              onChange(record.id);
              setSearchTerm(record[displayField]);
              setShowModal(false);
            }}
          />
        )}
      </Modal>
    </>
  );
}
