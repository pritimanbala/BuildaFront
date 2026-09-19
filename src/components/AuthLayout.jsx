export default function AuthLayout({ children }) {
  return <main className="page"><section className="form-panel">{children}</section><aside className="art-panel" aria-hidden="true" /></main>
}
