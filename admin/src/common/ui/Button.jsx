import React from 'react';
import { Button as MantineButton } from '@mantine/core';

const Button = React.forwardRef(({ radius = 'md', size = 'md', ...props }, ref) => {
  return <MantineButton ref={ref} radius={radius} size={size} {...props} />;
});

Button.displayName = 'Button';

export default Button;
