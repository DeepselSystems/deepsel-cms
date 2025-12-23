import { Checkbox as MantineCheckbox } from '@mantine/core';

export default function Checkbox({ radius = 'md', size = 'md', ...props }) {
  return <MantineCheckbox radius={radius} size={size} {...props} />;
}
