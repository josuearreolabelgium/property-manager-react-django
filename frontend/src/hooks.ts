import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createProperty, deleteProperty, fetchCities, fetchProperties, fetchRates, updateProperty, type NewProperty,
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

// EXERCISE 5: TanStack Query hooks (the most important part for the interview)

// TODO 5.1: READ the list
// return useQuery({ ... }) with:
//   queryKey: ["properties", { city, page }]   <- filters in the key = separate cache per filter
//   queryFn:  a function that calls fetchProperties(city, page)
//   placeholderData: keepPreviousData          <- keeps the old page visible while loading
export function useProperties(city: string, page: number) {
  return useQuery({
    queryKey: ["properties", { city, page }],
    queryFn: () => fetchProperties(city, page),
    placeholderData: keepPreviousData,
  });
}

// TODO 5.2: CREATE
// const qc = useQueryClient();
// return useMutation({ ... }) with:
//   mutationFn: (data: NewProperty) => createProperty(data)
//   onSuccess:  invalidate every query whose key starts with "properties"
//               hint: qc.invalidateQueries({ queryKey: [...] })
export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: NewProperty) => createProperty(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}

// Already done, use it as a reference for 5.2 and 5.3
export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<NewProperty> }) => updateProperty(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}

// TODO 5.3: DELETE
// Same pattern as useUpdateProperty, but mutationFn receives an id: number
// and calls deleteProperty(id)
export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (  id: number ) => deleteProperty(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),  
  });
}

