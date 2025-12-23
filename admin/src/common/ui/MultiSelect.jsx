import { MultiSelect as MantineMultiSelect } from '@mantine/core';

export default function MultiSelect({ radius = 'md', size = 'md', ...props }) {
  return <MantineMultiSelect radius={radius} size={size} {...props} />;
}
