import {Select as MantineSelect} from '@mantine/core';

export default function Select({radius = 'md', size = 'md', ...props}) {
  return <MantineSelect radius={radius} size={size} {...props} />;
}
