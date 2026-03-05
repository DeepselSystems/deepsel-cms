import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { useFetch } from '../../../hooks';
import type { User } from '../../../stores';
import type { AttachmentFile } from '../../ChooseAttachmentModal';
import { STOCK_IMAGE_PROVIDERS } from '../constants/stockImages';

/**
 * Represents a single stock image from an external provider
 */
export interface StockImage {
  _id: string;
  _attachment?: AttachmentFile;
  title: string;
  description?: string;
  src: string;
  preview_src: string;
  provider: string;
}

/**
 * Configuration for the useStockImages hook
 */
export interface UseStockImagesConfig {
  backendHost: string;
  setUser: (user: User | null) => void;
}

/**
 * Custom hook for searching and paginating stock images from external providers
 */
export function useStockImages(config: UseStockImagesConfig) {
  const { backendHost, setUser } = config;

  // Initialize states
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [images, setImages] = useState<StockImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOutOfData, setIsOutOfData] = useState(false);

  // Previous search string reference to detect query changes
  const prevSearchStrRef = useRef(searchQuery);

  // Stock image search query
  const { post: fetchPexelsImages } = useFetch<unknown, { data: StockImage[] }>(
    'stock-image/search',
    { backendHost, setUser },
    { autoFetch: false },
  );

  /**
   * Search for images using the Pexels provider
   * @param pageNum - Page number to fetch (defaults to 1)
   */
  const searchImages = useCallback(
    (pageNum: number | null = null) => {
      if (prevSearchStrRef.current !== searchQuery) {
        prevSearchStrRef.current = searchQuery;
        setImages([]);
        setPage(1);
        setIsOutOfData(false);
      }
      setLoading(true);
      void fetchPexelsImages({
        page: pageNum || 1,
        query_str: searchQuery,
        provider: STOCK_IMAGE_PROVIDERS.PEXELS,
      })
        .then((result) => {
          if (!result) return;
          const { data } = result;
          if (data.length) {
            setImages((prevState) => {
              const mappedData = data.map((item) => ({
                ...item,
                _id: uuidv4(),
              }));
              if (!pageNum || pageNum === 1) {
                return mappedData;
              } else {
                return [...(prevState || []), ...mappedData];
              }
            });
          } else {
            setIsOutOfData(true);
          }
        })
        .catch((error) => {
          setError((error as Error).message ?? String(error));
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [fetchPexelsImages, searchQuery],
  );

  /**
   * Load the next page of stock images
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
}
