export interface EmfnData {
  /* URL for plugin runtime CSV data */
  dataUrl: string | null;
  /* Prefix for compact Action Pack payloads */
  actionPackPayloadPrefix?: string;
  /* Enable verbose debug logging */
  verboseDebug?: boolean;
}

/* Partial Gravity Forms runtime shape used by the plugin */
export interface GFormRuntime {
  /* Set when theme scripts are ready */
  themeScriptsLoaded?: boolean;
  /* Submission constants exposed by Gravity Forms */
  submission?: {
    SUBMISSION_TYPE_SUBMIT?: string;
  };
  /* Async filter registry used for submit interception */
  utils?: {
    addAsyncFilter?: (
      name: string,
      callback: (
        data: GFormSubmissionStartedData
      ) => Promise<GFormSubmissionStartedData> | GFormSubmissionStartedData
    ) => void;
  };
}

export type EmfnWindow = Window & {
  /* Localized plugin data */
  emfnData?: EmfnData;
  /* Gravity Forms runtime */
  gform?: GFormRuntime;
};

/* Minimal Google Maps LatLng shape */
export interface LatLngLike {
  lat: () => number | null | undefined;
  lng: () => number | null | undefined;
}

/* Parsed county risk row from generated NRI CSVs */
export type NriCountyRow = Record<string, string>;

/* Resolved location state for the current form session */
export interface LocationData {
  county: string | null;
  state: string | null;
  st: string | null;
  country: string | null;
  fips: string | null;
}

/* Partial FCC area API response */
export interface FccLookupResponse {
  County?: {
    FIPS?: string;
  };
  State?: {
    code?: string;
  };
}

/* Minimal address component shape from Places v2 */
export interface PlaceAddressComponent {
  types: string[];
  longText: string;
  shortText: string;
}

/* Minimal place object shape used after a Places v2 selection */
export interface PlaceLike {
  fetchFields: (options: { fields: string[] }) => Promise<void> | void;
  location?: LatLngLike;
  addressComponents?: PlaceAddressComponent[];
}

/* Minimal event shape for a Places v2 selection */
export interface GmpSelectEvent extends Event {
  placePrediction: {
    toPlace: () => PlaceLike;
  };
}

/* Submission payload passed to the Gravity Forms async filter */
export interface GFormSubmissionStartedData {
  form: HTMLFormElement;
  submissionType: string;
  submissionMethod?: string;
  abort?: boolean;
}