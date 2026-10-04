import Link from "next/link";
import { Flower2 } from "lucide-react";

export function Brand({ light = false }: { light?: boolean }) { return <Link href="/" className="inline-flex items-center gap-3 no-underline"><span className={`grid h-11 w-11 place-items-center rounded-[15px] ${light ? "bg-white/15 text-white" : "bg-[#286a5d] text-white"}`}><Flower2 size={23} strokeWidth={1.7} /></span><span className={`text-sm font-extrabold leading-[1.15] tracking-[-.02em] ${light ? "text-white" : "text-[#214a41]"}`}>Twój Pomocnik<br />w Terapii</span></Link>; }
