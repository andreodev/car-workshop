This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Docker (App + Postgres)

Start the app and a local Postgres database with Docker Compose:

```bash
docker compose up --build
```

The app runs on http://localhost:3000 and Postgres is exposed on port 5432.

Connection string used by the app container:

```
postgres://postgres:postgres@db:5432/car_workshop
```

To stop and remove containers:

```bash
docker compose down
```

## Prisma + Auth

Create your local environment file:

```bash
cp .env.example .env
```

Run Prisma migrations and generate the client:

```bash
pnpm prisma migrate dev --name init
pnpm prisma generate
```

Auth routes:

- Sign up: http://localhost:3000/signup
- Sign in: http://localhost:3000/login

## Daily Report Email

Configure these variables in `.env` or in the deployment environment:

```bash
RESEND_API_KEY=
CRON_SECRET=change-me
DAILY_REPORT_TIME_ZONE=America/Manaus
```

The sender email and internal notification recipients are configured per tenant in `Configurações > E-mails`. The automation sends the daily financial PDF through the centralized email service and says in the email text whether the day was good or bad based on the cash balance.

The project includes a Vercel Cron in `vercel.json`:

```json
{
  "path": "/api/automations/daily-report-email",
  "schedule": "30 22 * * *"
}
```

Vercel cron expressions run in UTC, so `30 22 * * *` sends the report every day at 18:30 in `America/Manaus`.

Trigger the automation with:

```bash
curl -X POST http://localhost:3000/api/automations/daily-report-email \
  -H "Authorization: Bearer $CRON_SECRET"
```

On Vercel, configure `CRON_SECRET` in the production environment. Vercel will send it as the `Authorization` header when the daily cron calls the route.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
