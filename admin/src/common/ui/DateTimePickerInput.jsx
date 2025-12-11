import {DateTimePicker} from '@mantine/dates';

export default function DateTimePickerInput({
  radius = 'md',
  size = 'md',
  ...props
}) {
  return <DateTimePicker radius={radius} size={size} {...props} />;
}
