import {
  FaEnvelope,
  FaPhone,
  FaUser,
} from "react-icons/fa";

type ReservationContactProps = {
  fullName: string;
  email: string;
  phone: string;
  onFullNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
};

export default function ReservationContact({
  fullName,
  email,
  phone,
  onFullNameChange,
  onEmailChange,
  onPhoneChange,
}: ReservationContactProps) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-slate-900 p-7">
      <h2 className="text-2xl font-black">İletişim bilgileri</h2>

      <p className="mt-3 text-slate-400">
        Rezervasyon onayı bu bilgilere gönderilecek.
      </p>

      <div className="mt-7 grid gap-5 md:grid-cols-2">
        <label className="md:col-span-2">
          <span className="text-sm font-black">Ad soyad</span>

          <div className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4">
            <FaUser className="shrink-0 text-orange-500" />

            <input
              type="text"
              required
              value={fullName}
              onChange={(event) =>
                onFullNameChange(event.target.value)
              }
              placeholder="Adınız ve soyadınız"
              autoComplete="name"
              className="w-full bg-transparent text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400"
            />
          </div>
        </label>

        <label>
          <span className="text-sm font-black">E-posta</span>

          <div className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4">
            <FaEnvelope className="shrink-0 text-orange-500" />

            <input
              type="email"
              required
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="ornek@email.com"
              autoComplete="email"
              className="w-full bg-transparent text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400"
            />
          </div>
        </label>

        <label>
          <span className="text-sm font-black">Telefon</span>

          <div className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4">
            <FaPhone className="shrink-0 text-orange-500" />

            <input
              type="tel"
              required
              value={phone}
              onChange={(event) => onPhoneChange(event.target.value)}
              placeholder="05xx xxx xx xx"
              autoComplete="tel"
              className="w-full bg-transparent text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400"
            />
          </div>
        </label>
      </div>
    </section>
  );
}
