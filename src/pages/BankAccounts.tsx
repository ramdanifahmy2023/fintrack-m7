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

// Definisikan tipe data untuk Rekening Bank
interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  balance: number;
}

export default function BankAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [formData, setFormData] = useState({
    bank_name: "",
    account_number: "",
    account_holder_name: "",
    balance: "",
  });

  useEffect(() => {
    if (user) {
      fetchBankAccounts();
    }
  }, [user]);

  const fetchBankAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("user_id", user!.id)
        .order("bank_name", { ascending: true });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
      toast.error("Gagal memuat data rekening bank");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const accountData = {
        user_id: user!.id,
        bank_name: formData.bank_name,
        account_number: formData.account_number,
        account_holder_name: formData.account_holder_name,
        balance: parseFloat(formData.balance),
      };

      if (editingAccount) {
        const { error } = await supabase
          .from("bank_accounts")
          .update(accountData)
          .eq("id", editingAccount.id);

        if (error) throw error;
        toast.success("Rekening bank berhasil diperbarui");
      } else {
        const { error } = await supabase.from("bank_accounts").insert(accountData);
        if (error) throw error;
        toast.success("Rekening bank berhasil ditambahkan");
      }

      setDialogOpen(false);
      fetchBankAccounts();
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan rekening bank");
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus rekening ini?")) return;

    try {
      const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
      if (error) throw error;
      toast.success("Rekening bank berhasil dihapus");
      fetchBankAccounts();
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus rekening bank");
    }
  };

  const openEditDialog = (account: BankAccount) => {
    setEditingAccount(account);
    setFormData({
      bank_name: account.bank_name,
      account_number: account.account_number,
      account_holder_name: account.account_holder_name,
      balance: account.balance.toString(),
    });
    setDialogOpen(true);
  };
  
  const openNewDialog = () => {
    setEditingAccount(null);
    setFormData({
      bank_name: "",
      account_number: "",
      account_holder_name: "",
      balance: "",
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
          <h1 className="text-3xl font-bold tracking-tight">Rekening Bank</h1>
          <p className="text-muted-foreground">
            Kelola semua rekening bank Anda di satu tempat.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Rekening
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAccount ? "Edit Rekening Bank" : "Tambah Rekening Baru"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Nama Bank</Label>
                <Input id="bank_name" value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} placeholder="Contoh: Bank BCA" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_holder_name">Nama Pemilik Rekening</Label>
                <Input id="account_holder_name" value={formData.account_holder_name} onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })} required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="account_number">Nomor Rekening</Label>
                <Input id="account_number" type="text" value={formData.account_number} onChange={(e) => setFormData({ ...formData, account_number: e.target.value })} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="balance">Saldo Saat Ini</Label>
                <Input id="balance" type="number" value={formData.balance} onChange={(e) => setFormData({ ...formData, balance: e.target.value })} required />
              </div>

              <Button type="submit" className="w-full">
                {editingAccount ? "Perbarui" : "Simpan"} Rekening
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Rekening Bank</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Bank</TableHead>
                <TableHead>Pemilik</TableHead>
                <TableHead>Nomor Rekening</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length > 0 ? accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.bank_name}</TableCell>
                  <TableCell>{account.account_holder_name}</TableCell>
                  <TableCell>{account.account_number}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(account.balance)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(account)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(account.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    Belum ada rekening bank. Mulai tambahkan rekening Anda.
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