import {Textarea as MantineTextarea} from '@mantine/core';

export default function TextArea({radius = 'md', size = 'md', ...props}) {
  return <MantineTextarea radius={radius} size={size} {...props} />;
}
