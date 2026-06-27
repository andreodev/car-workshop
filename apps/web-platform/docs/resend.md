# Implementação da Arquitetura Multi-Tenant de E-mails (SaaS White Label)

## Objetivo

Implementar uma arquitetura completa de envio de e-mails para o sistema SaaS White Label, preparada para suportar múltiplos tenants de forma escalável, desacoplada e seguindo boas práticas de engenharia de software.

Nesta primeira versão, **todos os tenants utilizarão a mesma conta do Resend da plataforma**, sem necessidade de cada cliente possuir uma conta própria.

A arquitetura, porém, deve ficar preparada para futuramente suportar domínios próprios por tenant sem necessidade de refatoração.

---

# Objetivos da implementação

- Criar uma camada de abstração para envio de e-mails.
- Remover qualquer dependência direta do SDK do Resend fora do provider.
- Centralizar toda a lógica de envio.
- Permitir personalização visual por tenant.
- Preparar a arquitetura para múltiplos providers no futuro.
- Preparar a arquitetura para domínios próprios.
- Evitar duplicação de código.
- Seguir SOLID.
- Seguir Clean Architecture.
- Seguir a arquitetura já utilizada no projeto.

---

# Arquitetura desejada

Toda a aplicação deverá enviar e-mails apenas através desta camada:

```text
Controllers
      ↓
Use Cases / Services
      ↓
EmailService
      ↓
EmailProvider (interface)
      ↓
ResendProvider
      ↓
Resend SDK
```

Nenhum outro lugar do projeto poderá importar diretamente o SDK do Resend.

---

# Estrutura sugerida

```text
modules/
└── email/
    ├── providers/
    │   ├── email-provider.interface.ts
    │   └── resend.provider.ts
    │
    ├── services/
    │   └── email.service.ts
    │
    ├── templates/
    │
    ├── dto/
    │
    ├── interfaces/
    │
    ├── types/
    │
    └── index.ts
```

---

# Interface do Provider

Criar uma interface semelhante a:

```ts
interface EmailProvider {
  send(options: SendEmailOptions): Promise<void>;
}
```

O EmailService nunca deverá depender diretamente do Resend.

---

# Branding por Tenant

Todo envio deverá receber as configurações visuais do tenant.

Exemplo:

```ts
tenantBranding = {
  companyName,
  logo,
  primaryColor,
  website,
  supportEmail,
};
```

Essas informações serão utilizadas pelos templates.

Nunca utilizar informações hardcoded.

---

# Configuração de E-mails por Tenant

Criar uma configuração exclusiva para cada tenant contendo:

```text
Configurações

└── E-mails

    Nome do remetente

    E-mail para resposta (Reply-To)

    Lista de e-mails que receberão notificações

    Ativar/desativar notificações

    (Futuro) Domínio próprio
```

---

# Modelagem sugerida

Criar uma entidade semelhante a:

```ts
TenantEmailSettings {

    fromName: string

    replyTo: string | null

    notificationsEnabled: boolean

    notificationEmails: string[]

}
```

ou adaptar ao modelo atual do projeto caso já exista algo semelhante.

---

# Notification Emails

O sistema deverá permitir cadastrar múltiplos destinatários para notificações internas.

Exemplo:

```text
contato@empresa.com.br

financeiro@empresa.com.br

gerencia@empresa.com.br

dono@empresa.com.br
```

Todos devem receber automaticamente os e-mails internos quando as notificações estiverem habilitadas.

Exemplos:

- Nova Ordem de Serviço
- Novo orçamento
- Novo cliente
- Novo usuário
- Pagamento recebido
- Cobrança paga
- Solicitação de saque
- Relatórios
- Alertas importantes
- Falhas críticas

Permitir adicionar e remover destinatários futuramente pela interface administrativa.

Validar todos os e-mails.

Remover duplicados automaticamente.

---

# Tipos de envio

Separar claramente dois tipos de envio.

## 1. E-mails transacionais

Enviados diretamente para um destinatário específico.

Exemplos:

- Recuperação de senha
- Convite de usuário
- Confirmação de cadastro
- Confirmação de pagamento
- Recibo
- Nota Fiscal
- Código de verificação

Nesses casos o destinatário continua sendo informado pelo fluxo da aplicação.

---

## 2. Notificações internas

Quando o sistema gerar uma notificação interna, o EmailService deverá buscar automaticamente os e-mails cadastrados em:

```text
notificationEmails
```

Não será necessário informar destinatários manualmente.

---

# Remetente

Nesta primeira versão todos os e-mails deverão utilizar o domínio oficial da plataforma.

Exemplo:

```text
From:

Rikinho Auto Center <no-reply@seudominio.com.br>
```

ou

```text
From:

Oficina XPTO <no-reply@seudominio.com.br>
```

Apenas o nome muda.

O domínio permanece sendo o da plataforma.

---

# Reply-To

Caso exista um Reply-To configurado pelo tenant, utilizar:

```text
Reply-To:

contato@empresa.com.br
```

Assim todas as respostas irão diretamente para a empresa.

---

# Templates

Todos os templates deverão receber apenas:

```ts
tenant;

user;

payload;
```

Os templates nunca deverão consultar banco de dados.

Toda informação deverá chegar pronta.

---

# Modelagem do Tenant

Adicionar (caso ainda não existam):

```text
companyName

logo

primaryColor

website

supportEmail
```

Adicionar também:

```text
emailDomain

emailDomainStatus
```

Status possíveis:

```text
NOT_CONFIGURED

PENDING

VERIFIED
```

Esses campos serão utilizados futuramente.

Não implementar ainda a lógica de domínio próprio.

---

# NÃO implementar nesta etapa

Não criar:

```text
resendApiKey

providerSecret

smtpHost

smtpPort

smtpUser

smtpPassword

providerPerTenant
```

Toda a plataforma utilizará apenas uma conta do Resend.

---

# Preparação para o futuro

A arquitetura deve permitir adicionar novos providers apenas criando novas implementações da interface.

Exemplo:

```text
SESProvider

PostmarkProvider

MailgunProvider

BrevoProvider

SMTPProvider

ResendProvider
```

Sem alterar controllers, services ou templates.

---

# Preparação para domínio próprio

Ainda não implementar.

Porém deixar preparado para que futuramente, quando:

```text
emailDomainStatus == VERIFIED
```

o sistema passe automaticamente a utilizar:

```text
empresa@dominio-do-tenant.com
```

sem alterar nenhuma outra parte do sistema.

---

# Regras importantes

- Nunca importar o SDK do Resend fora do provider.
- Nunca acessar variáveis de ambiente do Resend fora do provider.
- Todo envio deve passar obrigatoriamente pelo EmailService.
- Toda lógica de provider deve ficar encapsulada.
- Reutilizar componentes existentes sempre que possível.
- Antes de criar novos helpers, verificar se já existe algo equivalente no projeto.
- Caso existam implementações duplicadas, consolidar em uma única solução.
- Manter baixo acoplamento.
- Manter alta coesão.
- Seguir SOLID.
- Seguir Clean Architecture.
- Seguir o padrão arquitetural já utilizado no projeto (services, providers, interfaces, DTOs, types).

---

# Resultado esperado

Ao final da implementação o sistema deverá possuir:

- Arquitetura desacoplada para envio de e-mails.
- Um único provider (Resend).
- Branding por tenant.
- Templates reutilizáveis.
- Configuração de remetente por tenant.
- Reply-To por tenant.
- Lista de e-mails para notificações internas.
- Ativação/desativação de notificações por tenant.
- Preparação para múltiplos providers.
- Preparação para domínio próprio.
- Sem duplicação de código.
- Sem dependências diretas do Resend espalhadas pelo projeto.
- Escalável para milhares de tenants sem necessidade de refatoração estrutural.
