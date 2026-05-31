import { onlyDigits } from "../utils/client-input-masks";

export type ViaCepAddress = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
};

type ViaCepResponse = ViaCepAddress & {
  erro?: boolean;
};

export async function fetchAddressByCep(cep: string, signal?: AbortSignal) {
  const digits = onlyDigits(cep);

  if (digits.length !== 8) {
    return null;
  }

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
    signal,
  });

  if (!response.ok) {
    throw new Error("Não foi possível consultar o CEP.");
  }

  const data = (await response.json()) as ViaCepResponse;

  if (data.erro) {
    throw new Error("CEP não encontrado.");
  }

  return data;
}
