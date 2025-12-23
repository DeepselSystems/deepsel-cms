import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

/**
 * Masonry layout component that arranges items in columns with minimal gaps
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Items to be arranged in masonry layout
 * @param {number} props.columns - Number of columns (default: 3)
 * @param {string} props.className - Additional CSS classes
 */
const Masonry = ({ children, columns = 5, className = '' }) => {
  const containerRef = useRef(null);
  const [columnWrappers, setColumnWrappers] = useState([]);

  /**
   * Update column wrappers when children or columns change
   * Uses shortest column first algorithm for better balance
   */
  useEffect(() => {
    // Convert children to array
    const items = Array.isArray(children) ? children : [children];

    // Filter out null/undefined children
    const validItems = items.filter((item) => item != null);

    // Distribute items into columns using shortest column first algorithm
    const cols = Array.from({ length: columns }, () => []);
    const columnHeights = Array.from({ length: columns }, () => 0);

    validItems.forEach((item) => {
      // Find the column with minimum height
      const minHeightIndex = columnHeights.indexOf(Math.min(...columnHeights));

      // Add item to the shortest column
      cols[minHeightIndex].push(item);

      // Estimate item height (assuming average height of 1 unit per item)
      // This can be improved by extracting actual image dimensions if available
      columnHeights[minHeightIndex] += 1;
    });

    setColumnWrappers(cols);
  }, [children, columns]);

  return (
    <div
      ref={containerRef}
      className={clsx('flex gap-1', className)}
      style={{ alignItems: 'flex-start' }}
    >
      {columnWrappers.map((column, columnIndex) => (
        <div key={columnIndex} className="flex flex-col gap-3 flex-1" style={{ minWidth: 0 }}>
          {column.map((item, itemIndex) => (
            <div key={itemIndex}>{item}</div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default Masonry;
