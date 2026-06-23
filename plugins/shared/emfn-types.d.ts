export interface EmfnData {
  /* URL for plugin runtime CSV data */
  dataUrl: string | null;
  /* Prefix for compact Action Pack payloads */
  actionPackPayloadPrefix?: string;
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

/* Google Maps Places v2 types using official @types/google.maps */
export type LatLngLike = google.maps.LatLng | google.maps.LatLngLiteral;

/* Places API (New) address component shape */
export interface PlaceAddressComponent {
  types: string[];
  longText: string;
  shortText: string;
}

/* Places API (New) Place object shape */
export interface PlaceLike {
  fetchFields: (options: { fields: string[] }) => Promise<void> | void;
  location?: google.maps.LatLng;
  addressComponents?: PlaceAddressComponent[];
  formattedAddress?: string;
  displayName?: string;
}

/* Extended Component Library gmp-select event with PlacePrediction */
export interface GmpSelectEvent extends Event {
  placePrediction: {
    toPlace: () => PlaceLike;
    text?: {
      text?: string;
    };
  };
}

/* Submission payload passed to the Gravity Forms async filter */
export interface GFormSubmissionStartedData {
  form: HTMLFormElement;
  submissionType: string;
  submissionMethod?: string;
  abort?: boolean;
}