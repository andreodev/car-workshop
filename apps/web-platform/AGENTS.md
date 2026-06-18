Objetivo

Refatorar o frontend atual (React + Next.js + TypeScript strict) para seguir o padrão modular descrito neste documento, com foco em organização por domínio, legibilidade e manutenibilidade.

O foco deste agente é somente frontend.

Não alterar: backend, rotas de API/route handlers, Prisma, schema/migrations do banco de dados ou regras de negócio executadas no servidor.

Princípio geral

Esta é uma refatoração estrutural, não uma reescrita. O comportamento observável da aplicação (UI, fluxos, validações, chamadas de API) deve permanecer idêntico antes e depois. Mudanças de nome de arquivo, local de pasta e separação de responsabilidades são o objetivo; mudanças de lógica de negócio não são.

Se, durante a refatoração, for identificado um bug, código morto ou uma melhoria de lógica que não seja estritamente necessária para mover o arquivo para o novo padrão, não corrija no mesmo PR. Anote em uma seção ## Notas / débito técnico encontrado no final do PR e siga em frente. Isso mantém os PRs de refatoração revisáveis e seguros de reverter.

Escopo

Refatorar páginas, componentes, hooks, types, utils e services do frontend para o padrão modular abaixo.

txtmodules/
nome-do-modulo/
api/
components/
hooks/
pages/
types/
utils/
index.ts

Exemplo de referência

txtmodules/
client/
api/
client.service.ts
client.keys.ts
client-cep.service.ts

    components/
      client-form.tsx
      client-form-fields.tsx
      client-form-section.tsx
      client-form-stepper.tsx

    hooks/
      use-client-form.ts
      use-clients-page.ts
      use-client.ts

    pages/
      create-client-page/
        index.tsx
      edit-client-page/
        index.tsx
      get-clients-page/
        index.tsx
      client-details-page/
        index.tsx

    types/
      client.types.ts

    utils/
      client-form-schema.ts
      client-form-utils.ts
      client-input-masks.ts

    index.ts

Particularidades do Next.js

Como o projeto usa Next.js (App Router ou Pages Router), as pastas de rota (app/ ou pages/ na raiz do Next) continuam existindo e não são o mesmo conceito que modules/\*/pages/.

Regra prática:

A pasta de rota do Next (app/clientes/page.tsx, por exemplo) deve ficar fina: só importa e renderiza o componente correspondente de modules/client/pages/get-clients-page.
Toda a lógica de tela, hooks, montagem de layout e composição de componentes fica dentro de modules/_/pages/_/index.tsx.
Isso evita acoplar a estrutura de domínio às convenções de roteamento do framework, e facilita mover/renomear rotas sem tocar na lógica.

Exemplo:

tsx// app/clientes/page.tsx (Next.js — fica fino)
import { GetClientsPage } from '@/modules/client';

export default function Page() {
return <GetClientsPage />;
}

tsx// modules/client/pages/get-clients-page/index.tsx (lógica real)
import { useClientsPage } from '../../hooks/use-clients-page';
import { ClientList } from '../../components/client-list';

export function GetClientsPage() {
const { clients, isLoading, filters, setFilters } = useClientsPage();

if (isLoading) return <ClientListSkeleton />;

return <ClientList clients={clients} filters={filters} onFilterChange={setFilters} />;
}

Se houver loading.tsx, error.tsx, layout.tsx ou metadata específica de rota (App Router), eles continuam na pasta de rota do Next, pois são contratos do framework — não devem ser movidos para modules/.

Server Components e Client Components: ao mover componentes para modules/\*/components, preserve a diretiva 'use client' exatamente como estava. Não promova um componente a Server Component nem o force a Client Component como parte da refatoração estrutural — isso é mudança de comportamento, não de organização.

Regras principais

Manter o comportamento atual funcionando, em todos os fluxos.
Não mudar regras de negócio sem necessidade explícita.
Não alterar backend.
Não alterar contratos de API sem necessidade.
Não quebrar imports existentes fora do código que está sendo movido (atualizar todos os pontos de import que apontam para os arquivos movidos).
Não remover funcionalidades.
Não criar componentes genéricos demais sem necessidade real de reuso.
Separar responsabilidades por módulo.
Evitar arquivos muito grandes (ver limites sugeridos abaixo).
Priorizar clareza ao invés de abstração excessiva.
Preservar tipagem estrita: nenhum any novo deve ser introduzido como atalho para fazer o build passar. Se um tipo ficou ambíguo após a movimentação, resolva o tipo corretamente.

Limites sugeridos (linha de corte, não regra rígida)

Componente (.tsx): se passar de ~200–250 linhas, considere quebrar em subcomponentes dentro do mesmo módulo.
Hook: se um hook está orquestrando mais de 3–4 responsabilidades distintas (ex.: fetch + form state + paginação + filtros), considere dividir em hooks menores compostos por um hook "page" que os une.
Arquivo de api/: um service por recurso. Se um .service.ts cresce muito, é sinal de que o módulo pode precisar ser dividido em submódulos.

Padrão de organização

Cada módulo deve conter apenas o que pertence ao domínio dele.

Exemplos de módulos:

txtmodules/
client/
vehicle/
mechanic/
sector/
catalog/
estimate/
order-service/
pdv/
financial/

Responsabilidade das pastas

api/

Arquivos responsáveis por chamadas HTTP, services e keys de cache.

txtapi/
estimate.service.ts
estimate.keys.ts

Use para:

fetch / create / update / delete
requests com query params
query keys do React Query (se aplicável)
chamadas a Server Actions do Next, quando o módulo as utiliza

components/

Componentes visuais e partes reutilizáveis dentro do módulo.

txtcomponents/
estimate-form.tsx
estimate-form-items.tsx
estimate-summary-card.tsx
estimate-status-badge.tsx

Use para: formulários, cards, modais, tabelas, seções de tela, componentes específicos do módulo.

hooks/

Hooks específicos do módulo.

txthooks/
use-estimate-form.ts
use-estimates-page.ts
use-estimate.ts

Use para: estado de formulário, mutations, queries, paginação, filtros, lógica de tela.

pages/

Cada página (no sentido de "tela", não de rota do Next) deve ficar isolada em uma pasta com index.tsx.

txtpages/
get-estimates-page/
index.tsx
create-estimate-page/
index.tsx
edit-estimate-page/
index.tsx
estimate-details-page/
index.tsx

A page deve ser responsável por montar a tela usando hooks e components. Evite colocar lógica grande diretamente na page — ela deve ler como uma composição, não como uma implementação.

types/

Tipos e interfaces do módulo.

txttypes/
estimate.types.ts

Use para: DTOs, tipos de formulário, tipos de listagem, tipos de filtro, tipos de resposta da API.

utils/

Funções auxiliares, schemas, masks e formatadores específicos do módulo.

txtutils/
estimate-form-schema.ts
estimate-form-utils.ts
estimate-input-masks.ts

Use para: Zod schemas, helpers, máscaras, normalizadores, formatadores locais.

Código compartilhado entre módulos

Nem todo código pertence a um módulo específico. Antes de mover algo para dentro de modules/x, verifique se ele é usado por mais de um módulo.

Se um componente, hook, type ou util é usado por 2 ou mais módulos, ele não pertence a nenhum módulo específico — deve ir para uma área compartilhada (ex.: shared/components, shared/hooks, shared/types, shared/utils), seguindo a mesma convenção de nomenclatura.
Não duplique código entre módulos só para "manter isolado". Duplicação de UI genérica (botão, input, modal base) deve estar em shared/, não repetida em cada módulo.
Se ficar em dúvida se algo é específico do domínio ou genérico, pergunte: "isso teria sentido fora do contexto de estimate/client/etc.?" Se sim, é compartilhado.

Barrel exports (index.ts)

Cada módulo deve ter um index.ts.

tsexport _ from './api/estimate.service';
export _ from './api/estimate.keys';

export \* from './types/estimate.types';

export _ from './hooks/use-estimate';
export _ from './hooks/use-estimate-form';
export \* from './hooks/use-estimates-page';

Regras:

Exporte apenas o que será usado fora do módulo. Evite exportar tudo desnecessariamente.
Componentes de pages/ geralmente também devem ser exportados pelo barrel, já que a rota do Next precisa importá-los (ver seção "Particularidades do Next.js").
Não crie barrel exports dentro de subpastas (components/index.ts, hooks/index.ts) a menos que o módulo já tenha esse padrão — um único index.ts na raiz do módulo é suficiente na maioria dos casos, e evita ciclos de import acidentais.

Padrão de nomenclatura

Usar kebab-case para arquivos:

txtestimate-form.tsx
use-estimate-form.ts
estimate.service.ts
estimate.types.ts
estimate-form-schema.ts

Usar PascalCase para componentes:

tsexport function EstimateForm() {}

Usar camelCase para funções:

tsexport function formatEstimateStatus() {}

Usar prefixo use para hooks:

tsexport function useEstimateForm() {}

Como refatorar

Para cada tela ou módulo, seguir esta ordem:

Identificar todos os arquivos relacionados ao domínio (telas, componentes, hooks, services, types, schemas) espalhados pelo código atual.
Criar a pasta em modules/nome-do-modulo com as subpastas api/, components/, hooks/, pages/, types/, utils/.
Mover (não recriar) os arquivos, preservando o conteúdo original o máximo possível — a refatoração é estrutural, não uma reescrita de lógica.
Separar chamadas HTTP em api/.
Separar componentes em components/.
Separar lógica de estado em hooks/.
Separar tipos em types/.
Separar schemas e helpers em utils/.
Criar/atualizar index.ts do módulo com os exports públicos.
Atualizar todos os imports no restante do código que apontavam para os caminhos antigos.
Deixar a pasta de rota do Next (app/ ou pages/ na raiz) apenas importando da page do módulo.
Rodar lint e typecheck.
Rodar a aplicação localmente (ou os testes existentes) e validar manualmente que a tela continua funcionando como antes.

Importante

Não fazer refatoração gigantesca em vários módulos ao mesmo tempo. Refatorar módulo por módulo, um PR por módulo.

Prioridade sugerida

estimate
order-service
pdv
client
vehicle
catalog
financial

Exemplo: antes vs depois

Antes (estrutura comum em projetos não modulares)

txtsrc/
pages/
clientes/
index.tsx # busca dados, define estado, renderiza tabela, tudo junto
novo.tsx
[id]/editar.tsx
components/
ClientForm.tsx
ClientTable.tsx
CepInput.tsx
services/
clientApi.ts
hooks/
useClients.ts
types/
index.ts # tipos de todos os domínios misturados
utils/
masks.ts # máscaras de todos os domínios misturadas

Problemas típicos: types/index.ts e utils/masks.ts crescem indefinidamente e misturam domínios sem relação; useClients.ts frequentemente acumula fetch, paginação, filtros e mutações no mesmo hook; fica difícil saber, só pelo nome do arquivo, a qual domínio ele pertence.

Depois (padrão modular deste documento)

txtmodules/
client/
api/
client.service.ts
client.keys.ts
client-cep.service.ts
components/
client-form.tsx
client-form-fields.tsx
client-table.tsx
hooks/
use-client-form.ts
use-clients-page.ts
pages/
get-clients-page/index.tsx
create-client-page/index.tsx
edit-client-page/index.tsx
types/
client.types.ts
utils/
client-input-masks.ts
index.ts

app/
clientes/
page.tsx # importa GetClientsPage de modules/client
novo/page.tsx # importa CreateClientPage de modules/client
[id]/editar/page.tsx # importa EditClientPage de modules/client

O que muda na prática: ClientForm.tsx se torna client-form.tsx dentro de modules/client/components; clientApi.ts se divide em client.service.ts (chamadas HTTP) e client.keys.ts (query keys); useClients.ts, se fazia fetch + filtros + paginação junto, se divide em use-clients-page.ts (orquestração da tela) podendo compor hooks menores se necessário; CepInput.tsx, por ser específico de endereço/cliente, vira client-cep.service.ts (chamada) + componente correspondente em components/, a menos que seja usado por outros módulos — nesse caso vai para shared/.

Validação obrigatória

Após alterações, rodar lint:

bashnpm run lint

# ou

pnpm lint

# ou

yarn lint

Validar build e tipos:

bashnpm run build

# ou

npm run typecheck

Como o projeto usa TypeScript em modo estrito, o typecheck deve passar sem novos erros e sem novos any, @ts-ignore ou @ts-expect-error introduzidos só para contornar a movimentação de arquivos.

Checklist de PR

Todo PR de refatoração de módulo deve confirmar os itens abaixo antes de ser aberto para revisão:

Apenas um módulo foi refatorado neste PR.
Nenhum arquivo de backend, rota de API, Prisma, schema ou migration foi alterado.
Nenhuma regra de negócio foi alterada (comportamento idêntico ao anterior).
Nenhum contrato de API (request/response) foi alterado sem necessidade.
Estrutura do módulo segue api/ components/ hooks/ pages/ types/ utils/ index.ts.
Nomenclatura de arquivos em kebab-case, componentes em PascalCase, hooks com prefixo use.
Código usado por 2+ módulos foi movido para shared/, não duplicado.
index.ts do módulo exporta apenas o que é consumido fora do módulo.
Pastas de rota do Next (app//pages/ na raiz) ficaram finas, apenas importando das pages do módulo.
Diretivas 'use client' preservadas exatamente como no código original.
Todos os imports que apontavam para os arquivos antigos foram atualizados (nenhum import quebrado).
npm run lint (ou equivalente) passa sem novos erros.
npm run typecheck / npm run build passa sem novos erros, sem novos any ou supressões de tipo.
Telas afetadas foram testadas manualmente (ou via testes automatizados, se existirem) e o comportamento está idêntico ao anterior.
Itens de débito técnico encontrados durante a refatoração (bugs, código morto, melhorias fora de escopo) estão listados na seção "Notas / débito técnico encontrado", não corrigidos neste PR.

Restrições

Não alterar:

backend
Prisma
migrations
banco de dados
regras de comissão
regras financeiras
contratos públicos da API

Só alterar frontend.

Resultado esperado

O frontend deve ficar organizado por domínio, seguindo o padrão:

txtmodules/
modulo/
api/
components/
hooks/
pages/
types/
utils/
index.ts

Com arquivos menores, responsabilidades separadas, imports mais claros, pastas de rota do Next finas e o mesmo comportamento de antes da refatoração.

Notas / débito técnico encontrado

Preencher durante a refatoração de cada módulo. Listar aqui qualquer bug, código morto, duplicação ou melhoria identificada que não foi corrigida neste PR por estar fora do escopo de "refatoração estrutural".

(vazio)

Nome de commit

bashrefactor(frontend): organize modules by domain structure

Para PRs de módulos individuais, sugestão de padrão:

bashrefactor(frontend): organize <nome-do-modulo> module by domain structure
