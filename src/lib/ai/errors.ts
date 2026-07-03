/** Error terstruktur untuk pipeline structuring; `status` dipetakan ke HTTP. */
export class StructureError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "StructureError";
    this.status = status;
  }
}
