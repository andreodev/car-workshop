# AGENT.md

## Missão

Implementar a arquitetura multi-tenant de e-mails do SaaS White Label de oficinas.

A implementação deve centralizar todo envio de e-mails em uma camada desacoplada, usando inicialmente apenas Resend como provider oficial da plataforma, mas preparada para múltiplos providers e domínios próprios por tenant no futuro.

---

## Contexto do projeto

Este projeto é um sistema SaaS White Label para oficinas.

Cada tenant representa uma oficina/empresa diferente.

O sistema deve permitir que cada tenant tenha:

- Nome da empresa
- Logo
- Cor principal
- Site
- E-mail de suporte
- Nome do remetente
- Reply-To
- Lista de e-mails que recebem notificações internas
- Ativação/desativação de notificações
- Preparação futura para domínio próprio de e-mail

Nesta primeira versão, todos os tenants usam uma única conta do Resend da plataforma.

Não implementar API Key do Resend por tenant.

---

## Objetivo principal

Criar uma arquitetura semelhante a:

```text
Controllers
  ↓
Use Cases / Services
  ↓
EmailService
  ↓
EmailProvider interface
  ↓
ResendProvider
  ↓
Resend SDK
```

Nenhum controller, use case, service de domínio ou template pode importar diretamente o SDK do Resend.

---

## Estrutura sugerida

Criar ou adaptar a estrutura conforme o padrão existente do projeto:

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

Se o projeto já possuir uma organização diferente, seguir o padrão existente e evitar criar arquitetura paralela.

---

## Regras obrigatórias

- Não importar o SDK do Resend fora do `ResendProvider`.
- Não acessar variáveis de ambiente do Resend fora do `ResendProvider`.
- Todo envio de e-mail deve passar pelo `EmailService`.
- Não criar `resendApiKey` por tenant.
- Não criar `smtpUser`, `smtpPassword`, `smtpHost` ou provider customizado por tenant nesta etapa.
- Não deixar dados de tenant hardcoded.
- Não duplicar helpers, templates, services ou providers já existentes.
- Antes de criar um arquivo novo, verificar se já existe algo parecido no projeto.
- Reaproveitar padrões de `services`, `providers`, `interfaces`, `dto` e `types`.
- Seguir SOLID.
- Seguir Clean Architecture.
- Manter baixo acoplamento e alta coesão.
- Não alterar fluxos não relacionados sem necessidade.

---

## Interface do Provider

Criar uma interface semelhante a:

```ts
export interface EmailProvider {
  send(options: SendEmailOptions): Promise<void>;
}
```

Criar também o tipo `SendEmailOptions`, por exemplo:

```ts
export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  fromName?: string;
  replyTo?: string | null;
};
```

Adaptar conforme o padrão real do projeto.

---

## EmailService

O `EmailService` deve ser o ponto único de envio.

Ele deve ser responsável por:

- Receber o tenant.
- Resolver branding do tenant.
- Resolver remetente.
- Resolver reply-to.
- Resolver destinatários.
- Acionar o provider.
- Normalizar e validar e-mails.
- Remover duplicidades.
- Tratar erro de envio de forma padronizada.

---

## Branding por Tenant

Todos os templates devem receber os dados do tenant.

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

Esses dados devem vir do tenant/configuração real do sistema.

Nunca usar nome, logo, cor ou e-mail fixos dentro dos templates.

---

## Configurações de e-mail por Tenant

Criar ou adaptar uma modelagem semelhante a:

```ts
TenantEmailSettings {
  fromName: string;
  replyTo: string | null;
  notificationsEnabled: boolean;
  notificationEmails: string[];
}
```

Se fizer mais sentido manter esses campos direto no Tenant/Workshop, pode adaptar, desde que a responsabilidade fique clara.

---

## Campos sugeridos no Tenant/Workshop

Adicionar ou reaproveitar:

```text
companyName
logo
primaryColor
website
supportEmail
emailFromName
emailReplyTo
notificationsEnabled
notificationEmails
emailDomain
emailDomainStatus
```

Status possíveis de `emailDomainStatus`:

```text
NOT_CONFIGURED
PENDING
VERIFIED
```

Nesta etapa, os campos `emailDomain` e `emailDomainStatus` são apenas preparação futura.

Não implementar ainda verificação de domínio próprio.

---

## Tipos de envio

Separar claramente dois tipos de envio.

### 1. E-mails transacionais

São e-mails enviados para um destinatário específico.

Exemplos:

- Recuperação de senha
- Convite de usuário
- Confirmação de cadastro
- Confirmação de pagamento
- Recibo
- Nota fiscal
- Código de verificação

Nesses casos, o destinatário é informado diretamente pelo fluxo da aplicação.

Exemplo conceitual:

```ts
emailService.sendTransactionalEmail({
  tenantId,
  to: user.email,
  subject,
  template,
  payload,
});
```

---

### 2. Notificações internas

São e-mails enviados para a própria oficina/empresa.

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

Nesses casos, o `EmailService` deve buscar automaticamente os e-mails cadastrados em `notificationEmails`.

Exemplo conceitual:

```ts
emailService.sendInternalNotification({
  tenantId,
  subject,
  template,
  payload,
});
```

Se `notificationsEnabled` for `false`, não enviar.

Se `notificationEmails` estiver vazio, não enviar e registrar log seguro.

---

## Remetente

Nesta primeira versão, todos os e-mails saem pelo domínio oficial da plataforma.

Exemplo:

```text
Rikinho Auto Center <no-reply@seudominio.com.br>
```

ou:

```text
Oficina XPTO <no-reply@seudominio.com.br>
```

Apenas o nome do remetente muda por tenant.

O domínio continua sendo o domínio da plataforma.

O domínio deve vir de variável de ambiente da plataforma, por exemplo:

```env
EMAIL_FROM_ADDRESS=no-reply@seudominio.com.br
```

---

## Reply-To

Se o tenant tiver `emailReplyTo` ou `supportEmail`, usar como Reply-To.

Exemplo:

```text
Reply-To: contato@empresa.com.br
```

Assim, quando alguém responder, a resposta vai para a empresa.

---

## Templates

Todos os templates devem receber somente dados prontos.

Exemplo:

```ts
template({
  tenant,
  user,
  payload,
});
```

Os templates não devem consultar banco de dados.

Os templates não devem conhecer Resend.

Os templates não devem conter dados hardcoded de uma oficina específica.

---

## ResendProvider

O `ResendProvider` deve:

- Instanciar o SDK do Resend.
- Ler a API Key apenas de variável de ambiente.
- Converter `SendEmailOptions` para o formato do Resend.
- Enviar o e-mail.
- Isolar detalhes específicos do Resend.

Variáveis esperadas:

```env
RESEND_API_KEY=
EMAIL_FROM_ADDRESS=
```

Opcional:

```env
EMAIL_DEFAULT_FROM_NAME=
```

---

## Preparação para múltiplos providers

A arquitetura deve permitir que futuramente existam providers como:

```text
SESProvider
PostmarkProvider
MailgunProvider
BrevoProvider
SMTPProvider
ResendProvider
```

A troca ou adição de provider não deve exigir alteração nos controllers, use cases ou templates.

---

## Preparação para domínio próprio

Não implementar domínio próprio agora.

Apenas deixar preparado para que no futuro, quando:

```ts
emailDomainStatus === "VERIFIED";
```

o sistema possa enviar como:

```text
empresa@dominio-do-tenant.com
```

sem mudar o restante da aplicação.

---

## Validações

Implementar validações para:

- E-mails inválidos.
- Lista de destinatários vazia.
- Duplicidade em `notificationEmails`.
- Tenant inexistente.
- Configuração de e-mail ausente.
- Notificações internas desativadas.
- Provider sem API Key configurada.

---

## Logs

Adicionar logs seguros para:

- E-mail enviado com sucesso.
- Falha ao enviar e-mail.
- Notificação ignorada por estar desativada.
- Notificação ignorada por falta de destinatários.
- Tenant sem configuração de e-mail.

Nunca logar API Key.

Nunca logar dados sensíveis desnecessários.

---

## Resultado esperado

Ao final, o projeto deve ter:

- Uma camada centralizada de e-mail.
- Um `EmailService` único.
- Um `EmailProvider` desacoplado.
- Um `ResendProvider`.
- Configuração de e-mail por tenant.
- Branding por tenant nos templates.
- Reply-To por tenant.
- Lista de destinatários internos por tenant.
- Notificações internas ativáveis/desativáveis.
- Preparação para domínio próprio.
- Preparação para múltiplos providers.
- Nenhum SDK do Resend espalhado pelo projeto.
- Nenhuma API Key por tenant.
- Nenhuma duplicação desnecessária.
- Código seguindo o padrão arquitetural existente.
