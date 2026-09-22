import os

path = r"d:\caltrack main\CalTrack\frontend\src\ui\pages\BookingPage.jsx"
with open(path, "rb") as f:
    raw = f.read()

# Normalize line endings to LF for replacement
content = raw.replace(b"\r\n", b"\n")

# 1. Update tools filtering and rendering
target_tools = b"""              {/* Tools & Products We Use */}
              {(() => {
                const id = selectedServiceDetails.id;
                const detail = SERVICE_DETAIL_DATA[id] || {};
                const tools = (Array.isArray(selectedServiceDetails.tools) && selectedServiceDetails.tools.length > 0)
                  ? selectedServiceDetails.tools
                  : (detail.tools || []);
                if (tools.length === 0) return null;
                return (
                  <div className="space-y-2.5 border-t border-slate-100 pt-5 text-left">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Tools & Products We Use</h4>
                    <div className="space-y-2">
                      {tools.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}"""

replacement_tools = b"""              {/* Tools & Products We Use */}
              {(() => {
                const id = selectedServiceDetails.id;
                const detail = SERVICE_DETAIL_DATA[id] || {};
                const tools = ((Array.isArray(selectedServiceDetails.tools) && selectedServiceDetails.tools.length > 0)
                  ? selectedServiceDetails.tools
                  : (detail.tools || []))
                  .filter(t => typeof t === "string" ? true : (t?.enabled !== false))
                  .map(t => typeof t === "string" ? t : (t.text || ""));
                if (tools.length === 0) return null;
                return (
                  <div className="space-y-2.5 border-t border-slate-100 pt-5 text-left">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Tools & Products We Use</h4>
                    <div className="space-y-2">
                      {tools.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}"""

# 2. Update readyList filtering and rendering
target_ready = b"""              {/* What You Need to Keep Ready */}
              {(() => {
                const id = selectedServiceDetails.id;
                const detail = SERVICE_DETAIL_DATA[id] || {};
                const readyList = (Array.isArray(selectedServiceDetails.ready) && selectedServiceDetails.ready.length > 0)
                  ? selectedServiceDetails.ready
                  : (detail.ready || []);
                if (readyList.length === 0) return null;
                return (
                  <div className="space-y-2.5 border-t border-slate-100 pt-5 text-left">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">What You Need to Keep Ready</h4>
                    <div className="space-y-2">
                      {readyList.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}"""

replacement_ready = b"""              {/* What You Need to Keep Ready */}
              {(() => {
                const id = selectedServiceDetails.id;
                const detail = SERVICE_DETAIL_DATA[id] || {};
                const readyList = ((Array.isArray(selectedServiceDetails.ready) && selectedServiceDetails.ready.length > 0)
                  ? selectedServiceDetails.ready
                  : (detail.ready || []))
                  .filter(r => typeof r === "string" ? true : (r?.enabled !== false))
                  .map(r => typeof r === "string" ? r : (r.text || ""));
                if (readyList.length === 0) return null;
                return (
                  <div className="space-y-2.5 border-t border-slate-100 pt-5 text-left">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">What You Need to Keep Ready</h4>
                    <div className="space-y-2">
                      {readyList.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}"""

# 3. Update reviews filtering
target_reviews = b"""                const reviews = (Array.isArray(selectedServiceDetails.reviews) && selectedServiceDetails.reviews.length > 0)
                  ? selectedServiceDetails.reviews
                  : (detail.reviews || []);"""

replacement_reviews = b"""                const reviews = ((Array.isArray(selectedServiceDetails.reviews) && selectedServiceDetails.reviews.length > 0)
                  ? selectedServiceDetails.reviews
                  : (detail.reviews || []))
                  .filter(r => r.enabled !== false);"""

# 4. Update faqs filtering
target_faqs = b"""                    const faqs = (Array.isArray(selectedServiceDetails.faqs) && selectedServiceDetails.faqs.length > 0)
                      ? selectedServiceDetails.faqs
                      : (detail.faqs || []);"""

replacement_faqs = b"""                    const faqs = ((Array.isArray(selectedServiceDetails.faqs) && selectedServiceDetails.faqs.length > 0)
                      ? selectedServiceDetails.faqs
                      : (detail.faqs || []))
                      .filter(f => f.enabled !== false);"""

# Normalize targets
t_tools = target_tools.replace(b"\r\n", b"\n")
r_tools = replacement_tools.replace(b"\r\n", b"\n")
t_ready = target_ready.replace(b"\r\n", b"\n")
r_ready = replacement_ready.replace(b"\r\n", b"\n")
t_rev = target_reviews.replace(b"\r\n", b"\n")
r_rev = replacement_reviews.replace(b"\r\n", b"\n")
t_faq = target_faqs.replace(b"\r\n", b"\n")
r_faq = replacement_faqs.replace(b"\r\n", b"\n")

if t_tools in content:
    content = content.replace(t_tools, r_tools)
    print("Tools matched and replaced!")
else:
    print("Tools match not found.")

if t_ready in content:
    content = content.replace(t_ready, r_ready)
    print("Ready matched and replaced!")
else:
    print("Ready match not found.")

if t_rev in content:
    content = content.replace(t_rev, r_rev)
    print("Reviews matched and replaced!")
else:
    print("Reviews match not found.")

if t_faq in content:
    content = content.replace(t_faq, r_faq)
    print("FAQs matched and replaced!")
else:
    print("FAQs match not found.")

# Save back with standard CRLFs
final_raw = content.replace(b"\n", b"\r\n")
with open(path, "wb") as f:
    f.write(final_raw)
