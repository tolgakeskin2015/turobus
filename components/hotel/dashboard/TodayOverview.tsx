import {
    FaArrowUp,
    FaArrowDown,
    FaClock,
    FaUserCheck,
    FaUserTimes,
    FaCalendarAlt
} from "react-icons/fa";

const items=[
{
title:"Bugünkü Check-in",
value:"24",
icon:FaUserCheck,
color:"text-emerald-400"
},
{
title:"Bugünkü Check-out",
value:"18",
icon:FaUserTimes,
color:"text-red-400"
},
{
title:"Bekleyen Rezervasyon",
value:"12",
icon:FaClock,
color:"text-yellow-400"
},
{
title:"Yeni Rezervasyon",
value:"+8",
icon:FaArrowUp,
color:"text-cyan-400"
},
{
title:"İptaller",
value:"2",
icon:FaArrowDown,
color:"text-orange-400"
},
{
title:"Bugünkü Tarih",
value:new Date().toLocaleDateString("tr-TR"),
icon:FaCalendarAlt,
color:"text-violet-400"
}
];

export default function TodayOverview(){

return(

<div className="grid xl:grid-cols-3 gap-5">

{items.map(item=>{

const Icon=item.icon;

return(

<div
key={item.title}
className="rounded-3xl bg-slate-900 border border-slate-800 p-6">

<div className="flex items-center justify-between">

<div>

<p className="text-slate-400">

{item.title}

</p>

<h2 className="text-3xl font-black mt-2">

{item.value}

</h2>

</div>

<Icon className={`${item.color} text-3xl`} />

</div>

</div>

)

})}

</div>

)

}
