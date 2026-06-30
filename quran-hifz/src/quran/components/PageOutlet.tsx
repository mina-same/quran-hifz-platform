import { usePortal } from "../context/PortalContext";
import { PAGE_REGISTRY } from "../router/pageRegistry";

export function PageOutlet() {
  const { portal, page } = usePortal();
  if (!portal) return null;
  const Page = PAGE_REGISTRY[portal][page];
  if (!Page) {
    return (
      <div className="card">
        <p style={{ color: "var(--text2)", textAlign: "center", padding: 40 }}>الصفحة قيد الإنشاء</p>
      </div>
    );
  }
  return <Page />;
}
