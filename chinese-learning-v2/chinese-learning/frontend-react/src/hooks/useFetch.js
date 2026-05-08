import { useState, useEffect } from "react";
import { apiClient } from "../services/apiClient";

/**
 * Generic hook for fetching data
 * Usage: const { data, loading, error } = useFetch('/lessons?hsk_level=1');
 */
export const useFetch = (endpoint, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!endpoint) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await apiClient.get(endpoint);
        setData(result);
        setError(null);
      } catch (err) {
        setError(err.message);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, dependencies);

  return { data, loading, error, refetch: () => {} };
};
