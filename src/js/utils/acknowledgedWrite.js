export class AcknowledgedWriteError extends Error {
  constructor() {
    super("Write acknowledged, display refresh required");
    this.name = "AcknowledgedWriteError";
  }
}
export const isAcknowledgedWrite = (error) =>
  error instanceof AcknowledgedWriteError;
export const parseAcknowledgedWrite = (parse, value) => {
  try {
    return parse(value);
  } catch {
    throw new AcknowledgedWriteError();
  }
};
