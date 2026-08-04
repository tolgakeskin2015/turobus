import {
    FaHotel,
    FaBed,
    FaCalendarCheck,
    FaMoneyBillWave,
    FaUsers,
    FaDoorOpen
} from "react-icons/fa";

const cards = [
    {
        title:"Otel",
        value:"12",
        icon:FaHotel,
        color:"from-orange-500 to-red-500"
    },
    {
        title:"Toplam Oda",
        value:"348",
        icon:FaBed,
        color:"from-cyan-500 to-blue-600"
    },
    {
        title:"Bugünkü Check-in",
        value:"24",
        icon:FaCalendarCheck,
        color:"from-emerald-500 to-green-600"
    },
    {
        title:"Boş Oda",
        value:"43",
        icon:FaDoorOpen,
        color:"from-violet-500 to-purple-600"
    },
    {
        title:"Doluluk",
        value:"82%",
        icon:FaUsers,
        color:"from-pink-500 to-fuchsia-600"
    },
    {
        title:"Bugünkü Ciro",
        value:"₺428.000",
        icon:FaMoneyBillWave,
        color:"from-yellow-500 to-orange-500"
    }
];

export default function HotelStats(){

return(

<div className="grid xl:grid-cols-6 lg:grid-cols-3 md:grid-cols-2 gap-5">

{cards.map((card)=>{

const Icon=card.icon;

return(

<div
key={card.title}
className="rounded-3xl p-6 bg-slate-900 border border-slate-800">

<div className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${card.color} flex items-center justify-center`}>

<Icon className="text-white text-2xl"/>

</div>

<p className="mt-5 text-slate-400">

{card.title}

</p>

<h2 className="text-3xl font-black mt-2">

{card.value}

</h2>

</div>

)

})}

</div>

)

}
