type ServiceError = {
  error: string;
  status: number;
};

function isServiceError(result: unknown): result is ServiceError {
  return (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    "status" in result
  );
}