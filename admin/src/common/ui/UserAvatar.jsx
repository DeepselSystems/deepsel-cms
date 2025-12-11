import {Avatar} from '@mantine/core';
import {stringAvatar} from '../utils/avatar';
import {getAttachmentUrl} from '../utils';

export default function UserAvatar({
  user,
  externalUserData,
  backendHost,
  ...props
}) {
  const getAvatarProps = () => {
    if (externalUserData?.avatar_url) {
      const displayName = externalUserData.name || externalUserData.username;
      return {
        src: externalUserData.avatar_url,
        alt: displayName,
        ...props,
      };
    }

    if (user?.image) {
      const displayName = user.name || user.username;
      return {
        src: getAttachmentUrl(backendHost, user.image.name),
        alt: displayName,
        ...props,
      };
    }

    const displayName =
      user?.name ||
      user?.username ||
      externalUserData?.name ||
      externalUserData?.username ||
      '';
    return {
      ...stringAvatar(displayName),
      ...props,
    };
  };

  return <Avatar {...getAvatarProps()} />;
}
