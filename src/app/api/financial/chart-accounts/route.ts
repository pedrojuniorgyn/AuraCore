import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chartOfAccounts } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

/**
 * GET /api/financial/chart-accounts
 * Lista todas as contas do plano de contas (com hierarquia)
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;

    // Buscar todas as contas
    const allAccounts = await db
      .select()
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.organizationId, organizationId),
          isNull(chartOfAccounts.deletedAt)
        )
      )
      .orderBy(chartOfAccounts.code);

    // Construir árvore hierárquica
    const buildTree = (parentId: number | null = null): any[] => {
      return allAccounts
        .filter((acc) => acc.parentId === parentId)
        .map((acc) => ({
          ...acc,
          children: buildTree(acc.id),
        }));
    };

    const tree = buildTree(null);

    return NextResponse.json({
      success: true,
      data: {
        flat: allAccounts, // Lista plana (para selects)
        tree, // Árvore (para visualização)
      },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar plano de contas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar plano de contas" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/financial/chart-accounts
 * Cria uma nova conta
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;
    const createdBy = session.user.email || "system";

    const body = await req.json();
    const {
      code,
      name,
      type,
      category,
      parentId,
      acceptsCostCenter,
      requiresCostCenter,
    } = body;

    // Validações
    if (!code || !name || !type) {
      return NextResponse.json(
        { error: "Código, nome e tipo são obrigatórios" },
        { status: 400 }
      );
    }

    const validTypes = ["REVENUE", "EXPENSE", "ASSET", "LIABILITY", "EQUITY"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Tipo inválido. Use: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const validCategories = [
      "OPERATIONAL_OWN_FLEET",
      "OPERATIONAL_THIRD_PARTY",
      "ADMINISTRATIVE",
      "FINANCIAL",
      "TAX",
    ];
    if (category && !validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Categoria inválida. Use: ${validCategories.join(", ")}` },
        { status: 400 }
      );
    }

    // Verificar duplicação de código
    const existing = await db
      .select()
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.organizationId, organizationId),
          eq(chartOfAccounts.code, code),
          isNull(chartOfAccounts.deletedAt)
        )
      );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Código já existe" },
        { status: 400 }
      );
    }

    // Calcular nível baseado no pai
    let level = 0;
    if (parentId) {
      const parent = await db
        .select()
        .from(chartOfAccounts)
        .where(eq(chartOfAccounts.id, parentId));

      if (parent.length === 0) {
        return NextResponse.json(
          { error: "Conta pai não encontrada" },
          { status: 404 }
        );
      }

      level = (parent[0].level || 0) + 1;
    }

    // Determinar se é analítica baseado em se tem pai e não terá filhos
    const isAnalytical = level > 0; // Simplificado: contas de nível 1+ são analíticas por padrão

    // Criar
    const [newAccount] = await db
      .insert(chartOfAccounts)
      .values({
        organizationId,
        code,
        name,
        type,
        category: category || null,
        parentId: parentId || null,
        level,
        isAnalytical,
        acceptsCostCenter: acceptsCostCenter || false,
        requiresCostCenter: requiresCostCenter || false,
        status: "ACTIVE",
        createdBy,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "Conta criada com sucesso!",
      data: newAccount,
    });
  } catch (error) {
    console.error("❌ Erro ao criar conta:", error);
    return NextResponse.json(
      { error: "Erro ao criar conta" },
      { status: 500 }
    );
  }
}












