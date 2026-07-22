import { useEffect, useState, Fragment } from "react";
import api from "../../lib/api";
import { SectionCard, Button, Input, Select, Badge } from "../../components/ui";
import { Users } from "lucide-react";
import { useUndo } from "../../lib/undoContext";

const emptyUser = { email: "", password: "", name: "", role: "STAFF" };
const emptyEditForm = { name: "", role: "STAFF", password: "" };

export default function UsersTab() {
  const { scheduleAction } = useUndo();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyUser);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [editError, setEditError] = useState("");
  const [editBusy, setEditBusy] = useState(false);

  async function load() {
    try {
      const { data } = await api.get("/auth/users");
      setUsers(data);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addUser(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/users", form);
      setForm(emptyUser);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function removeUser(id) {
    const user = users.find((u) => u.id === id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    scheduleAction(`ลบผู้ใช้ "${user?.name || user?.email}" แล้ว`, {
      onConfirm: () => api.delete(`/auth/users/${id}`),
      onUndo: () => load(),
    });
  }

  function openEdit(user) {
    setEditingId(user.id);
    setEditForm({ name: user.name, role: user.role, password: "" });
    setEditError("");
  }

  function closeEdit() {
    setEditingId(null);
    setEditForm(emptyEditForm);
    setEditError("");
  }

  async function saveEdit(e) {
    e.preventDefault();
    setEditBusy(true);
    setEditError("");
    try {
      // Empty password field means "keep the current password" - only send
      // it when the admin actually typed a new one.
      const payload = { name: editForm.name, role: editForm.role };
      if (editForm.password) payload.password = editForm.password;
      await api.put(`/auth/users/${editingId}`, payload);
      closeEdit();
      await load();
    } catch (e) {
      setEditError(e.message);
    } finally {
      setEditBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <SectionCard icon={Users} title="ผู้ใช้งานระบบ" subtitle="จัดการบัญชีที่เข้าถึง November Trip">
        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-2">ชื่อ</th>
                  <th className="text-left px-4 py-2">อีเมล</th>
                  <th className="text-left px-4 py-2">สิทธิ์</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <Fragment key={u.id}>
                    <tr className="border-t border-slate-100">
                      <td className="px-4 py-2">{u.name}</td>
                      <td className="px-4 py-2">{u.email}</td>
                      <td className="px-4 py-2">
                        <Badge tone={u.role === "ADMIN" ? "blue" : "slate"}>{u.role}</Badge>
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button onClick={() => (editingId === u.id ? closeEdit() : openEdit(u))} className="text-blue-600 text-xs mr-3">
                          {editingId === u.id ? "ปิด" : "แก้ไข/เปลี่ยนรหัสผ่าน"}
                        </button>
                        <Button variant="danger" onClick={() => removeUser(u.id)}>
                          ลบ
                        </Button>
                      </td>
                    </tr>
                    {editingId === u.id && (
                      <tr className="bg-blue-50/40 border-t border-blue-100">
                        <td colSpan={4} className="px-4 py-3">
                          <form onSubmit={saveEdit} className="space-y-2 max-w-sm">
                            {editError && <div className="text-red-600 text-xs">{editError}</div>}
                            <Input label="ชื่อ" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                            <Select label="สิทธิ์" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                              <option value="STAFF">Staff</option>
                              <option value="ADMIN">Admin</option>
                            </Select>
                            <Input
                              label="รหัสผ่านใหม่ (เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)"
                              type="password"
                              minLength={8}
                              placeholder="อย่างน้อย 8 ตัวอักษร"
                              value={editForm.password}
                              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                            />
                            <div className="flex justify-end gap-2 pt-1">
                              <Button type="button" variant="secondary" onClick={closeEdit}>
                                ยกเลิก
                              </Button>
                              <Button type="submit" disabled={editBusy}>
                                บันทึก
                              </Button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <form onSubmit={addUser} className="space-y-3">
            <Input label="ชื่อ" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="อีเมล" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input
              label="รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <Select label="สิทธิ์" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
            </Select>
            <Button type="submit" disabled={busy}>
              เพิ่มผู้ใช้
            </Button>
          </form>
        </div>
      </SectionCard>
    </div>
  );
}
