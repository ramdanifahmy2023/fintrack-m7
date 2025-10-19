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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

// Definisikan tipe data untuk transaksi dan kategori
interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  type: "income" | "expense";
  category_id: string;
  categories: {
    name: string;
    icon: string | null;
    color: string | null;
  };
}

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    transaction_date: "",
    type: "expense" as "income" | "expense",
    category_id: "",
  });

  useEffect(() => {
    if (user) {
      fetchTransactions();
      fetchCategories();
    }
  }, [user]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, categories(name, icon, color)")
        .eq("user_id", user!.id)
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      setTransactions(data as Transaction[]);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Gagal memuat transaksi");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, type")
        .eq("user_id", user!.id);

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleTypeChange = (type: "income" | "expense") => {
    setFormData({ ...formData, type, category_id: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const transactionData = {
        user_id: user!.id,
        description: formData.description,
        amount: parseFloat(formData.amount),
        transaction_date: formData.transaction_date,
        type: formData.type,
        category_id: formData.category_id,
      };

      if (editingTransaction) {
        const { error } = await supabase
          .from("transactions")
          .update(transactionData)
          .eq("id", editingTransaction.id);

        if (error) throw error;
        toast.success("Transaksi berhasil diperbarui");
      } else {
        const { error } = await supabase
          .from("transactions")
          .insert(transactionData);

        if (error) throw error;
        toast.success("Transaksi berhasil dibuat");
      }

      setDialogOpen(false);
      setEditingTransaction(null);
      setFormData({
        description: "",
        amount: "",
        transaction_date: "",
        type: "expense",
        category_id: "",
      });
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan transaksi");
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) return;

    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
      toast.success("Transaksi berhasil dihapus");
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus transaksi");
    }
  };

  const openEditDialog = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      description: transaction.description,
      amount: transaction.amount.toString(),
      transaction_date: transaction.transaction_date,
      type: transaction.type,
      category_id: transaction.category_id,
    });
    setDialogOpen(true);
  };


  const filteredCategories = categories.filter((c) => c.type === formData.type);
  
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
          <h1 className="text-3xl font-bold tracking-tight">Transaksi</h1>
          <p className="text-muted-foreground">
            Catat dan kelola semua pemasukan dan pengeluaran Anda.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingTransaction(null);
              setFormData({
                description: "",
                amount: "",
                transaction_date: new Date().toISOString().substring(0, 10),
                type: "expense",
                category_id: "",
              });
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Transaksi
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTransaction ? "Edit Transaksi" : "Tambah Transaksi Baru"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipe Transaksi</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="expense"
                      checked={formData.type === "expense"}
                      onChange={() => handleTypeChange("expense")}
                    />
                    Pengeluaran
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="income"
                      checked={formData.type === "income"}
                      onChange={() => handleTypeChange("income")}
                    />
                    Pemasukan
                  </label>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Jumlah</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="transaction_date">Tanggal</Label>
                <Input
                  id="transaction_date"
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category_id">Kategori</Label>
                 <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full">
                {editingTransaction ? "Perbarui" : "Buat"} Transaksi
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">{transaction.description}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       <span style={{ color: transaction.categories?.color || 'inherit' }}>
                         {transaction.categories?.icon}
                       </span>
                      {transaction.categories?.name || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>{format(new Date(transaction.transaction_date), "d MMMM yyyy")}</TableCell>
                  <TableCell className={`text-right font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(transaction)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(transaction.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}