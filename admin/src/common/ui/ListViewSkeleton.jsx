import {Skeleton} from '@mantine/core';

export default function ListViewSkeleton(props) {
  const {rows = 10, rowHeight = 35, margin = 8} = props;
  return (
    <div>
      {Array(rows)
        .fill()
        .map((_, i) => (
          <Skeleton height={rowHeight} mt={margin} key={i} />
        ))}
    </div>
  );
}
