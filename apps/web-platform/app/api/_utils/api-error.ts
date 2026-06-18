import { Prisma } from "@prisma/client";

type ApiErrorOptions = {
  fallback: string;
  uniqueMessage?: string;
  notFoundMessage?: string;
};

type ApiErrorPayload = {
  error: string;
  code: string;
  details?: string;
};

function withDetails(payload: ApiErrorPayload, error: unknown) {
  if (process.env.NODE_ENV === "production" || !(error instanceof Error)) {
    return payload;
  }

  return {
    ...payload,
    details: error.message,
  };
}

function jsonError(payload: ApiErrorPayload, status: number, error: unknown) {
  return Response.json(withDetails(payload, error), { status });
}

export function apiErrorResponse(error: unknown, options: ApiErrorOptions) {
  console.error(options.fallback, error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return jsonError(
        {
          error: options.uniqueMessage ?? "Já existe um registro com estes dados.",
          code: error.code,
        },
        409,
        error
      );
    }

    if (error.code === "P2025") {
      return jsonError(
        {
          error: options.notFoundMessage ?? "Registro não encontrado.",
          code: error.code,
        },
        404,
        error
      );
    }

    if (error.code === "P2021" || error.code === "P2022") {
      return jsonError(
        {
          error:
            "Banco de dados desatualizado para esta operação. Rode as migrations e gere o Prisma Client novamente.",
          code: error.code,
        },
        500,
        error
      );
    }

    if (error.code === "P1001" || error.code === "P1017") {
      return jsonError(
        {
          error: "Não foi possível conectar ao banco de dados.",
          code: error.code,
        },
        503,
        error
      );
    }

    if (error.code === "P1002") {
      return jsonError(
        {
          error: "Tempo esgotado ao conectar ao banco de dados.",
          code: error.code,
        },
        504,
        error
      );
    }

    return jsonError(
      {
        error: options.fallback,
        code: error.code,
      },
      500,
      error
    );
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return jsonError(
      {
        error:
          "Erro de validação do Prisma. Verifique se o Prisma Client foi gerado novamente depois das últimas alterações no schema.",
        code: "PRISMA_VALIDATION_ERROR",
      },
      500,
      error
    );
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return jsonError(
      {
        error: "Não foi possível inicializar a conexão com o banco de dados.",
        code: error.errorCode ?? "PRISMA_INITIALIZATION_ERROR",
      },
      503,
      error
    );
  }

  return jsonError(
    {
      error: options.fallback,
      code: "INTERNAL_ERROR",
    },
    500,
    error
  );
}
