import React from 'react';
import { PasswordInput as MantinePasswordInput, type PasswordInputProps } from '@mantine/core';

export type { PasswordInputProps };

/**
 * PasswordInput component - thin wrapper around Mantine's PasswordInput
 */
export const PasswordInput = (props: PasswordInputProps) => {
  return <MantinePasswordInput {...props} />;
};
