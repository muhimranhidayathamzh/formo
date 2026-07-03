/** Bentuk aset gambar yang dipakai di sisi client editor (ringkas, untuk thumbnail). */
export type EditorAsset = {
  id: string;
  refToken: string;
  signedUrl: string | null;
};
