import {Switch as MantineSwitch} from '@mantine/core';

export default function Switch({
  size = 'md',
  withThumbIndicator = false,
  onLabel,
  offLabel,
  label,
  description,
  error,
  ...props
}) {
  return (
    <MantineSwitch
      size={size}
      withThumbIndicator={withThumbIndicator}
      onLabel={onLabel}
      offLabel={offLabel}
      label={label}
      description={description}
      error={error}
      {...props}
    />
  );
}
