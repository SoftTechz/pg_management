import { useEffect, useRef, useState } from "react";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { loginWithPin } from "@/services/auth_service";

export default function Login() {
  const [pin, setPin] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputsRef = useRef([]);
  const navigate = useNavigate();

  useEffect(() => inputsRef.current[0]?.focus(), []);

  async function verifyPin(enteredPin) {
    if (isSubmitting || enteredPin.length !== 4) return;
    setIsSubmitting(true);
    try {
      await loginWithPin(enteredPin);
      navigate("/dashboard");
    } catch (caught) {
      setError(caught.message || "Invalid PIN");
      setPin(["", "", "", ""]);
      inputsRef.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleChange(value, index) {
    if (isSubmitting || !/^\d?$/.test(value)) return;
    const nextPin = [...pin];
    nextPin[index] = value;
    setPin(nextPin);
    setError("");
    if (value && index < 3) inputsRef.current[index + 1]?.focus();
    if (!value || index !== 3) return;

    await verifyPin(nextPin.join(""));
    <button
      type="button"
      disabled={isSubmitting || pin.some((digit) => !digit)}
      onClick={() => verifyPin(pin.join(""))}
      className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3.5 font-semibold text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isSubmitting ? "Verifying..." : "Enter workspace"}
      <ArrowRight size={18} />
    </button>;
  }

  function handleKeyDown(event, index) {
    if (event.key !== "Backspace") return;
    event.preventDefault();
    if (pin[index]) {
      const nextPin = [...pin];
      nextPin[index] = "";
      setPin(nextPin);
    } else if (index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  return (
    <main className="min-h-screen bg-[#eef4f1] p-3 sm:p-6 lg:p-10 flex items-center justify-center">
      <div className="w-full max-w-6xl min-h-[620px] overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-emerald-950/10 grid lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative min-h-[260px] lg:min-h-full overflow-hidden bg-emerald-950">
          <img
            src="/user_management.png"
            alt="Comfortable PG living space"
            className="absolute inset-0 h-full w-full object-cover opacity-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/30 to-transparent" />
          <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-10 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                <img
                  src="/image.png"
                  alt="PG Management"
                  className="h-9 w-9 rounded-xl object-cover"
                />
              </div>
              <span className="font-semibold tracking-wide">PG MANAGEMENT</span>
            </div>
            <div className="max-w-md">
              <p className="mb-3 text-xs font-bold uppercase tracking-[.25em] text-emerald-200">
                A calmer way to manage
              </p>
              <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
                Every room, every resident, in one place.
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-emerald-50/80">
                Keep your property moving smoothly with a clear view of rooms,
                residents, and monthly operations.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10 lg:p-14">
          <div className="w-full max-w-sm">
            <div className="mb-10">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <LockKeyhole size={26} />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-950">
                Welcome back
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Enter your 4-digit owner PIN to continue to your workspace.
              </p>
            </div>
            <div className="flex gap-2.5 sm:gap-3" aria-label="Owner PIN">
              {pin.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputsRef.current[index] = element;
                  }}
                  type="password"
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength="1"
                  value={digit}
                  disabled={isSubmitting}
                  onChange={(event) => handleChange(event.target.value, index)}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                  className="h-14 min-w-0 flex-1 rounded-xl border-2 border-slate-200 bg-slate-50 text-center text-2xl font-semibold text-slate-900 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                />
              ))}
            </div>
            {error && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {error}
              </p>
            )}
            <button
              type="button"
              disabled={isSubmitting || pin.some((digit) => !digit)}
              onClick={() =>
                inputsRef.current[3]?.dispatchEvent(
                  new Event("change", { bubbles: true }),
                )
              }
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3.5 font-semibold text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Verifying..." : "Enter workspace"}
              <ArrowRight size={18} />
            </button>
            <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck size={16} className="text-emerald-600" />
              Your access is protected by PIN verification.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
