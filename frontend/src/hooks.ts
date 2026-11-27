import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createProperty, deleteProperty, fetchCities, fetchProperties, fetchRates, updateProperty,
  type Filters, type NewProperty, type PropertyChanges,
} from "./api";

// Exchange rates for the currency dropdown. They change once a day, so cache them for an hour.
export function useRates() {
  return useQuery({
    queryKey: ["rates"],
    queryFn: fetchRates,
    staleTime: 60 * 60 * 1000,
  });
}

// Cities for the filter dropdown. The key starts with "properties", so the
// invalidateQueries calls in the mutations below refresh it automatically.
export function useCities() {
  return useQuery({
    queryKey: ["properties", "cities"],
    queryFn: fetchCities,
  });
}

// One page of the list. The filters are part of the key, so each combination is cached separately;
// keepPreviousData keeps the current page visible while the next one loads
export function useProperties(filters: Filters) {
  return useQuery({
    queryKey: ["properties", filters],
    queryFn: () => fetchProperties(filters),
    placeholderData: keepPreviousData,
  });
}

// Creates a property, then refreshes the list and the city dropdown (both keys start with "properties")
export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: NewProperty) => createProperty(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}

// Changes fields of a property, e.g. its status
export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PropertyChanges }) => updateProperty(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}

// Deletes a property, then refreshes the list and the city dropdown
export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteProperty(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}

