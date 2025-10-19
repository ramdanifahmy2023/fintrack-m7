import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

// Definisikan tipe data untuk Aset
interface Asset {
  id: string;
  name: string;
  type: string;
  acquired_at: string; // Ganti ini
  initial_value: number;
  current_value: number;
}

export default function Assets() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    acquired_at: "", // Ganti ini
    initial_value: "",
    current_value: "",
  });

  useEffect(() => {
    if (user) {
      fetchAssets();
    }
  }, [user]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .eq("user_id", user!.id)
        .order("acquired_at", { ascending: false }); // Ganti ini

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error("Error fetching assets:", error);
      toast.error("Gagal memuat data aset");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const assetData = {
        user_id: user!.id,
        name: formData.name,
        type: formData.type,
        acquired_at: formData.acquired_at, // Ganti ini
        initial_value: parseFloat(formData.initial_value),
        current_value: parseFloat(formData.current_value),
      };

      if (editingAsset) {
        const { error } = await supabase
          .from("assets")
          .update(assetData)
          .eq("id", editingAsset.id);

        if (error) throw error;
        toast.success("Aset berhasil diperbarui");
      } else {
        const { error } = await supabase.from("assets").insert(assetData);

        if (error) throw error;
        toast.success("Aset berhasil ditambahkan");
      }

      setDialogOpen(false);
      fetchAssets();
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan aset");
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus aset ini?")) return;

    try {
      const { error } = await supabase.from("assets").delete().eq("id", id);
      if (error) throw error;
      toast.success("Aset berhasil dihapus");
      fetchAssets();
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus aset");
    }
  };

  const openEditDialog = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      type: asset.type,
      acquired_at: asset.acquired_at, // Ganti ini
      initial_value: asset.initial_value.toString(),
      current_value: asset.current_value.toString(),
    });
    setDialogOpen(true);
  };
  
  const openNewDialog = () => {
    setEditingAsset(null);
    setFormData({
      name: "",
      type: "",
      acquired_at: new Date().toISOString().substring(0, 10), // Ganti ini
      initial_value: "",
      current_value: "",
    });
    setDialogOpen(true);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aset</h1>
          <p className="text-muted-foreground">
            Kelola aset berharga yang Anda miliki.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Aset
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAsset ? "Edit Aset" : "Tambah Aset Baru"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Aset</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipe Aset</Label>
                <Input id="type" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} placeholder="Contoh: Properti, Kendaraan, Saham" required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="acquired_at">Tanggal Akuisisi</Label> {/* Ganti ini */}
                <Input id="acquired_at" type="date" value={formData.acquired_at} onChange={(e) => setFormData({ ...formData, acquired_at: e.target.value })} required /> {/* Ganti ini */}
              </div>

              <div className="space-y-2">
                <Label htmlFor="initial_value">Nilai Awal</Label>
                <Input id="initial_value" type="number" value={formData.initial_value} onChange={(e) => setFormData({ ...formData, initial_value: e.target.value })} required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="current_value">Nilai Saat Ini</Label>
                <Input id="current_value" type="number" value={formData.current_value} onChange={(e) => setFormData({ ...formData, current_value: e.target.value })} required />
              </div>

              <Button type="submit" className="w-full">
                {editingAsset ? "Perbarui" : "Simpan"} Aset
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Aset</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Aset</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Tanggal Akuisisi</TableHead>
                <TableHead className="text-right">Nilai Awal</TableHead>
                <TableHead className="text-right">Nilai Saat Ini</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.length > 0 ? assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.name}</TableCell>
                  <TableCell>{asset.type}</TableCell>
                  <TableCell>{format(new Date(asset.acquired_at), "d MMMM yyyy")}</TableCell> {/* Ganti ini */}
                  <TableCell className="text-right">{formatCurrency(asset.initial_value)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(asset.current_value)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(asset)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(asset.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    Belum ada aset. Mulai tambahkan aset Anda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}