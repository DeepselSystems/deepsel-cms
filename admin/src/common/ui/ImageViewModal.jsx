import { Modal, Image } from '@mantine/core';

const ImageViewModal = ({ isOpen, close, imageUrl }) => {
  return (
    <Modal opened={isOpen} onClose={close} size="xl" centered>
      <Image src={imageUrl} alt="" />
    </Modal>
  );
};

export default ImageViewModal;
