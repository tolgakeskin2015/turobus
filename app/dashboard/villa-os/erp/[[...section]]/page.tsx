"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CurrentMembership, getCurrentMembership } from "@/lib/current-user";

type Summary = { sales:number; paid:number; balance:number; expenses:number; net:number; cash_in:number; cash_out:number; cash_net:number; reservations:number; open_cleaning:number; open_maintenance:number; pending_invoices:number };
type Reservation = { id:string; reservation_code:string; guest_name:string; check_in:string; check_out:string; grand_total:number; paid_total:number; balance:number; currency:string; status:string; sales_channel:string };
type Cleaning = { id:string; task_date:string; task_type:string; status:string; fee:number; note:string|null; villa_id:string };
type Maintenance = { id:string; title:string; priority:string; status:string; estimated_cost:number; actual_cost:number; due_at:string|null; villa_id:string; description:string|null };
type Expense = { id:string; category:string; description:string; amount:number; currency:string; expense_date:string; payment_status:string; supplier_name:string|null; villa_id:string|null };
type CashMovement = { id:string; movement_type:string; category:string; amount:number; currency:string; occurred_at:string; reference:string|null; note:string|null };
type Invoice = { id:string; invoice_status:string; invoice_no:string|null; total_amount:number; currency:string; invoice_type:string; created_at:string; reservation_id:string };
type Owner = { id:string; full_name:string; phone:string|null; email:string|null; iban:string|null; tax_number:string|null; is_active:boolean };
type Villa = { id:string; name:string; city:string|null; district:string|null };

const money=(v:number,c="TRY")=>new Intl.NumberFormat("tr-TR",{style:"currency",currency:c,maximumFractionDigits:0}).format(Number(v||0));
const today=()=>new Date().toISOString().slice(0,10);
const monthStart=()=>`${today().slice(0,7)}-01`;

const sectionLabels:Record<string,string>={
  overview:"Yönetim Merkezi",
  reservations:"Villa Rezervasyonları",
  housekeeping:"Housekeeping / Temizlik",
  maintenance:"Bakım & Arıza",
  finance:"Finans Dashboard",
  cash:"Kasa & Tahsilat",
  invoices:"Fatura Merkezi",
  expenses:"Gider Yönetimi",
  owners:"Villa Sahipleri",
  reports:"Rapor Merkezi",
};

const expenseCategories=[
  ["cleaning","Temizlik"],
  ["maintenance","Bakım / Onarım"],
  ["utilities","Elektrik / Su / İnternet"],
  ["supplies","Sarf & Malzeme"],
  ["commission","Komisyon"],
  ["tax","Vergi / Resmi Ödeme"],
  ["staff","Personel"],
  ["transport","Ulaşım / Transfer"],
  ["other","Diğer"],
];

const cashCategories=[
  ["reservation","Rezervasyon Tahsilatı"],
  ["deposit","Kapora / Depozito"],
  ["owner_payment","Villa Sahibi Ödemesi"],
  ["partner_payment","Partner Ödemesi"],
  ["expense","Gider Ödemesi"],
  ["refund","İade"],
  ["other","Diğer"],
];

function Field({label,children,hint}:{label:string;children:React.ReactNode;hint?:string}){
  return <label className="block">
    <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</span>
    {children}
    {hint&&<span className="mt-1 block text-[10px] leading-4 text-slate-600">{hint}</span>}
  </label>;
}

export default function VillaErpPage(){
  const params=useParams<{section?:string[]}>();
  const section=(params?.section?.[0]||"overview");
  const [membership,setMembership]=useState<CurrentMembership|null>(null);
  const [summary,setSummary]=useState<Summary|null>(null);
  const [reservations,setReservations]=useState<Reservation[]>([]);
  const [cleaning,setCleaning]=useState<Cleaning[]>([]);
  const [maintenance,setMaintenance]=useState<Maintenance[]>([]);
  const [expenses,setExpenses]=useState<Expense[]>([]);
  const [cash,setCash]=useState<CashMovement[]>([]);
  const [invoices,setInvoices]=useState<Invoice[]>([]);
  const [owners,setOwners]=useState<Owner[]>([]);
  const [villas,setVillas]=useState<Villa[]>([]);
  const [loading,setLoading]=useState(true); const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [message,setMessage]=useState("");
  const [dateRange,setDateRange]=useState({start:monthStart(),end:today()});
  const [cashForm,setCashForm]=useState({type:"in",amount:"",category:"reservation",reference:"",note:""});
  const [expenseForm,setExpenseForm]=useState({villaId:"",category:"other",description:"",amount:"",supplier:"",status:"unpaid"});
  const [maintenanceForm,setMaintenanceForm]=useState({villaId:"",title:"",description:"",priority:"normal",estimatedCost:"0"});
  const [ownerForm,setOwnerForm]=useState({fullName:"",phone:"",email:"",taxNumber:"",iban:""});

  const load=useCallback(async()=>{
    setLoading(true); setError("");
    try{
      const {data:{user}}=await supabase.auth.getUser(); if(!user) return;
      const current=await getCurrentMembership(user.id); if(!current) return; setMembership(current);
      const cid=current.company_id;
      const [s,r,c,m,e,cm,i,o,v]=await Promise.all([
        supabase.rpc("get_villa_erp_finance_summary",{p_company_id:cid,p_start:dateRange.start,p_end:dateRange.end}),
        supabase.from("villa_reservations").select("id,reservation_code,guest_name,check_in,check_out,grand_total,paid_total,balance,currency,status,sales_channel").eq("company_id",cid).order("check_in",{ascending:false}).limit(100),
        supabase.from("villa_cleaning_tasks").select("id,task_date,task_type,status,fee,note,villa_id").eq("company_id",cid).order("task_date",{ascending:false}).limit(100),
        supabase.from("villa_maintenance_tasks").select("id,title,priority,status,estimated_cost,actual_cost,due_at,villa_id,description").eq("company_id",cid).order("created_at",{ascending:false}).limit(100),
        supabase.from("villa_expenses").select("id,category,description,amount,currency,expense_date,payment_status,supplier_name,villa_id").eq("company_id",cid).order("expense_date",{ascending:false}).limit(100),
        supabase.from("villa_cash_movements").select("id,movement_type,category,amount,currency,occurred_at,reference,note").eq("company_id",cid).order("occurred_at",{ascending:false}).limit(100),
        supabase.from("villa_invoices").select("id,invoice_status,invoice_no,total_amount,currency,invoice_type,created_at,reservation_id").eq("company_id",cid).order("created_at",{ascending:false}).limit(100),
        supabase.from("villa_owners").select("id,full_name,phone,email,iban,tax_number,is_active").eq("company_id",cid).order("created_at",{ascending:false}).limit(100),
        supabase.from("villas").select("id,name,city,district").eq("company_id",cid).eq("is_active",true).order("name")
      ]);
      const err=[s,r,c,m,e,cm,i,o,v].find(x=>x.error)?.error; if(err) throw err;
      setSummary((s.data||null) as Summary|null); setReservations((r.data||[]) as Reservation[]); setCleaning((c.data||[]) as Cleaning[]); setMaintenance((m.data||[]) as Maintenance[]); setExpenses((e.data||[]) as Expense[]); setCash((cm.data||[]) as CashMovement[]); setInvoices((i.data||[]) as Invoice[]); setOwners((o.data||[]) as Owner[]); setVillas((v.data||[]) as Villa[]);
      const first=(v.data?.[0] as Villa|undefined)?.id||""; setExpenseForm(x=>({...x,villaId:x.villaId||first})); setMaintenanceForm(x=>({...x,villaId:x.villaId||first}));
    }catch(e){setError(e instanceof Error?e.message:"Villa ERP yüklenemedi.");}finally{setLoading(false);}
  },[dateRange.start,dateRange.end]);
  useEffect(()=>{void load();},[load]);

  const villaName=(id:string|null)=>villas.find(v=>v.id===id)?.name||"—";
  const cards=useMemo(()=>[
    ["Satış",summary?.sales||0],["Tahsilat",summary?.paid||0],["Bakiye",summary?.balance||0],["Gider",summary?.expenses||0],["Net Nakit",summary?.cash_net||0],["Net Sonuç",summary?.net||0]
  ],[summary]);

  async function addCash(e:FormEvent){e.preventDefault(); if(!membership||!cashForm.amount)return; setBusy(true);setError("");setMessage(""); const {error:er}=await supabase.rpc("record_villa_cash_movement",{p_company_id:membership.company_id,p_movement_type:cashForm.type,p_amount:Number(cashForm.amount),p_category:cashForm.category,p_account_id:null,p_villa_id:null,p_reservation_id:null,p_reference:cashForm.reference||null,p_note:cashForm.note||null}); if(er)setError(er.message);else{setMessage("Kasa hareketi kaydedildi.");setCashForm({type:"in",amount:"",category:"reservation",reference:"",note:""});await load();}setBusy(false);}
  async function addExpense(e:FormEvent){e.preventDefault(); if(!membership||!expenseForm.description||!expenseForm.amount)return; setBusy(true);setError(""); const {error:er}=await supabase.from("villa_expenses").insert({company_id:membership.company_id,villa_id:expenseForm.villaId||null,category:expenseForm.category,description:expenseForm.description,amount:Number(expenseForm.amount),supplier_name:expenseForm.supplier||null,payment_status:expenseForm.status}); if(er)setError(er.message);else{setMessage("Gider kaydedildi.");setExpenseForm(x=>({...x,description:"",amount:"",supplier:""}));await load();}setBusy(false);}
  async function addMaintenance(e:FormEvent){e.preventDefault(); if(!membership||!maintenanceForm.villaId||!maintenanceForm.title)return; setBusy(true);setError(""); const {error:er}=await supabase.from("villa_maintenance_tasks").insert({company_id:membership.company_id,villa_id:maintenanceForm.villaId,title:maintenanceForm.title,description:maintenanceForm.description||null,priority:maintenanceForm.priority,estimated_cost:Number(maintenanceForm.estimatedCost||0)}); if(er)setError(er.message);else{setMessage("Bakım kaydı açıldı.");setMaintenanceForm(x=>({...x,title:"",description:"",estimatedCost:"0"}));await load();}setBusy(false);}
  async function addOwner(e:FormEvent){e.preventDefault(); if(!membership||!ownerForm.fullName)return; setBusy(true);setError(""); const {error:er}=await supabase.from("villa_owners").insert({company_id:membership.company_id,full_name:ownerForm.fullName,phone:ownerForm.phone||null,email:ownerForm.email||null,tax_number:ownerForm.taxNumber||null,iban:ownerForm.iban||null}); if(er)setError(er.message);else{setMessage("Villa sahibi kaydedildi.");setOwnerForm({fullName:"",phone:"",email:"",taxNumber:"",iban:""});await load();}setBusy(false);}

  const table=(headers:string[],rows:React.ReactNode[][])=><div className="overflow-x-auto rounded-2xl border border-white/[.07]"><table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-white/[.04] text-xs uppercase text-slate-500"><tr>{headers.map(h=><th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody>{rows.map((r,idx)=><tr key={idx} className="border-t border-white/[.05]">{r.map((x,i)=><td key={i} className="px-4 py-3">{x}</td>)}</tr>)}</tbody></table></div>;
  const input="rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-sm outline-none focus:border-violet-400/50";

  if(loading)return <main className="flex min-h-[60vh] items-center justify-center text-slate-400">Villa ERP hazırlanıyor…</main>;

  return <main className="min-h-screen bg-[#06101b] p-5 text-white lg:p-7">
    <div className="mx-auto max-w-[1700px]">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[.28em] text-violet-300">TUROBUS VILLA ERP</div><h1 className="mt-2 text-3xl font-black">{sectionLabels[section]||"Villa Yönetim Merkezi"}</h1><p className="mt-2 text-sm text-slate-500">Villa operasyonu ve finans yönetimi. Bölümler soldaki ana menüden açılır.</p></div><Link href="/dashboard/villa-os/control-center" className="rounded-xl border border-white/10 px-4 py-3 text-xs font-black text-slate-300">Villa Operasyonuna Dön</Link></div>

      {error&&<div className="mt-4 rounded-xl bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}{message&&<div className="mt-4 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-300">{message}</div>}

      {(section==="overview"||section==="finance"||section==="reports")&&<>
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <Field label="Başlangıç Tarihi"><input type="date" value={dateRange.start} onChange={e=>setDateRange(x=>({...x,start:e.target.value}))} className={input}/></Field>
          <Field label="Bitiş Tarihi"><input type="date" value={dateRange.end} onChange={e=>setDateRange(x=>({...x,end:e.target.value}))} className={input}/></Field>
          <button onClick={()=>void load()} className="h-[46px] rounded-xl bg-white/10 px-5 text-xs font-black">Raporu Yenile</button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{cards.map(([label,value])=><div key={String(label)} className="rounded-2xl border border-white/[.07] bg-[#091724] p-5"><div className="text-[10px] font-black uppercase text-slate-500">{label}</div><div className="mt-2 text-2xl font-black">{money(Number(value))}</div></div>)}</div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">{[["Rezervasyon",summary?.reservations||0],["Açık Temizlik",summary?.open_cleaning||0],["Açık Bakım",summary?.open_maintenance||0],["Bekleyen Fatura",summary?.pending_invoices||0]].map(([l,v])=><div key={String(l)} className="rounded-2xl border border-white/[.07] bg-[#091724] p-5"><div className="text-xs text-slate-500">{l}</div><div className="mt-2 text-3xl font-black">{v}</div></div>)}</div>
      </>}

      {section==="reservations"&&<div className="mt-6">{table(["Kod","Misafir","Giriş","Çıkış","Kanal","Toplam","Ödenen","Bakiye","Durum"],reservations.map(r=>[r.reservation_code,r.guest_name,r.check_in,r.check_out,r.sales_channel,money(r.grand_total,r.currency),money(r.paid_total,r.currency),money(r.balance,r.currency),r.status]))}</div>}

      {section==="housekeeping"&&<div className="mt-6">{table(["Tarih","Villa","Tip","Durum","Ücret","Not"],cleaning.map(x=>[x.task_date,villaName(x.villa_id),x.task_type,x.status,money(x.fee),x.note||"—"]))}</div>}

      {section==="maintenance"&&<div className="mt-6 grid gap-5 xl:grid-cols-[400px_1fr]"><form onSubmit={addMaintenance} className="space-y-4 rounded-2xl border border-white/[.07] bg-[#091724] p-5"><h2 className="font-black">Yeni Bakım / Arıza Kaydı</h2><Field label="Villa"><select className={`${input} w-full`} value={maintenanceForm.villaId} onChange={e=>setMaintenanceForm(x=>({...x,villaId:e.target.value}))}>{villas.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></Field><Field label="Arıza / İş Başlığı"><input className={`${input} w-full`} placeholder="Örn. Klima soğutmuyor" value={maintenanceForm.title} onChange={e=>setMaintenanceForm(x=>({...x,title:e.target.value}))}/></Field><Field label="Açıklama"><textarea className={`${input} min-h-24 w-full`} placeholder="Yapılacak işi veya arızayı açıklayın" value={maintenanceForm.description} onChange={e=>setMaintenanceForm(x=>({...x,description:e.target.value}))}/></Field><Field label="Öncelik"><select className={`${input} w-full`} value={maintenanceForm.priority} onChange={e=>setMaintenanceForm(x=>({...x,priority:e.target.value}))}><option value="normal">Normal</option><option value="high">Yüksek</option><option value="critical">Kritik</option></select></Field><Field label="Tahmini Maliyet (TL)"><input className={`${input} w-full`} type="number" placeholder="0" value={maintenanceForm.estimatedCost} onChange={e=>setMaintenanceForm(x=>({...x,estimatedCost:e.target.value}))}/></Field><button disabled={busy} className="w-full rounded-xl bg-violet-400 py-3 font-black text-slate-950">Bakım Kaydı Aç</button></form><div>{table(["Villa","Başlık","Öncelik","Durum","Tahmini","Gerçek","Termin"],maintenance.map(x=>[villaName(x.villa_id),x.title,x.priority,x.status,money(x.estimated_cost),money(x.actual_cost),x.due_at?new Date(x.due_at).toLocaleString("tr-TR"):"—"]))}</div></div>}

      {section==="cash"&&<div className="mt-6 grid gap-5 xl:grid-cols-[400px_1fr]"><form onSubmit={addCash} className="space-y-4 rounded-2xl border border-white/[.07] bg-[#091724] p-5"><h2 className="font-black">Yeni Kasa Hareketi</h2><Field label="İşlem Türü"><select className={`${input} w-full`} value={cashForm.type} onChange={e=>setCashForm(x=>({...x,type:e.target.value}))}><option value="in">Kasa Girişi / Tahsilat</option><option value="out">Kasa Çıkışı / Ödeme</option></select></Field><Field label="Tutar (TL)"><input className={`${input} w-full`} type="number" placeholder="Örn. 15000" value={cashForm.amount} onChange={e=>setCashForm(x=>({...x,amount:e.target.value}))}/></Field><Field label="İşlem Kategorisi"><select className={`${input} w-full`} value={cashForm.category} onChange={e=>setCashForm(x=>({...x,category:e.target.value}))}>{cashCategories.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field><Field label="Referans / Belge No" hint="Dekont, rezervasyon kodu veya belge numarası varsa yazın."><input className={`${input} w-full`} placeholder="Örn. V-12345 / Dekont 4582" value={cashForm.reference} onChange={e=>setCashForm(x=>({...x,reference:e.target.value}))}/></Field><Field label="Açıklama / Not"><textarea className={`${input} min-h-24 w-full`} placeholder="İşlemle ilgili not" value={cashForm.note} onChange={e=>setCashForm(x=>({...x,note:e.target.value}))}/></Field><button disabled={busy} className="w-full rounded-xl bg-violet-400 py-3 font-black text-slate-950">Kasa Hareketini Kaydet</button></form><div>{table(["Tarih","Tip","Kategori","Tutar","Referans","Not"],cash.map(x=>[new Date(x.occurred_at).toLocaleString("tr-TR"),x.movement_type==="in"?"Giriş":"Çıkış",x.category,money(x.amount,x.currency),x.reference||"—",x.note||"—"]))}</div></div>}

      {section==="expenses"&&<div className="mt-6 grid gap-5 xl:grid-cols-[400px_1fr]"><form onSubmit={addExpense} className="space-y-4 rounded-2xl border border-white/[.07] bg-[#091724] p-5"><h2 className="font-black">Yeni Gider</h2><Field label="Giderin Ait Olduğu Villa"><select className={`${input} w-full`} value={expenseForm.villaId} onChange={e=>setExpenseForm(x=>({...x,villaId:e.target.value}))}><option value="">Genel Şirket Gideri</option>{villas.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></Field><Field label="Gider Kategorisi"><select className={`${input} w-full`} value={expenseForm.category} onChange={e=>setExpenseForm(x=>({...x,category:e.target.value}))}>{expenseCategories.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field><Field label="Gider Açıklaması"><input className={`${input} w-full`} placeholder="Örn. Havuz pompası değişimi" value={expenseForm.description} onChange={e=>setExpenseForm(x=>({...x,description:e.target.value}))}/></Field><Field label="Tutar (TL)"><input className={`${input} w-full`} type="number" placeholder="Örn. 2500" value={expenseForm.amount} onChange={e=>setExpenseForm(x=>({...x,amount:e.target.value}))}/></Field><Field label="Tedarikçi / Ödeme Yapılan Firma"><input className={`${input} w-full`} placeholder="Örn. ABC Teknik Servis" value={expenseForm.supplier} onChange={e=>setExpenseForm(x=>({...x,supplier:e.target.value}))}/></Field><Field label="Ödeme Durumu"><select className={`${input} w-full`} value={expenseForm.status} onChange={e=>setExpenseForm(x=>({...x,status:e.target.value}))}><option value="unpaid">Henüz Ödenmedi</option><option value="paid">Ödendi</option></select></Field><button disabled={busy} className="w-full rounded-xl bg-violet-400 py-3 font-black text-slate-950">Gideri Kaydet</button></form><div>{table(["Tarih","Villa","Kategori","Açıklama","Tutar","Tedarikçi","Durum"],expenses.map(x=>[x.expense_date,villaName(x.villa_id),x.category,x.description,money(x.amount,x.currency),x.supplier_name||"—",x.payment_status]))}</div></div>}

      {section==="invoices"&&<div className="mt-6">{table(["Tarih","Fatura No","Tip","Toplam","Durum","Rezervasyon"],invoices.map(x=>[new Date(x.created_at).toLocaleDateString("tr-TR"),x.invoice_no||"Henüz yok",x.invoice_type,money(x.total_amount,x.currency),x.invoice_status,x.reservation_id]))}</div>}

      {section==="owners"&&<div className="mt-6 grid gap-5 xl:grid-cols-[400px_1fr]"><form onSubmit={addOwner} className="space-y-4 rounded-2xl border border-white/[.07] bg-[#091724] p-5"><h2 className="font-black">Villa Sahibi Ekle</h2><Field label="Ad Soyad / Firma Ünvanı"><input className={`${input} w-full`} placeholder="Örn. Ahmet Yılmaz" value={ownerForm.fullName} onChange={e=>setOwnerForm(x=>({...x,fullName:e.target.value}))}/></Field><Field label="Telefon Numarası"><input className={`${input} w-full`} placeholder="Örn. 0532 000 00 00" value={ownerForm.phone} onChange={e=>setOwnerForm(x=>({...x,phone:e.target.value}))}/></Field><Field label="E-posta Adresi"><input className={`${input} w-full`} type="email" placeholder="ornek@firma.com" value={ownerForm.email} onChange={e=>setOwnerForm(x=>({...x,email:e.target.value}))}/></Field><Field label="Vergi No / T.C. Kimlik No"><input className={`${input} w-full`} placeholder="Vergi veya T.C. kimlik numarası" value={ownerForm.taxNumber} onChange={e=>setOwnerForm(x=>({...x,taxNumber:e.target.value}))}/></Field><Field label="IBAN"><input className={`${input} w-full`} placeholder="TR00 0000 0000 0000 0000 0000 00" value={ownerForm.iban} onChange={e=>setOwnerForm(x=>({...x,iban:e.target.value}))}/></Field><button disabled={busy} className="w-full rounded-xl bg-violet-400 py-3 font-black text-slate-950">Villa Sahibini Kaydet</button></form><div>{table(["Ad / Ünvan","Telefon","E-posta","Vergi/TC","IBAN","Durum"],owners.map(x=>[x.full_name,x.phone||"—",x.email||"—",x.tax_number||"—",x.iban||"—",x.is_active?"Aktif":"Pasif"]))}</div></div>}

      {section==="reports"&&<div className="mt-6 grid gap-4 lg:grid-cols-3"><div className="rounded-2xl border border-white/[.07] bg-[#091724] p-6"><div className="text-xs text-slate-500">Tahsilat Oranı</div><div className="mt-2 text-4xl font-black">{summary&&summary.sales>0?Math.round(summary.paid/summary.sales*100):0}%</div></div><div className="rounded-2xl border border-white/[.07] bg-[#091724] p-6"><div className="text-xs text-slate-500">Gider / Tahsilat</div><div className="mt-2 text-4xl font-black">{summary&&summary.paid>0?Math.round(summary.expenses/summary.paid*100):0}%</div></div><div className="rounded-2xl border border-white/[.07] bg-[#091724] p-6"><div className="text-xs text-slate-500">Açık Operasyon</div><div className="mt-2 text-4xl font-black">{(summary?.open_cleaning||0)+(summary?.open_maintenance||0)}</div></div></div>}
    </div>
  </main>;
}
