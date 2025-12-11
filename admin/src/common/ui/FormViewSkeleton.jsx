import {Skeleton} from '@mantine/core';

export default function FormViewSkeleton() {
  return (
    <div className={`flex flex-col gap-2`}>
      <Skeleton height={40} />
      <Skeleton height={200} />
    </div>
  );
}
