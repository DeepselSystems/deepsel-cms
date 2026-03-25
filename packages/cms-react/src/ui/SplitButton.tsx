import React from 'react';
import { Button, Menu, Group, ActionIcon, useMantineTheme, type ButtonProps } from '@mantine/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';

interface SplitButtonProps extends ButtonProps {
  title?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Split button with a primary action and a dropdown menu for additional actions
 */
export const SplitButton = ({ title, children, ...props }: SplitButtonProps) => {
  const theme = useMantineTheme();

  return (
    <Group wrap="nowrap" gap={0}>
      <Button className="!rounded-tr-none !rounded-br-none" {...props}>
        {title}
      </Button>
      <Menu transitionProps={{ transition: 'pop' }} position="bottom-end" withinPortal>
        <Menu.Target>
          <ActionIcon
            variant="filled"
            color={theme.primaryColor}
            size={36}
            className="!rounded-tl-none !rounded-bl-none !border-l !border-l-gray-200"
          >
            <FontAwesomeIcon icon={faChevronDown} className="h-4 w-4" />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>{children}</Menu.Dropdown>
      </Menu>
    </Group>
  );
};
