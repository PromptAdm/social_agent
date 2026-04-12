import Link from 'next/link'
import { Plus, FileText, Lightbulb, MoreHorizontal } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { mockBrands } from '@/lib/mock/data'

function BrandInitial({ name }: { name: string }) {
  return (
    <div className="w-12 h-12 rounded-xl bg-indigo-600/15 border border-indigo-500/25 flex items-center justify-center flex-shrink-0">
      <span className="text-lg font-bold text-indigo-400">{name.charAt(0)}</span>
    </div>
  )
}

export default function BrandsPage() {
  return (
    <div className="p-8 max-w-[1200px]">
      <PageHeader
        title="Marcas"
        subtitle="Gerencie suas marcas e estratégias de conteúdo."
        className="mb-8"
      >
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nova Marca
        </button>
      </PageHeader>

      <div className="grid grid-cols-3 gap-4">
        {mockBrands.map((brand) => (
          <div
            key={brand.id}
            className="card p-6 flex flex-col gap-4 hover:border-[#3F3F56] transition-colors"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <BrandInitial name={brand.name} />
                <div>
                  <h3 className="text-[15px] font-semibold text-slate-100">{brand.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{brand.niche}</p>
                </div>
              </div>
              <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#17171F] text-slate-500 hover:text-slate-400 transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            {brand.description && (
              <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                {brand.description}
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 pt-1 border-t border-[#1E1E2A]">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <FileText className="w-3.5 h-3.5" />
                <span>{brand.post_count ?? 0} posts</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{brand.idea_count ?? 0} ideias</span>
              </div>
            </div>

            {/* Action */}
            <Link
              href={`/brands/${brand.id}/strategy`}
              className="btn-secondary text-center text-sm"
            >
              Abrir
            </Link>
          </div>
        ))}

        {/* Add new brand card */}
        <button className="border border-dashed border-[#27273A] rounded-lg p-6 flex flex-col items-center justify-center gap-3 hover:border-indigo-500/40 hover:bg-indigo-600/5 transition-colors group cursor-pointer min-h-[220px]">
          <div className="w-10 h-10 rounded-full border border-dashed border-[#3F3F56] group-hover:border-indigo-500/40 flex items-center justify-center transition-colors">
            <Plus className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-500 group-hover:text-slate-400 transition-colors">
              Adicionar marca
            </p>
            <p className="text-xs text-slate-600 mt-0.5">Comece uma nova estratégia</p>
          </div>
        </button>
      </div>
    </div>
  )
}
