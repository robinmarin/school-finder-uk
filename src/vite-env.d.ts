/// <reference types="vite/client" />

declare module "*.png" {
  const value: string;
  export default value;
}

declare module "leaflet.markercluster";
