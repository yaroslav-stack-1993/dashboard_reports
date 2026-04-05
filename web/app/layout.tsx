import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Отчёты Яндекс Директ",
  description: "Дашборд статистики по клиентам агентства",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-[#F5F6F8] font-sans">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="10" width="4" height="6" rx="1" fill="white" />
                <rect x="7" y="6" width="4" height="10" rx="1" fill="white" />
                <rect x="12" y="2" width="4" height="14" rx="1" fill="white" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-gray-900">Директ Аналитика</span>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  )
}
