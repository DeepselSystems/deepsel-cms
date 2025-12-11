export const FormFieldType = {
  ShortAnswer: 'short_answer',
  Number: 'number',
  Paragraph: 'paragraph',
  MultipleChoice: 'multiple_choice',
  Checkboxes: 'checkboxes',
  Dropdown: 'dropdown',
  Date: 'date',
  Datetime: 'datetime',
  Time: 'time',
  Files: 'files',
};

export const TimeFormat = {
  TWELVE_HOUR: '12h',
  TWENTY_FOUR_HOUR: '24h',
};

export const TimeFormatOptions = [
  {value: TimeFormat.TWELVE_HOUR, label: '12-hour (AM/PM)'},
  {value: TimeFormat.TWENTY_FOUR_HOUR, label: '24-hour'},
];
