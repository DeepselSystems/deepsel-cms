import { NumberInput as MantineNumberInput } from '@mantine/core';

export default function NumberInput({ radius = 'md', size = 'md', ...props }) {
  return <MantineNumberInput radius={radius} size={size} {...props} />;
}
