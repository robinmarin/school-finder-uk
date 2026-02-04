export type PhaseOfEducation = "Primary" | "Secondary";

export type FundingType = "State" | "Independent";

export type AdmissionsPolicy = "Selective" | "Non-selective" | "Not applicable";

export interface School {
  urn: string;
  name: string;
  type: SchoolType;
  phase: PhaseOfEducation;
  funding: FundingType;
  admissions: AdmissionsPolicy;
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
  | "Independent"
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
  "Independent",
];

export const OFSTED_RATINGS: OfstedRating[] = [
  "Outstanding",
  "Good",
  "Requires Improvement",
  "Inadequate",
  "Not yet inspected",
];

export const PHASES: PhaseOfEducation[] = ["Primary", "Secondary"];

export const FUNDING_TYPES: FundingType[] = ["State", "Independent"];

export const ADMISSIONS_POLICIES: AdmissionsPolicy[] = ["Selective", "Non-selective", "Not applicable"];

// Heat map layer types
export type HeatMapLayerType = "none" | "house-prices" | "commute-time";

export interface DistrictMetrics {
  medianPrice: number | null;
  commuteMinutes: number | null;
}

export type DistrictMetricsMap = Record<string, DistrictMetrics>;

export interface ColorScaleConfig {
  min: number;
  max: number;
  colors: string[];
  noDataColor: string;
}

export const HOUSE_PRICE_SCALE: ColorScaleConfig = {
  min: 100000,
  max: 1500000,
  colors: ["#ffffb2", "#41b6c4", "#253494"], // Yellow → Teal → Dark Blue
  noDataColor: "#cccccc",
};

export const COMMUTE_TIME_SCALE: ColorScaleConfig = {
  min: 20,
  max: 180,
  colors: ["#1a9850", "#ffffbf", "#d73027"], // Green → Yellow → Red
  noDataColor: "#cccccc",
};
