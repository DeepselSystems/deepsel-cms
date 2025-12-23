import { useState, useCallback, useRef } from 'react';
import useFetch from '../../../api/useFetch.js';
import { STOCK_IMAGE_PROVIDERS } from '../constants/stockImages.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Custom hook for searching stock images
 */
const useStockImages = () => {
  // Initialize states
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [images, setImages] = useState(/** @type {Array<StockImage>} */ []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOutOfData, setIsOutOfData] = useState(false);

  // Previous search str
  const prevSearchStrRef = useRef(searchQuery);

  // Pexels images query
  const { post: fetchPexelsImages } = useFetch('stock-image/search', {
    autoFetch: false,
  });

  /**
   * Search for images using the specified provider
   * @param {string} query - Search query
   * @param {number} limit - Number of images to fetch
   */
  const searchImages = useCallback(
    (page = null) => {
      if (prevSearchStrRef.current !== searchQuery) {
        prevSearchStrRef.current = searchQuery;
        setImages([]);
        setPage(1);
        setIsOutOfData(false);
      }
      setLoading(true);
      fetchPexelsImages({
        page: page || 1,
        query_str: searchQuery,
        provider: STOCK_IMAGE_PROVIDERS.PEXELS,
      })
        .then(({ data }) => {
          if (data.length) {
            setImages((prevState) => {
              data = data.map((item) => ({
                ...item,
                _id: uuidv4(), // Internal id
              }));
              if (!page || page === 1) {
                return data;
              } else {
                return [...(prevState || []), ...data];
              }
            });
          } else {
            setIsOutOfData(true);
          }
        })
        .catch((error) => {
          setError(error.message);
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [fetchPexelsImages, searchQuery],
  );

  /**
   * Load more stock image
   * @type {(function())|*}
   */
  const loadMore = useCallback(() => {
    setPage((prev) => prev + 1);
    searchImages(page + 1);
  }, [page, searchImages]);

  return {
    prevSearchStrRef,
    searchQuery,
    setSearchQuery,
    images,
    setImages,
    loading,
    error,
    searchImages,
    loadMore,
    isOutOfData,
  };
};

export default useStockImages;
