import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Compass } from "lucide-react";
import { useAuth } from "../lib/authContext";
import { useTheme } from "../lib/themeContext";
import { Card, Button, Input } from "../components/ui";

export default function Login() {
  const { login, bootstrap, needsBootstrap } = useAuth();
  const { settings } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (needsBootstrap) {
        await bootstrap(email, password, name);
      } else {
        await login(email, password);
      }
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--nt-primary-light)] to-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm p-7">
        <div className="flex flex-col items-center text-center mb-5">
          <span
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-3"
            style={{ backgroundColor: "var(--nt-primary)" }}
          >
            <Compass size={24} strokeWidth={2} />
          </span>
          <h1 className="text-xl font-bold text-slate-800">{settings?.companyName || "November Trip"}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {needsBootstrap ? "ตั้งค่าบัญชีผู้ดูแลระบบครั้งแรก" : "เข้าสู่ระบบ"}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {needsBootstrap && (
            <Input label="ชื่อ" required value={name} onChange={(e) => setName(e.target.value)} />
          )}
          <Input label="อีเมล" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            label="รหัสผ่าน"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <Button type="submit" className="w-full" disabled={busy}>
            {needsBootstrap ? "สร้างบัญชีผู้ดูแลระบบ" : "เข้าสู่ระบบ"}
          </Button>
        </form>

        {needsBootstrap && (
          <p className="text-xs text-slate-400 mt-4 text-center">
            บัญชีนี้จะเป็น Admin คนแรก และสามารถเพิ่มผู้ใช้อื่นได้ภายหลังจากหน้า Settings
          </p>
        )}
      </Card>
    </div>
  );
}
