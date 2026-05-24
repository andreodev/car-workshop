/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient, Prisma } = require("@prisma/client");

const prisma = new PrismaClient();

const dec = (value) => new Prisma.Decimal(value);
const DAY = 24 * 60 * 60 * 1000;
const now = new Date();

const names = [
  "Ana Lima",
  "Bruno Souza",
  "Carla Mendes",
  "Diego Pereira",
  "Elaine Costa",
  "Fabio Rocha",
  "Gabriela Nunes",
  "Henrique Alves",
  "Isabela Martins",
  "Joao Batista",
  "Karina Freitas",
  "Leandro Gomes",
  "Mariana Castro",
  "Nelson Ribeiro",
  "Olivia Fernandes",
  "Paulo Duarte",
  "Renata Moreira",
  "Sergio Barros",
  "Tatiane Araujo",
  "Vinicius Lopes",
  "Wagner Cardoso",
  "Yasmin Teixeira",
  "Andre Campos",
  "Bianca Vieira",
  "Caio Barbosa",
  "Daniela Reis",
  "Eduardo Melo",
  "Fernanda Dias",
  "Gustavo Ramos",
  "Helena Prado",
  "Igor Santana",
  "Juliana Pires",
  "Marcos Tavares",
  "Patricia Cunha",
  "Rafael Matos",
  "Simone Xavier",
];

const vehicleModels = [
  ["Volkswagen", "Gol", "1.6 MSI", "FLEX"],
  ["Volkswagen", "T-Cross", "Comfortline", "FLEX"],
  ["Fiat", "Argo", "Drive", "FLEX"],
  ["Fiat", "Toro", "Freedom", "DIESEL"],
  ["Chevrolet", "Onix", "Premier", "FLEX"],
  ["Chevrolet", "S10", "LTZ", "DIESEL"],
  ["Toyota", "Corolla", "XEI", "FLEX"],
  ["Toyota", "Hilux", "SRV", "DIESEL"],
  ["Honda", "Civic", "EXL", "FLEX"],
  ["Honda", "HR-V", "Touring", "FLEX"],
  ["Hyundai", "HB20", "Evolution", "FLEX"],
  ["Jeep", "Compass", "Longitude", "FLEX"],
  ["Renault", "Duster", "Iconic", "FLEX"],
  ["Nissan", "Kicks", "Advance", "FLEX"],
  ["Ford", "Ranger", "XLT", "DIESEL"],
  ["Peugeot", "208", "Allure", "FLEX"],
];

const colors = ["Branco", "Prata", "Preto", "Cinza", "Vermelho", "Azul", "Bege"];
const cities = [
  ["Sao Paulo", "SP"],
  ["Rio de Janeiro", "RJ"],
  ["Belo Horizonte", "MG"],
  ["Curitiba", "PR"],
  ["Campinas", "SP"],
  ["Manaus", "AM"],
  ["Goiania", "GO"],
  ["Florianopolis", "SC"],
];

const catalogSeed = [
  ["SERVICO", "Diagnostico eletronico", "180.00", "SRV-DIAG"],
  ["SERVICO", "Troca de oleo", "160.00", "SRV-OLEO"],
  ["SERVICO", "Alinhamento", "130.00", "SRV-ALINH"],
  ["SERVICO", "Balanceamento", "90.00", "SRV-BAL"],
  ["SERVICO", "Revisao preventiva", "420.00", "SRV-REV"],
  ["SERVICO", "Limpeza de bicos", "260.00", "SRV-BICOS"],
  ["SERVICO", "Troca de correia dentada", "520.00", "SRV-CORREIA"],
  ["SERVICO", "Sangria do sistema de freio", "180.00", "SRV-FREIO"],
  ["SERVICO", "Higienizacao do ar condicionado", "150.00", "SRV-AR"],
  ["SERVICO", "Troca de embreagem", "780.00", "SRV-EMB"],
  ["PRODUTO", "Pastilha de freio dianteira", "240.00", "PEC-FREIO-D"],
  ["PRODUTO", "Pastilha de freio traseira", "220.00", "PEC-FREIO-T"],
  ["PRODUTO", "Filtro de oleo", "45.00", "PEC-FILT-OLEO"],
  ["PRODUTO", "Filtro de ar", "65.00", "PEC-FILT-AR"],
  ["PRODUTO", "Filtro de combustivel", "75.00", "PEC-FILT-COMB"],
  ["PRODUTO", "Oleo sintetico 5W30", "58.00", "PEC-OLEO-5W30"],
  ["PRODUTO", "Vela de ignicao", "38.00", "PEC-VELA"],
  ["PRODUTO", "Bateria 60Ah", "520.00", "PEC-BAT-60"],
  ["PRODUTO", "Amortecedor dianteiro", "390.00", "PEC-AMORT-D"],
  ["PRODUTO", "Pneu 185/60 R15", "410.00", "PEC-PNEU-15"],
  ["PRODUTO", "Correia dentada", "190.00", "PEC-CORREIA"],
  ["PRODUTO", "Kit embreagem", "690.00", "PEC-EMB"],
  ["PRODUTO", "Sensor lambda", "310.00", "PEC-LAMBDA"],
  ["PRODUTO", "Lampada farol H7", "55.00", "PEC-H7"],
];

const mechanicSeed = [
  ["Lucas Ferreira", "Especialista em motor e injecao"],
  ["Marcos Oliveira", "Suspensao, freios e alinhamento"],
  ["Rafael Lima", "Eletrica e diagnostico"],
  ["Thiago Santos", "Revisao geral e troca de oleo"],
  ["Priscila Rocha", "Ar condicionado e acabamento"],
  ["Bruno Carvalho", "Transmissao e embreagem"],
  ["Cesar Almeida", "Diesel e utilitarios"],
  ["Felipe Martins", "Servicos rapidos"],
];

const sectorsSeed = [
  ["Balcao", "Atendimento presencial"],
  ["Oficina", "Servicos internos"],
  ["Pecas", "Venda de pecas"],
  ["Delivery", "Retirada e entrega"],
  ["Garantia", "Retornos e garantia"],
];

function dateDaysAgo(days, hour = 9, minute = 0) {
  const date = new Date(now.getTime() - days * DAY);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function dateDaysAhead(days, hour = 18, minute = 0) {
  const date = new Date(now.getTime() + days * DAY);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function money(value) {
  return Math.round(value * 100) / 100;
}

function makePlate(index) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return `${letters[index % 26]}${letters[(index + 7) % 26]}${letters[(index + 13) % 26]}${index % 10}${letters[(index + 3) % 26]}${(index + 4) % 10}${(index + 8) % 10}`;
}

function pick(list, index) {
  return list[index % list.length];
}

function buildLineItems(catalogItems, seed, minItems = 2) {
  const count = minItems + (seed % 3);
  const items = [];
  let subtotal = 0;
  let discountTotal = 0;

  for (let index = 0; index < count; index += 1) {
    const catalogItem = catalogItems[(seed * 3 + index * 5) % catalogItems.length];
    const quantity = catalogItem.type === "PRODUTO" ? 1 + ((seed + index) % 3) : 1;
    const unitPrice = Number(catalogItem.unitPrice);
    const lineSubtotal = money(unitPrice * quantity);
    const discount = (seed + index) % 5 === 0 ? money(lineSubtotal * 0.08) : 0;
    const total = money(lineSubtotal - discount);

    subtotal = money(subtotal + lineSubtotal);
    discountTotal = money(discountTotal + discount);

    items.push({
      catalogItem,
      description: catalogItem.name,
      quantity,
      unitPrice: dec(unitPrice.toFixed(2)),
      discount: dec(discount.toFixed(2)),
      total: dec(total.toFixed(2)),
    });
  }

  return {
    items,
    subtotal: dec(subtotal.toFixed(2)),
    discountTotal: dec(discountTotal.toFixed(2)),
    total: dec(Math.max(subtotal - discountTotal, 0).toFixed(2)),
  };
}

async function resetDatabase() {
  await prisma.$transaction([
    prisma.serviceOrderItem.deleteMany(),
    prisma.estimateItem.deleteMany(),
    prisma.saleItem.deleteMany(),
    prisma.serviceOrder.deleteMany(),
    prisma.estimate.deleteMany(),
    prisma.sale.deleteMany(),
    prisma.financialAccount.deleteMany(),
    prisma.vehicle.deleteMany(),
    prisma.catalogItem.deleteMany(),
    prisma.sector.deleteMany(),
    prisma.mechanic.deleteMany(),
    prisma.client.deleteMany(),
    prisma.account.deleteMany(),
    prisma.session.deleteMany(),
    prisma.verificationToken.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function main() {
  await resetDatabase();

  const users = await Promise.all(
    [
      ["Admin", "admin@car-workshop.local", "seed-admin"],
      ["Gerente Oficina", "gerente@car-workshop.local", "seed-manager"],
      ["Atendimento", "atendimento@car-workshop.local", "seed-frontdesk"],
      ["Financeiro", "financeiro@car-workshop.local", "seed-finance"],
    ].map(([name, email, passwordHash]) =>
      prisma.user.create({ data: { name, email, passwordHash } })
    )
  );

  await prisma.account.create({
    data: {
      userId: users[0].id,
      type: "credentials",
      provider: "credentials",
      providerAccountId: "admin",
    },
  });

  const mechanics = await Promise.all(
    mechanicSeed.map(([name, notes], index) =>
      prisma.mechanic.create({
        data: {
          name,
          notes,
          active: index !== mechanicSeed.length - 1,
        },
      })
    )
  );

  const sectors = await Promise.all(
    sectorsSeed.map(([name, notes]) => prisma.sector.create({ data: { name, notes } }))
  );

  const catalogItems = await Promise.all(
    catalogSeed.map(([type, name, unitPrice, sku]) =>
      prisma.catalogItem.create({
        data: {
          type,
          name,
          sku,
          unitPrice: dec(unitPrice),
          notes: type === "SERVICO" ? "Servico recorrente da oficina" : "Item de giro",
        },
      })
    )
  );

  const clients = [];
  for (let index = 0; index < names.length; index += 1) {
    const [city, state] = pick(cities, index);
    clients.push(
      await prisma.client.create({
        data: {
          personType: index % 9 === 0 ? "JURIDICA" : "FISICA",
          status: index % 17 === 0 ? "INATIVO" : "ATIVO",
          icms: index % 9 === 0 ? "CONTRIBUINTE" : "ISENTO",
          name: names[index],
          cpf: String(10000000000 + index * 137).padStart(11, "0"),
          rg: String(3000000 + index * 41),
          birthDate: dateDaysAgo(9000 + index * 90, 12),
          email: `cliente${String(index + 1).padStart(2, "0")}@example.com`,
          mobile: `1199${String(900000 + index * 17).slice(0, 6)}`,
          phoneResidential: `1132${String(100000 + index * 19).slice(0, 6)}`,
          cep: String(10010000 + index * 311).slice(0, 8),
          address: `Rua Oficina ${index + 1}`,
          number: String(100 + index),
          complement: index % 4 === 0 ? "Sala comercial" : null,
          state,
          city,
          neighborhood: `Bairro ${1 + (index % 12)}`,
          notesBasic: index % 6 === 0 ? "Cliente com historico de manutencao recorrente." : null,
          notesContacts: index % 5 === 0 ? "Prefere contato por WhatsApp." : null,
        },
      })
    );
  }

  const vehicles = [];
  for (let index = 0; index < 54; index += 1) {
    const client = clients[index % clients.length];
    const [brand, model, version, fuel] = pick(vehicleModels, index);
    const year = 2014 + (index % 11);

    vehicles.push(
      await prisma.vehicle.create({
        data: {
          clientId: client.id,
          plate: makePlate(index),
          brand,
          model,
          version,
          fuel,
          color: pick(colors, index),
          chassis: `9BWZZZ${String(100000000000 + index * 913)}`,
          renavam: String(50000000000 + index * 257),
          engine: `MTR-${brand.slice(0, 3).toUpperCase()}-${1000 + index}`,
          city: client.city,
          status: index % 23 === 0 ? "INATIVO" : "ATIVO",
          manufactureYear: year,
          modelYear: year + 1,
          notes: index % 7 === 0 ? "Veiculo de uso intenso." : null,
        },
      })
    );
  }

  const statuses = [
    "ABERTA",
    "ABERTA",
    "ABERTA",
    "EM_ANDAMENTO",
    "EM_ANDAMENTO",
    "EM_ANDAMENTO",
    "AGUARDANDO_PECAS",
    "AGUARDANDO_PECAS",
    "IMPEDIDA",
    "FINALIZADA",
    "FINALIZADA",
    "FINALIZADA",
    "FINALIZADA",
    "CANCELADA",
  ];

  const serviceOrders = [];
  for (let index = 0; index < 72; index += 1) {
    const vehicle = vehicles[index % vehicles.length];
    const client = clients.find((item) => item.id === vehicle.clientId);
    const mechanic = mechanics[index % (mechanics.length - 1)];
    const status = statuses[index % statuses.length];
    const lines = buildLineItems(catalogItems, index, 2);
    const entryAt = dateDaysAgo(1 + (index % 45), 8 + (index % 8), (index * 7) % 50);
    const updatedAt =
      status === "FINALIZADA" || status === "CANCELADA"
        ? new Date(entryAt.getTime() + (2 + (index % 30)) * 60 * 60 * 1000)
        : dateDaysAgo(index % 6, 10 + (index % 7), (index * 11) % 55);

    serviceOrders.push(
      await prisma.serviceOrder.create({
        data: {
          clientId: vehicle.clientId,
          vehicleId: vehicle.id,
          mechanicId: mechanic.id,
          responsible: pick(users, index).name || "Admin",
          status,
          location: index % 4 === 0 ? "Elevador 1" : index % 4 === 1 ? "Box diagnostico" : "Patio",
          km: 18000 + index * 1350,
          entryAt,
          estimatedAt:
            status === "FINALIZADA" || status === "CANCELADA"
              ? updatedAt
              : dateDaysAhead(1 + (index % 9), 17),
          notesInternal:
            status === "AGUARDANDO_PECAS"
              ? "Aguardando chegada de peca do fornecedor."
              : status === "IMPEDIDA"
                ? "Aguardando autorizacao do cliente."
                : "Conferencia tecnica registrada no checklist.",
          notesClient:
            index % 3 === 0
              ? "Cliente relatou ruido e solicitou prioridade."
              : "Servico informado no atendimento.",
          subtotal: lines.subtotal,
          discountTotal: lines.discountTotal,
          total: lines.total,
          createdAt: entryAt,
          updatedAt,
          items: {
            create: lines.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              total: item.total,
            })),
          },
        },
      })
    );

    if (status !== "CANCELADA") {
      await prisma.financialAccount.create({
        data: {
          type: "RECEBER",
          status: status === "FINALIZADA" && index % 3 !== 0 ? "PAGA" : "ABERTA",
          description: `OS #${serviceOrders[serviceOrders.length - 1].code} - ${vehicle.plate}`,
          clientId: vehicle.clientId,
          counterparty: client ? client.name : "Cliente oficina",
          category: "Servicos oficina",
          documentNumber: `OS-${String(index + 1).padStart(5, "0")}`,
          dueDate: status === "FINALIZADA" ? dateDaysAgo(index % 18, 12) : dateDaysAhead(3 + (index % 12), 12),
          paymentDate: status === "FINALIZADA" && index % 3 !== 0 ? updatedAt : null,
          amount: lines.total,
          paidAmount: status === "FINALIZADA" && index % 3 !== 0 ? lines.total : null,
          paymentMethod: pick(["PIX", "CARTAO_CREDITO", "CARTAO_DEBITO", "DINHEIRO", "BOLETO"], index),
          notes: "Gerado pelo seed de volume operacional.",
        },
      });
    }
  }

  for (let index = 0; index < 34; index += 1) {
    const vehicle = vehicles[(index * 2 + 3) % vehicles.length];
    const lines = buildLineItems(catalogItems, index + 80, 2);
    const status = pick(["RASCUNHO", "ENVIADO", "APROVADO", "REJEITADO", "CANCELADO"], index);

    await prisma.estimate.create({
      data: {
        clientId: vehicle.clientId,
        vehicleId: vehicle.id,
        responsible: pick(users, index + 2).name || "Admin",
        status,
        type: index % 4 === 0 ? "COMPLETO" : "SIMPLES",
        validUntil: dateDaysAhead(2 + (index % 20), 18),
        notesInternal: "Orcamento gerado para simular pipeline comercial.",
        notesClient: index % 2 === 0 ? "Enviar proposta por email." : "Cliente pediu retorno por WhatsApp.",
        subtotal: lines.subtotal,
        discountTotal: lines.discountTotal,
        total: lines.total,
        createdAt: dateDaysAgo(index % 25, 11),
        updatedAt: dateDaysAgo(index % 12, 15),
        items: {
          create: lines.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            total: item.total,
          })),
        },
      },
    });
  }

  for (let index = 0; index < 65; index += 1) {
    const client = index % 4 === 0 ? null : clients[(index * 5) % clients.length];
    const sector = sectors[index % sectors.length];
    const count = 1 + (index % 3);
    let subtotal = 0;
    let discountTotal = 0;
    const saleItems = [];

    for (let itemIndex = 0; itemIndex < count; itemIndex += 1) {
      const catalogItem = catalogItems[(index + itemIndex * 4) % catalogItems.length];
      const quantity = catalogItem.type === "PRODUTO" ? 1 + ((index + itemIndex) % 4) : 1;
      const unitPrice = Number(catalogItem.unitPrice);
      const lineSubtotal = money(quantity * unitPrice);
      const discount = (index + itemIndex) % 7 === 0 ? money(lineSubtotal * 0.05) : 0;
      const total = money(lineSubtotal - discount);

      subtotal = money(subtotal + lineSubtotal);
      discountTotal = money(discountTotal + discount);

      saleItems.push({
        catalogItemId: catalogItem.id,
        description: catalogItem.name,
        quantity: dec(quantity.toFixed(3)),
        unitPrice: dec(unitPrice.toFixed(2)),
        discount: dec(discount.toFixed(2)),
        total: dec(total.toFixed(2)),
      });
    }

    const total = money(subtotal - discountTotal);
    const createdAt = dateDaysAgo(index % 35, 9 + (index % 8), (index * 13) % 50);

    await prisma.sale.create({
      data: {
        clientId: client?.id ?? null,
        sectorId: sector.id,
        responsible: pick(users, index + 1).name || "Atendimento",
        sectorName: sector.name,
        paymentMethod: pick(["PIX", "CARTAO_CREDITO", "CARTAO_DEBITO", "DINHEIRO", "BOLETO"], index),
        status: index % 21 === 0 ? "CANCELADA" : "CONCLUIDA",
        notes: index % 5 === 0 ? "Venda com retirada no balcao." : null,
        subtotal: dec(subtotal.toFixed(2)),
        discountTotal: dec(discountTotal.toFixed(2)),
        total: dec(total.toFixed(2)),
        createdAt,
        updatedAt: createdAt,
        items: { create: saleItems },
      },
    });
  }

  for (let index = 0; index < 42; index += 1) {
    const amount = money(180 + (index % 12) * 95 + index * 4.5);
    const paid = index % 4 !== 0;
    const dueDate = index % 6 === 0 ? dateDaysAgo(index % 15, 12) : dateDaysAhead(index % 21, 12);

    await prisma.financialAccount.create({
      data: {
        type: "PAGAR",
        status: paid ? "PAGA" : index % 6 === 0 ? "VENCIDA" : "ABERTA",
        description: pick(
          [
            "Fornecedor de pecas",
            "Compra de oleo e filtros",
            "Servicos terceirizados",
            "Ferramentas e consumiveis",
            "Energia e estrutura",
            "Marketing local",
          ],
          index
        ),
        counterparty: pick(
          ["Auto Pecas Central", "Distribuidora Motor Forte", "Pneus Brasil", "Ferramentas Pro", "Oficina Parceira"],
          index
        ),
        category: pick(["Pecas", "Insumos", "Terceiros", "Operacional", "Administrativo"], index),
        documentNumber: `FOR-${String(index + 1).padStart(5, "0")}`,
        dueDate,
        paymentDate: paid ? new Date(dueDate.getTime() + (index % 3) * DAY) : null,
        amount: dec(amount.toFixed(2)),
        paidAmount: paid ? dec(amount.toFixed(2)) : null,
        paymentMethod: pick(["BOLETO", "PIX", "CARTAO_CREDITO"], index),
        notes: "Conta simulada pelo seed de producao.",
      },
    });
  }

  console.log(
    [
      "Seed completed.",
      `${users.length} users`,
      `${mechanics.length} mechanics`,
      `${clients.length} clients`,
      `${vehicles.length} vehicles`,
      `${catalogItems.length} catalog items`,
      `${serviceOrders.length} service orders`,
      "34 estimates",
      "65 sales",
    ].join(" | ")
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
