export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-white">Dashboard</h2>
        <p className="text-muted-foreground">
          Visão geral da operação logística - Aura Core Enterprise
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Placeholder Cards */}
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-6 rounded-xl border border-border bg-card text-card-foreground shadow-sm"
          >
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">KPI Indicador {i}</h3>
            </div>
            <div className="text-2xl font-bold text-white">R$ 45.231,89</div>
            <p className="text-xs text-muted-foreground">+20.1% desde o último mês</p>
          </div>
        ))}
      </div>
    </div>
  );
}



