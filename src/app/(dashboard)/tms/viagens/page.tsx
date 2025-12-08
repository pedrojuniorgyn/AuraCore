"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText } from "@/components/ui/magic-components";
import { GridPattern } from "@/components/ui/animated-background";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Plus, Truck, MapPin, CheckCircle, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";

interface Trip {
  id: number;
  tripNumber: string;
  vehicleId: number;
  driverId: number;
  driverType: string;
  status: string;
  scheduledStart: string;
  ciotNumber?: string;
  requiresCiot: string;
}

interface Vehicle {
  id: number;
  plate: string;
  model: string;
}

interface Driver {
  id: number;
  name: string;
}

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    vehicleId: "",
    driverId: "",
    driverType: "OWN",
    scheduledStart: new Date().toISOString().split("T")[0],
    ciotNumber: "",
    ciotValue: "",
  });

  const fetchData = async () => {
    try {
      const [tripsRes, vehiclesRes, driversRes] = await Promise.all([
        fetch("/api/tms/trips"),
        fetch("/api/fleet/vehicles"),
        fetch("/api/fleet/drivers"),
      ]);

      const tripsData = await tripsRes.json();
      const vehiclesData = await vehiclesRes.json();
      const driversData = await driversRes.json();

      if (tripsData.success) setTrips(tripsData.data);
      if (vehiclesData.success) setVehicles(vehiclesData.data);
      if (driversData.success) setDrivers(driversData.data);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/tms/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: parseInt(formData.vehicleId),
          driverId: parseInt(formData.driverId),
          driverType: formData.driverType,
          scheduledStart: formData.scheduledStart,
          ciotNumber: formData.ciotNumber || null,
          ciotValue: formData.ciotValue ? parseFloat(formData.ciotValue) : null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Viagem criada!");
        setIsDialogOpen(false);
        fetchData();
      } else {
        toast.error(result.error || "Erro ao criar");
      }
    } catch (error) {
      console.error("Erro ao criar viagem:", error);
      toast.error("Erro ao criar viagem");
    }
  };

  const tripsByStatus = {
    DRAFT: trips.filter((t) => t.status === "DRAFT"),
    ALLOCATED: trips.filter((t) => t.status === "ALLOCATED"),
    IN_TRANSIT: trips.filter((t) => t.status === "IN_TRANSIT"),
    COMPLETED: trips.filter((t) => t.status === "COMPLETED"),
  };

  const StatusColumn = ({ title, status, trips, icon: Icon, color }: any) => (
    <div className="flex-1 min-w-[300px]">
      <Card>
        <CardHeader className={`${color} text-white`}>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-5 w-5" />
            {title} ({trips.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3 min-h-[500px]">
          {trips.map((trip: Trip) => {
            const vehicle = vehicles.find((v) => v.id === trip.vehicleId);
            const driver = drivers.find((d) => d.id === trip.driverId);

            return (
              <Card key={trip.id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{trip.tripNumber}</span>
                    {trip.requiresCiot === "true" && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                        CIOT
                      </span>
                    )}
                  </div>
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Truck className="h-3 w-3" />
                      {vehicle?.plate || "N/A"} - {vehicle?.model || ""}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      {driver?.name || "N/A"}
                    </div>
                    {trip.scheduledStart && (
                      <div className="text-xs">
                        Saída: {new Date(trip.scheduledStart).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <PageTransition>
      <GridPattern />

      <FadeIn delay={0.1}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <GradientText className="text-3xl font-bold mb-2">
              Gestão de Viagens (TMS)
            </GradientText>
            <p className="text-sm text-muted-foreground">
              Kanban Visual - Controle Total de Operações
            </p>
          </div>
          <ShimmerButton onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Viagem
          </ShimmerButton>
        </div>
      </FadeIn>

      {/* KPIs */}
      <FadeIn delay={0.15}>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Rascunho</p>
                <p className="text-3xl font-bold text-gray-600">{tripsByStatus.DRAFT.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Alocadas</p>
                <p className="text-3xl font-bold text-blue-600">{tripsByStatus.ALLOCATED.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Em Trânsito</p>
                <p className="text-3xl font-bold text-orange-600">{tripsByStatus.IN_TRANSIT.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Concluídas</p>
                <p className="text-3xl font-bold text-green-600">{tripsByStatus.COMPLETED.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </FadeIn>

      {/* Kanban Board */}
      <FadeIn delay={0.2}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          <StatusColumn
            title="Rascunho"
            status="DRAFT"
            trips={tripsByStatus.DRAFT}
            icon={Clock}
            color="bg-gray-500"
          />
          <StatusColumn
            title="Alocadas"
            status="ALLOCATED"
            trips={tripsByStatus.ALLOCATED}
            icon={Truck}
            color="bg-blue-500"
          />
          <StatusColumn
            title="Em Trânsito"
            status="IN_TRANSIT"
            trips={tripsByStatus.IN_TRANSIT}
            icon={MapPin}
            color="bg-orange-500"
          />
          <StatusColumn
            title="Concluídas"
            status="COMPLETED"
            trips={tripsByStatus.COMPLETED}
            icon={CheckCircle}
            color="bg-green-500"
          />
        </div>
      </FadeIn>

      {/* Dialog Criar Viagem */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Viagem</DialogTitle>
            <DialogDescription>
              Aloque veículo e motorista para iniciar a operação
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Veículo *</Label>
              <Select
                value={formData.vehicleId}
                onValueChange={(value) =>
                  setFormData({ ...formData, vehicleId: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o veículo" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id.toString()}>
                      {v.plate} - {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Motorista *</Label>
              <Select
                value={formData.driverId}
                onValueChange={(value) =>
                  setFormData({ ...formData, driverId: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motorista" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de Motorista</Label>
              <Select
                value={formData.driverType}
                onValueChange={(value) =>
                  setFormData({ ...formData, driverType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWN">Próprio</SelectItem>
                  <SelectItem value="THIRD_PARTY">Terceiro</SelectItem>
                  <SelectItem value="AGGREGATE">Agregado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.driverType === "THIRD_PARTY" || formData.driverType === "AGGREGATE") && (
              <>
                <div>
                  <Label>CIOT (Obrigatório) *</Label>
                  <Input
                    value={formData.ciotNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, ciotNumber: e.target.value })
                    }
                    placeholder="000000000000000"
                    maxLength={15}
                    required
                  />
                </div>
                <div>
                  <Label>Valor CIOT (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.ciotValue}
                    onChange={(e) =>
                      setFormData({ ...formData, ciotValue: e.target.value })
                    }
                  />
                </div>
              </>
            )}

            <div>
              <Label>Data de Saída</Label>
              <Input
                type="date"
                value={formData.scheduledStart}
                onChange={(e) =>
                  setFormData({ ...formData, scheduledStart: e.target.value })
                }
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Criar Viagem</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}

