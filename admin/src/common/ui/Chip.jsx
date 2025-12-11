import {Chip as MantineChip} from '@mantine/core';

export default function Chip({children, ...props}) {
  return <MantineChip {...props}>{children}</MantineChip>;
}
