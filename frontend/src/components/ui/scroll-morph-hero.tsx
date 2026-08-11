import React from "react";
import { motion } from "framer-motion";
import { Shield, Users, Clock, Map } from "lucide-react";

export default function IntroAnimation() {
    return (
        <div className="w-full h-full min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col justify-between p-12 relative overflow-hidden font-sans select-none">
            {/* Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

            {/* Glowing background blobs */}
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />

            {/* Top header */}
            <div className="relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center text-lg shadow-lg shadow-indigo-600/30">C</div>
                  <span className="text-xl font-extrabold tracking-tight text-white font-display">CalServices Admin</span>
                </div>
            </div>

            {/* Center mockup card with 3D perspective */}
            <div className="relative z-10 flex-1 flex items-center justify-center py-8">
                <motion.div 
                    initial={{ opacity: 0, y: 30, rotateX: 12, rotateY: -15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, rotateX: 8, rotateY: -10, scale: 1 }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{ transformStyle: "preserve-3d", perspective: 1000 }}
                    className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl shadow-slate-950/50 relative group"
                >
                    {/* Perspective shadow */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-3xl blur opacity-30 group-hover:opacity-45 transition duration-1000 group-hover:duration-200 z-0" />
                    
                    <div className="relative z-10 space-y-6">
                        {/* Title & badge */}
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                            <div>
                                <h3 className="text-sm font-black text-slate-100 font-display">Workforce Overview</h3>
                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Real-time Dashboard Metrics</p>
                            </div>
                            <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full uppercase tracking-wider">
                                Live
                            </span>
                        </div>

                        {/* Chart bar rows */}
                        <div className="space-y-3.5">
                            {[
                                { label: "Operations Efficiency", value: "94.2%", width: "94.2%", color: "from-indigo-500 to-indigo-600" },
                                { label: "Schedule Adherence", value: "88.7%", width: "88.7%", color: "from-blue-500 to-blue-600" },
                                { label: "Labor Compliance Rate", value: "100%", width: "100%", color: "from-emerald-500 to-emerald-600" },
                            ].map((row, i) => (
                                <div key={i} className="space-y-1.5">
                                    <div className="flex justify-between text-[11px] font-bold text-slate-300">
                                        <span>{row.label}</span>
                                        <span className="font-mono text-white">{row.value}</span>
                                    </div>
                                    <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden p-0.5 border border-slate-800">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: row.width }}
                                            transition={{ duration: 1.5, delay: 0.2 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                                            className={`h-full bg-gradient-to-r ${row.color} rounded-full`}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Mini statistics grid */}
                        <div className="grid grid-cols-3 gap-3 border-t border-slate-800/80 pt-5">
                            {[
                                { value: "3.4k", label: "Active Jobs" },
                                { value: "98.2%", label: "Satisfaction" },
                                { value: "12m", label: "Avg Dispatch" }
                            ].map((stat, i) => (
                                <div key={i} className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-2.5 text-center">
                                    <div className="text-xs font-mono font-black text-white">{stat.value}</div>
                                    <div className="text-[8px] font-bold text-slate-500 uppercase mt-0.5 tracking-wider">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Bottom info section */}
            <div className="relative z-10 grid grid-cols-2 gap-6 max-w-lg">
                {[
                    { icon: <Map className="text-indigo-400" size={16} />, title: "Dispatch Tracking", desc: "Interactive mapping & geofence rules." },
                    { icon: <Clock className="text-indigo-400" size={16} />, title: "Time Intelligence", desc: "Selfie check-ins & automated timesheets." },
                    { icon: <Users className="text-indigo-400" size={16} />, title: "Staff Scheduling", desc: "Drag-and-drop shift planning calendars." },
                    { icon: <Shield className="text-indigo-400" size={16} />, title: "Enterprise Compliance", desc: "Audit trails & multi-tier permissions." }
                ].map((item, i) => (
                    <div key={i} className="flex gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                            {item.icon}
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-slate-200 font-display">{item.title}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed font-semibold">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
