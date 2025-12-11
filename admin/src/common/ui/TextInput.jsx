import {TextInput as MantineTextInput} from '@mantine/core';

export default function TextInput({radius = 'md', size = 'md', ...props}) {
  return <MantineTextInput radius={radius} size={size} {...props} />;
}
