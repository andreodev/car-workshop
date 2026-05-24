const { PrismaClient, Prisma } = require("@prisma/client");

const prisma = new PrismaClient();

const dec = (value) => new Prisma.Decimal(value);

async function main() {
  await prisma.$transaction([
    prisma.serviceOrderItem.deleteMany(),
    prisma.estimateItem.deleteMany(),
    prisma.saleItem.deleteMany(),
    prisma.serviceOrder.deleteMany(),
    prisma.estimate.deleteMany(),
    prisma.sale.deleteMany(),
    prisma.vehicle.deleteMany(),
    prisma.financialAccount.deleteMany(),
    prisma.catalogItem.deleteMany(),
    prisma.sector.deleteMany(),
    prisma.client.deleteMany(),
    prisma.account.deleteMany(),
    prisma.session.deleteMany(),
    prisma.verificationToken.deleteMany(),
    prisma.user.deleteMany()
  ]);

  const [adminUser, staffUser] = await prisma.$transaction([
    prisma.user.create({
      data: {
        name: "Admin",
        email: "admin@car-workshop.local",
        passwordHash: "seed-admin"
      }
    }),
    prisma.user.create({
      data: {
        name: "Lucas Mecanico",
        email: "lucas@car-workshop.local",
        passwordHash: "seed-staff"
      }
    })
  ]);

  await prisma.account.create({
    data: {
      userId: adminUser.id,
      type: "credentials",
      provider: "credentials",
      providerAccountId: "admin"
    }
  });

  const [clientAna, clientBruno] = await prisma.$transaction([
    prisma.client.create({
      data: {
        name: "Ana Lima",
        cpf: "11111111111",
        email: "ana.lima@example.com",
        mobile: "11999990001",
        cep: "01001000",
        address: "Rua Alfa",
        number: "100",
        city: "Sao Paulo",
        state: "SP"
      }
    }),
    prisma.client.create({
      data: {
        name: "Bruno Souza",
        cpf: "22222222222",
        email: "bruno.souza@example.com",
        mobile: "11999990002",
        cep: "20040002",
        address: "Avenida Beta",
        number: "200",
        city: "Rio de Janeiro",
        state: "RJ"
      }
    })
  ]);

  const [vehicleAna, vehicleBruno] = await prisma.$transaction([
    prisma.vehicle.create({
      data: {
        clientId: clientAna.id,
        plate: "ABC1D23",
        brand: "Volkswagen",
        model: "Golf",
        fuel: "GASOLINA",
        color: "Branco",
        manufactureYear: 2020,
        modelYear: 2021
      }
    }),
    prisma.vehicle.create({
      data: {
        clientId: clientBruno.id,
        plate: "XYZ9Z88",
        brand: "Toyota",
        model: "Corolla",
        fuel: "FLEX",
        color: "Prata",
        manufactureYear: 2019,
        modelYear: 2020
      }
    })
  ]);

  const [oilChange, brakePads, alignment] = await prisma.$transaction([
    prisma.catalogItem.create({
      data: {
        type: "SERVICO",
        name: "Troca de oleo",
        unitPrice: dec("180.00")
      }
    }),
    prisma.catalogItem.create({
      data: {
        type: "PRODUTO",
        name: "Pastilha de freio",
        unitPrice: dec("250.00"),
        sku: "FREIO-001"
      }
    }),
    prisma.catalogItem.create({
      data: {
        type: "SERVICO",
        name: "Alinhamento",
        unitPrice: dec("120.00")
      }
    })
  ]);

  const sector = await prisma.sector.create({
    data: {
      name: "Balcao",
      notes: "Vendas presenciais"
    }
  });

  const serviceOrder = await prisma.serviceOrder.create({
    data: {
      clientId: clientAna.id,
      vehicleId: vehicleAna.id,
      responsible: "Lucas Mecanico",
      location: "Oficina",
      km: 45500,
      entryAt: new Date(),
      notesInternal: "Checar vazamento",
      notesClient: "Verificar barulho",
      subtotal: dec("430.00"),
      discountTotal: dec("30.00"),
      total: dec("400.00"),
      items: {
        create: [
          {
            description: "Troca de oleo",
            quantity: 1,
            unitPrice: dec("180.00"),
            discount: dec("0.00"),
            total: dec("180.00")
          },
          {
            description: "Pastilha de freio",
            quantity: 1,
            unitPrice: dec("250.00"),
            discount: dec("30.00"),
            total: dec("220.00")
          }
        ]
      }
    }
  });

  await prisma.estimate.create({
    data: {
      clientId: clientBruno.id,
      vehicleId: vehicleBruno.id,
      responsible: "Admin",
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notesInternal: "Orcamento rapido",
      notesClient: "Enviar por email",
      subtotal: dec("300.00"),
      discountTotal: dec("0.00"),
      total: dec("300.00"),
      items: {
        create: [
          {
            description: "Alinhamento",
            quantity: 1,
            unitPrice: dec("120.00"),
            discount: dec("0.00"),
            total: dec("120.00")
          },
          {
            description: "Troca de oleo",
            quantity: 1,
            unitPrice: dec("180.00"),
            discount: dec("0.00"),
            total: dec("180.00")
          }
        ]
      }
    }
  });

  await prisma.sale.create({
    data: {
      clientId: clientAna.id,
      sectorId: sector.id,
      responsible: "Admin",
      sectorName: sector.name,
      paymentMethod: "PIX",
      notes: "Venda rapida",
      subtotal: dec("300.00"),
      discountTotal: dec("10.00"),
      total: dec("290.00"),
      items: {
        create: [
          {
            catalogItemId: oilChange.id,
            description: oilChange.name,
            quantity: dec("1.000"),
            unitPrice: dec("180.00"),
            discount: dec("0.00"),
            total: dec("180.00")
          },
          {
            catalogItemId: brakePads.id,
            description: brakePads.name,
            quantity: dec("1.000"),
            unitPrice: dec("250.00"),
            discount: dec("10.00"),
            total: dec("240.00")
          }
        ]
      }
    }
  });

  await prisma.financialAccount.createMany({
    data: [
      {
        type: "RECEBER",
        status: "ABERTA",
        description: "Servico ordem #" + serviceOrder.code,
        clientId: clientAna.id,
        counterparty: clientAna.name,
        category: "Servicos",
        documentNumber: "NF-0001",
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        amount: dec("400.00"),
        paymentMethod: "PIX"
      },
      {
        type: "PAGAR",
        status: "PAGA",
        description: "Compra de pecas",
        counterparty: "Fornecedor A",
        category: "Pecas",
        documentNumber: "F-100",
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        paymentDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        amount: dec("520.00"),
        paidAmount: dec("520.00"),
        paymentMethod: "BOLETO"
      }
    ]
  });

  console.log("Seed completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
