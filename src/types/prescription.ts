/** One eye's prescription values (common format). */
export interface EyePrescription {
  sph?: string;
  cyl?: string;
  axis?: string;
  add?: string;
}

/** Manual prescription entered by user – saved with order. */
export interface ManualPrescription {
  type: 'manual';
  rightEye?: EyePrescription;
  leftEye?: EyePrescription;
  pd?: string; // Pupillary distance (mm)
}

/** Uploaded prescription – file URL saved with order. */
export interface UploadedPrescription {
  type: 'upload';
  fileUrl: string;
  fileName?: string;
}

export type PrescriptionData = ManualPrescription | UploadedPrescription;
