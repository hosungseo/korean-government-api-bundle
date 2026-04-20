export interface DatasetSearchHit {
  datasetId: string;
  title: string;
  kind: "openapi" | "fileData";
  provider: string | null;
  format: string | null;
  hasApi: boolean;
  originalUrl: string;
}
