export interface EmfnData {
  dataUrl: string | null;
}

export interface GformRuntime {
  initializeOnLoaded?: (callback: () => void) => void;
  themeScriptsLoaded?: boolean;
  submission?: {
    SUBMISSION_TYPE_SUBMIT?: string;
  };
  utils?: {
    addAsyncFilter?: (
      name: string,
      callback: (data: GFormSubmissionStartedData) => Promise<GFormSubmissionStartedData> | GFormSubmissionStartedData
    ) => void;
  };
}

export type EmfnWindow = Window & {
  emfnData?: EmfnData;
  gform?: GformRuntime;
};

export type GFormElement = HTMLElement;

export type GFormCustomElement = HTMLElement;

export interface LatLngLike {
  lat: () => number | null | undefined;
  lng: () => number | null | undefined;
}

export type NriCountyRow = Record<string, string>;

export interface LocationData {
  county: string | null;
  state: string | null;
  st: string | null;
  country: string | null;
  fips: string | null;
  nri?: NriCountyRow | null;
}

export interface FccLookupResponse {
  County?: {
    FIPS?: string;
  };
  State?: {
    code?: string;
  };
}

export interface PlaceAddressComponent {
  types: string[];
  longText: string;
  shortText: string;
}

export interface PlaceLike {
  fetchFields: (options: { fields: string[] }) => Promise<void> | void;
  location?: LatLngLike;
  addressComponents?: PlaceAddressComponent[];
}

export interface GmpSelectEvent extends Event {
  placePrediction: {
    toPlace: () => PlaceLike;
  };
}

export interface GFormSubmissionStartedData {
  form: HTMLFormElement;
  submissionType: string;
  submissionMethod: string;
  abort?: boolean;
}