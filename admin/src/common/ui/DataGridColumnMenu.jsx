import { useTranslation } from 'react-i18next';
import useAPISchema from '../api/useAPISchema.js';
import { useMemo, useState } from 'react';
import NotificationState from '../stores/NotificationState.js';
import {
  GridColumnMenuContainer,
  GridColumnsMenuItem,
  HideGridColMenuItem,
  SortGridMenuItems,
} from '@mui/x-data-grid';
import { Popover } from '@mantine/core';
import { MenuItem } from '@mui/material';
import Select from './Select.jsx';
import TextInput from './TextInput.jsx';
import NumberInput from './NumberInput.jsx';
import DateTimePickerInput from './DateTimePickerInput.jsx';
import RadioGroup from './RadioGroup.jsx';
import Radio from './Radio.jsx';
import { Button } from '@mantine/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import MultiSelect from './MultiSelect.jsx';

export default function DataGridColumnMenu(props) {
  const { t } = useTranslation();
  const { hideMenu, currentColumn, open, query } = props;
  const { modelName, filters, setFilters } = query;
  const { getFieldColTypes } = useAPISchema(modelName);
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [selectedValue, setSelectedValue] = useState('');
  const { notify } = NotificationState();

  const colTypes = useMemo(
    () => getFieldColTypes(currentColumn.field),
    [getFieldColTypes, currentColumn.field],
  );

  const availableFilters = useMemo(() => {
    let filters = [];
    const types = colTypes.map((type) => type.type);

    if (types.includes('string')) {
      const toAdd = [
        { label: 'Contains', operatorValue: 'ilike', valueType: 'string' },
        {
          label: 'One of',
          operatorValue: 'in',
          valueType: 'Array<string>',
        },
        { label: 'Equals', operatorValue: '=', valueType: 'string' },
        { label: 'Is not', operatorValue: '!=', valueType: 'string' },
      ];
      filters = filters.concat(toAdd);
    }

    if (types.includes('number') || types.includes('integer')) {
      const toAdd = [
        { label: 'Equals', operatorValue: '=', valueType: 'number' },
        {
          label: 'One of',
          operatorValue: 'in',
          valueType: 'Array<number>',
        },
        { label: '>', operatorValue: '>', valueType: 'number' },
        { label: '>=', operatorValue: '>=', valueType: 'number' },
        { label: '<', operatorValue: '<', valueType: 'number' },
        { label: '<=', operatorValue: '<=', valueType: 'number' },
        { label: 'Is not', operatorValue: '!=', valueType: 'number' },
      ];
      filters = filters.concat(toAdd);
    }

    if (types.includes('date-time')) {
      const toAdd = [
        { label: 'Equals', operatorValue: '=', valueType: 'date-time' },
        { label: '>', operatorValue: '>', valueType: 'date-time' },
        { label: '>=', operatorValue: '>=', valueType: 'date-time' },
        { label: '<', operatorValue: '<', valueType: 'date-time' },
        { label: '<=', operatorValue: '<=', valueType: 'date-time' },
        { label: 'Is not', operatorValue: '!=', valueType: 'date-time' },
      ];
      filters = filters.concat(toAdd);
    }

    if (types.includes('boolean')) {
      const toAdd = [{ label: 'Is True / False', operatorValue: '=', valueType: 'boolean' }];
      filters = filters.concat(toAdd);
    }

    if (types.includes('enum')) {
      const enumFields = colTypes.filter((type) => type.type === 'enum');
      for (const enumField of enumFields) {
        const toAdd = [
          {
            label: 'One of',
            operatorValue: 'in',
            valueType: 'Array<enum>',
            enum: enumField.enum,
          },
          {
            label: 'Equals',
            operatorValue: '=',
            valueType: 'enum',
            enum: enumField.enum,
          },
          {
            label: 'Is not',
            operatorValue: '!=',
            valueType: 'enum',
            enum: enumField.enum,
          },
        ];
        filters = filters.concat(toAdd);
      }
    }

    if (types.includes('null')) {
      const toAdd = [
        { label: 'Is Empty', operatorValue: '=', valueType: 'null' },
        { label: 'Is not Empty', operatorValue: '!=', valueType: 'null' },
      ];
      filters = filters.concat(toAdd);
    }

    // relationship fields, like `user.company`
    // only support strings for now
    if (currentColumn.field.includes('.')) {
      const toAdd = [
        { label: 'Contains', operatorValue: 'ilike', valueType: 'string' },
        {
          label: 'One of',
          operatorValue: 'in',
          valueType: 'Array<string>',
        },
        { label: 'Equals', operatorValue: '=', valueType: 'string' },
        { label: 'Is not', operatorValue: '!=', valueType: 'string' },
      ];
      filters = filters.concat(toAdd);
    }

    // differentiate between types of filters with the same operator
    const duplicateOperatorFilters = filters.filter((filter) => {
      return (
        ['string', 'integer', 'number', 'date-time', 'enum'].includes(filter.valueType) &&
        filters.filter(
          (f) =>
            ['string', 'integer', 'number', 'date-time', 'enum'].includes(filter.valueType) &&
            f.operatorValue === filter.operatorValue,
        ).length > 1
      );
    });

    if (duplicateOperatorFilters.length > 0) {
      // add a type name to the end of label
      for (const filter of duplicateOperatorFilters) {
        let typeLabel;
        switch (filter.valueType) {
          case 'string':
            typeLabel = 'Text';
            break;
          case 'Array<string>':
            typeLabel = 'Texts';
            break;
          case 'number':
            typeLabel = 'Number';
            break;
          case 'Array<number>':
            typeLabel = 'Numbers';
            break;
          case 'date-time':
            typeLabel = 'Date';
            break;
          case 'enum':
            typeLabel = 'Option';
            break;
          default:
            typeLabel = '';
            break;
        }
        if (typeLabel) {
          filter.label = `${filter.label} (${typeLabel})`;
        }
      }
    }
    return filters;
  }, [colTypes, currentColumn.field]);

  function submitFilter(e) {
    e.preventDefault();
    if (selectedFilter) {
      let value = selectedValue;

      if (selectedFilter.valueType === 'boolean') {
        value = selectedValue === 'true';
      } else if (selectedFilter.valueType === 'enum') {
        value = selectedValue;
      } else if (selectedFilter.valueType === 'Array<string>') {
        value = selectedValue.split(',');
      } else if (selectedFilter.valueType === 'Array<number>') {
        value = selectedValue.split(',').map((v) => Number(v));
      } else if (selectedFilter.valueType === 'Array<enum>') {
        value = selectedValue.split(',');
      } else if (selectedFilter.valueType === 'null') {
        value = null;
      }

      const filterToAdd = {
        field: currentColumn.field,
        operator: selectedFilter.operatorValue,
        value,
      };

      setFilters([...filters, filterToAdd]);

      notify({
        message: t('Filter added.'),
        type: 'info',
      });
    }
  }

  return (
    <GridColumnMenuContainer hideMenu={hideMenu} currentColumn={currentColumn} open={open}>
      <SortGridMenuItems onClick={hideMenu} column={currentColumn} />
      <HideGridColMenuItem onClick={hideMenu} column={currentColumn} />
      <GridColumnsMenuItem onClick={hideMenu} column={currentColumn} />
      {currentColumn.filterable && (
        <Popover width={450} position="right" withArrow radius={`md`} shadow="lg" zIndex={1400}>
          <Popover.Target>
            <MenuItem>Filter</MenuItem>
          </Popover.Target>
          <Popover.Dropdown onKeyDown={(e) => e.stopPropagation()}>
            <form className={`flex text-sm gap-1 items-end`} onSubmit={submitFilter}>
              <Select
                size={`sm`}
                placeholder={`Operator`}
                className={`w-[160px]`}
                data={availableFilters.map((f) => f.label)}
                value={selectedFilter?.label}
                onChange={(labelValue) => {
                  const filter = availableFilters.find((f) => f.label === labelValue);
                  setSelectedFilter(filter);
                  setSelectedValue('');
                }}
                comboboxProps={{ withinPortal: false }}
                required
                withAsterisk={false}
                withCheckIcon={false}
              />

              {!selectedFilter && <TextInput size={`sm`} placeholder={`Value`} disabled />}

              {selectedFilter?.label.startsWith('One of') ? (
                selectedFilter.valueType === 'Array<enum>' ? (
                  <MultiSelect
                    size={`sm`}
                    placeholder="Values"
                    className={`w-[200px]`}
                    data={selectedFilter.enum}
                    value={selectedValue !== '' ? selectedValue?.split(',') : []}
                    onChange={(values) => setSelectedValue(values.join(','))}
                    comboboxProps={{ withinPortal: false }}
                  />
                ) : (
                  <TextInput
                    size={`sm`}
                    placeholder={`Comma separated values`}
                    value={selectedValue}
                    onChange={(e) => setSelectedValue(e.currentTarget.value)}
                    required
                    withAsterisk={false}
                  />
                )
              ) : (
                <>
                  {selectedFilter?.valueType === 'string' && (
                    <TextInput
                      size={`sm`}
                      placeholder={`Value`}
                      value={selectedValue}
                      onChange={(e) => setSelectedValue(e.currentTarget.value)}
                      required
                      withAsterisk={false}
                      // onKeyDown={stopPropagation}
                    />
                  )}

                  {['integer', 'number'].includes(selectedFilter?.valueType) && (
                    <NumberInput
                      size={`sm`}
                      placeholder={`Value`}
                      value={selectedValue}
                      onChange={setSelectedValue}
                      required
                      withAsterisk={false}
                      hideControls
                    />
                  )}

                  {selectedFilter?.valueType === 'date-time' && (
                    <DateTimePickerInput
                      size={`sm`}
                      radius={`md`}
                      placeholder={`Value`}
                      className={`w-[180px]`}
                      value={selectedValue}
                      onChange={setSelectedValue}
                      required
                      withAsterisk={false}
                      valueFormat="DD MMM YYYY HH:mm"
                      popoverProps={{ withinPortal: false }}
                    />
                  )}

                  {selectedFilter?.valueType === 'boolean' && (
                    <RadioGroup
                      value={selectedValue}
                      onChange={setSelectedValue}
                      label="Value"
                      withAsterisk={false}
                      required
                    >
                      <div className={`flex gap-1 p-2`}>
                        <Radio value="true" label="Is True" />
                        <Radio value="false" label="Is False" />
                      </div>
                    </RadioGroup>
                  )}

                  {selectedFilter?.valueType === 'enum' && (
                    <Select
                      size={`sm`}
                      placeholder={`Value`}
                      className={`w-[160px]`}
                      data={selectedFilter.enum}
                      value={selectedValue}
                      onChange={setSelectedValue}
                      comboboxProps={{ withinPortal: false }}
                      required
                      withAsterisk={false}
                      withCheckIcon={false}
                    />
                  )}
                </>
              )}

              <Button size={`sm`} type={`submit`} radius={`md`} className={`min-w-[40px] !px-0.5`}>
                <FontAwesomeIcon icon={faPlus} />
              </Button>
            </form>
          </Popover.Dropdown>
        </Popover>
      )}
    </GridColumnMenuContainer>
  );
}
