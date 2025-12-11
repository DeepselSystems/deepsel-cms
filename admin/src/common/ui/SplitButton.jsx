import {Button, Menu, Group, ActionIcon, useMantineTheme} from '@mantine/core';
// import {IconTrash, IconBookmark, IconCalendar, IconChevronDown} from '@tabler/icons-react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faChevronDown} from '@fortawesome/free-solid-svg-icons';

export function SplitButton(props) {
  const {title, children, ...others} = props;
  const theme = useMantineTheme();

  return (
    <Group wrap="nowrap" gap={0}>
      <Button className={`!rounded-tr-none !rounded-br-none`} {...others}>
        {title}
      </Button>
      <Menu
        transitionProps={{transition: 'pop'}}
        position="bottom-end"
        withinPortal
      >
        <Menu.Target>
          <ActionIcon
            variant="filled"
            color={theme.primaryColor}
            size={36}
            className={`!rounded-tl-none !rounded-bl-none !border-l !border-l-gray-200`}
          >
            <FontAwesomeIcon icon={faChevronDown} className="h-4 w-4" />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          {children}
          {/*example:*/}
          {/*<Menu.Item*/}
          {/*    leftSection={*/}
          {/*        <FontAwesomeIcon*/}
          {/*            icon={faChevronDown}*/}
          {/*            className="h-4 w-4"*/}
          {/*        />*/}
          {/*    }*/}
          {/*>*/}
          {/*    Schedule for later*/}
          {/*</Menu.Item>*/}
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}
