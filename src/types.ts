export interface School {
  urn: string;
  name: string;
  type: SchoolType;
  status: string;
  lat: number;
  lng: number;
  address: string;
  postcode: string;
  ofsted: OfstedRating;
}

export type SchoolType =
  | "Academy"
  | "Community School"
  | "Foundation School"
  | "Voluntary Aided"
  | "Voluntary Controlled"
  | "Free School"
  | "Other";

export type OfstedRating =
  | "Outstanding"
  | "Good"
  | "Requires Improvement"
  | "Inadequate"
  | "Not yet inspected";

export const SCHOOL_TYPES: SchoolType[] = [
  "Academy",
  "Community School",
  "Foundation School",
  "Voluntary Aided",
  "Voluntary Controlled",
  "Free School",
];

export const OFSTED_RATINGS: OfstedRating[] = [
  "Outstanding",
  "Good",
  "Requires Improvement",
  "Inadequate",
  "Not yet inspected",
];
